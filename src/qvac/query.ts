import { readFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { resolve } from "node:path";

import { completion, loadModel, unloadModel } from "@qvac/sdk";

import { writePerformanceRecord } from "./metrics.js";
import { normalizeInventoryFilters } from "./query-normalize.js";
import type { PerformanceRecord } from "./types.js";

const root = resolve(import.meta.dirname, "../..");
const modelPath = resolve(root, "models/language/qwen3-0.6b-q4_0.gguf");
const schema = JSON.parse(
  await readFile(resolve(root, "schemas/inventory-query.schema.json"), "utf8"),
) as Record<string, unknown>;

export async function parseInventoryQuestion(question: string): Promise<object> {
  const prompt = `/no_think\nConvert this request into inventory filters. Never produce SQL.\n${question}`;
  const metric: PerformanceRecord = {
    timestamp: new Date().toISOString(),
    hardware: `${platform()}-${arch()}`,
    model: "models/language/qwen3-0.6b-q4_0.gguf",
    quantization: "Q4_0",
    task: "inventory-query-parsing",
    prompt,
    input_tokens: 0,
    output_tokens: 0,
    model_load_ms: 0,
    ttft_ms: 0,
    total_inference_ms: 0,
    tokens_per_second: 0,
    success: false,
    error: null,
  };
  let modelId: string | undefined;
  const loadStarted = performance.now();
  try {
    modelId = await loadModel({
      modelSrc: modelPath,
      modelType: "llamacpp-completion",
      modelConfig: { ctx_size: 2048 },
    });
    metric.model_load_ms = performance.now() - loadStarted;
    const inferenceStarted = performance.now();
    const run = completion({
      modelId,
      history: [{ role: "user", content: prompt }],
      stream: true,
      captureThinking: true,
      generationParams: {
        temp: 0,
        predict: 300,
        seed: 42,
        reasoning_budget: 0,
        remove_thinking_from_context: true,
      },
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "inventory_filters", schema, strict: true },
      },
    });
    const final = await run.final;
    metric.total_inference_ms = performance.now() - inferenceStarted;
    metric.input_tokens = final.stats?.promptTokens ?? 0;
    metric.output_tokens = final.stats?.generatedTokens ?? 0;
    metric.ttft_ms = final.stats?.timeToFirstToken ?? 0;
    metric.tokens_per_second = final.stats?.tokensPerSecond ?? 0;
    const output = final.contentText.trim() || final.raw.fullText.trim();
    if (!output) throw new Error("QVAC returned empty inventory filters");
    const parsed = normalizeInventoryFilters(
      JSON.parse(output) as Record<string, unknown>,
      question,
    );
    metric.success = true;
    return parsed;
  } catch (error) {
    metric.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await writePerformanceRecord(metric);
    if (modelId) await unloadModel({ modelId });
  }
}
