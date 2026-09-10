import { access, readFile, writeFile } from "node:fs/promises";
import { platform, arch } from "node:os";
import { resolve } from "node:path";

import { close, completion, loadModel, unloadModel } from "@qvac/sdk";

type Message = { role: "system" | "user" | "assistant"; content: string };
type Example = { messages: Message[] };
type ModelConfig = {
  models: {
    extraction: {
      path: string;
      optional_lora_path: string;
      quantization: string;
    };
  };
};

const root = resolve(import.meta.dirname, "..");
const testPath = resolve(root, "data/finetuning/test.jsonl");
const schemaPath = resolve(
  root,
  "schemas/installed-base-observation.schema.json",
);
const configPath = resolve(root, "config/models.json");
const reportPath = resolve(root, "training/output/evaluation.json");
const limitArgument = process.argv.find((value) =>
  value.startsWith("--limit="),
);
const limit = limitArgument ? Number(limitArgument.split("=")[1]) : 36;

function compare(expected: unknown, actual: unknown): [number, number] {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [0, Math.max(1, expected.length)];
    let correct = expected.length === actual.length ? 1 : 0;
    let total = 1;
    for (let index = 0; index < expected.length; index += 1) {
      const [nestedCorrect, nestedTotal] = compare(
        expected[index],
        actual[index],
      );
      correct += nestedCorrect;
      total += nestedTotal;
    }
    return [correct, total];
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object") {
      return [0, Object.keys(expected).length || 1];
    }
    let correct = 0;
    let total = 0;
    for (const [key, value] of Object.entries(expected)) {
      if (key === "next_question") {
        correct +=
          Boolean(value) === Boolean((actual as Record<string, unknown>)[key])
            ? 1
            : 0;
        total += 1;
        continue;
      }
      const [nestedCorrect, nestedTotal] = compare(
        value,
        (actual as Record<string, unknown>)[key],
      );
      correct += nestedCorrect;
      total += nestedTotal;
    }
    return [correct, total];
  }
  return [Object.is(expected, actual) ? 1 : 0, 1];
}

const config = JSON.parse(await readFile(configPath, "utf8")) as ModelConfig;
const schema = JSON.parse(await readFile(schemaPath, "utf8")) as Record<
  string,
  unknown
>;
const spec = config.models.extraction;
const modelPath = resolve(root, spec.path);
const adapterPath = resolve(root, spec.optional_lora_path);
await access(modelPath);
await access(adapterPath);

const examples = (await readFile(testPath, "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(0, limit)
  .map((line) => JSON.parse(line) as Example);

let modelId: string | undefined;
let correctFields = 0;
let totalFields = 0;
let validResponses = 0;
const cases: Array<Record<string, unknown>> = [];
const started = performance.now();

try {
  modelId = await loadModel({
    modelSrc: modelPath,
    modelType: "llamacpp-completion",
    modelConfig: { ctx_size: 4096, lora: adapterPath },
  });
  for (let index = 0; index < examples.length; index += 1) {
    const example = examples[index];
    const system = example.messages.find(
      (message) => message.role === "system",
    );
    const user = example.messages.find((message) => message.role === "user");
    const answer = example.messages.find(
      (message) => message.role === "assistant",
    );
    if (!system || !user || !answer)
      throw new Error(`Invalid test case ${index}`);
    const run = completion({
      modelId,
      history: [system, user],
      stream: true,
      captureThinking: true,
      generationParams: {
        temp: 0,
        top_p: 0.9,
        predict: 500,
        seed: 42,
        reasoning_budget: 0,
        remove_thinking_from_context: true,
      },
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "installed_base_observation",
          schema,
          strict: true,
        },
      },
    });
    const final = await run.final;
    const raw = final.contentText.trim() || final.raw.fullText.trim();
    let actual: unknown;
    let error: string | null = null;
    try {
      actual = JSON.parse(raw);
      validResponses += 1;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    const expected = JSON.parse(answer.content) as unknown;
    const [correct, total] = compare(expected, actual);
    correctFields += correct;
    totalFields += total;
    cases.push({
      index,
      valid_json: error === null,
      field_accuracy: total ? correct / total : 0,
      prompt_tokens: final.stats?.promptTokens ?? 0,
      output_tokens: final.stats?.generatedTokens ?? 0,
      ttft_ms: final.stats?.timeToFirstToken ?? 0,
      tokens_per_second: final.stats?.tokensPerSecond ?? 0,
      error,
    });
    console.log(
      `case=${index + 1}/${examples.length} accuracy=${((correct / total) * 100).toFixed(1)}%`,
    );
  }
} finally {
  if (modelId) await unloadModel({ modelId, clearStorage: false });
  await close();
}

const report = {
  evaluated_at: new Date().toISOString(),
  hardware: `${platform()}-${arch()}`,
  model: spec.path,
  adapter: spec.optional_lora_path,
  quantization: spec.quantization,
  held_out_examples: examples.length,
  valid_json_rate: examples.length ? validResponses / examples.length : 0,
  field_accuracy: totalFields ? correctFields / totalFields : 0,
  total_ms: performance.now() - started,
  cases,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
