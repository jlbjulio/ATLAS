import { access, readFile } from "node:fs/promises";
import { platform, arch } from "node:os";
import { resolve } from "node:path";

import {
  close,
  completion,
  embed,
  loadModel,
  transcribe,
  unloadModel,
} from "@qvac/sdk";

import { writePerformanceRecord } from "./metrics.js";
import { normalizeObservation } from "./normalize.js";
import type { PerformanceRecord, StructuredObservation } from "./types.js";

type ModelSpec = {
  path: string;
  optional_lora_path?: string;
  projector_path?: string;
  quantization?: string;
  qvac_model_type: string;
};

type AtlasConfig = {
  runtime: { allow_cloud_inference: boolean };
  models: {
    vision: ModelSpec;
    extraction: ModelSpec;
    transcription: ModelSpec & { vad_path: string };
    duplicates: ModelSpec;
  };
};

const root = resolve(import.meta.dirname, "../..");
const config = JSON.parse(
  await readFile(resolve(root, "config/models.json"), "utf8"),
) as AtlasConfig;
const observationSchema = JSON.parse(
  await readFile(
    resolve(root, "schemas/installed-base-observation.schema.json"),
    "utf8",
  ),
) as Record<string, unknown>;

if (config.runtime.allow_cloud_inference) {
  throw new Error("ATLAS refuses to start when cloud inference is enabled.");
}

const systemPrompt = `You extract installed medical-equipment observations.
Return only evidence supported by the user's note or authorized photo.
Never guess a customer, location, quantity, manufacturer, model, serial number, or age.
Use null for unknown values. Preserve separate equipment groups when ages, models, or brands differ.
Before human review, use Reportado for explicit observations, Estimado for approximations,
and Desconocido when support is insufficient. Never mark model output as Confirmado.
Ask exactly one concise follow-up question for the missing field with the highest business value.
If a person, patient record, badge, face, or unrelated sensitive content is visible, add a privacy flag.`;

function localPath(path: string): string {
  return resolve(root, path);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function baseMetric(
  model: string,
  quantization: string,
  task: string,
  prompt: string,
): PerformanceRecord {
  return {
    timestamp: new Date().toISOString(),
    hardware: `${platform()}-${arch()}`,
    model,
    quantization,
    task,
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
}

async function structuredCompletion(
  spec: ModelSpec,
  task: string,
  note: string,
  imagePath?: string,
): Promise<StructuredObservation> {
  const prompt = `/no_think\n${note.trim() || "Analyze the authorized equipment photo."}`;
  const metric = baseMetric(
    spec.path,
    spec.quantization ?? "declared in model file",
    task,
    prompt,
  );
  const loadStarted = performance.now();
  let modelId: string | undefined;
  try {
    const adapterPath = spec.optional_lora_path
      ? localPath(spec.optional_lora_path)
      : undefined;
    let adapterAvailable = false;
    if (adapterPath) {
      try {
        await access(adapterPath);
        adapterAvailable = true;
      } catch {
        // The evaluated adapter is optional; the verified base model remains demo-ready.
      }
    }
    modelId = await loadModel({
      modelSrc: localPath(spec.path),
      modelType: "llamacpp-completion",
      modelConfig: {
        ctx_size: 4096,
        ...(adapterAvailable && adapterPath ? { lora: adapterPath } : {}),
        ...(spec.projector_path
          ? { projectionModelSrc: localPath(spec.projector_path) }
          : {}),
      },
    });
    metric.model_load_ms = performance.now() - loadStarted;
    const inferenceStarted = performance.now();
    const run = completion({
      modelId,
      history: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: prompt,
          ...(imagePath ? { attachments: [{ path: resolve(imagePath) }] } : {}),
        },
      ],
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
          schema: observationSchema,
          strict: true,
        },
      },
    });
    const final = await run.final;
    metric.total_inference_ms = performance.now() - inferenceStarted;
    metric.input_tokens = final.stats?.promptTokens ?? 0;
    metric.output_tokens = final.stats?.generatedTokens ?? 0;
    metric.ttft_ms = final.stats?.timeToFirstToken ?? 0;
    metric.tokens_per_second = final.stats?.tokensPerSecond ?? 0;
    const output = final.contentText.trim() || final.raw.fullText.trim();
    if (!output) throw new Error("QVAC returned an empty structured response");
    const parsed = normalizeObservation(
      JSON.parse(output) as StructuredObservation,
      {
        hasImage: Boolean(imagePath),
      },
    );
    metric.success = true;
    return parsed;
  } catch (error) {
    metric.error = errorMessage(error);
    throw error;
  } finally {
    await writePerformanceRecord(metric);
    if (modelId) await unloadModel({ modelId });
  }
}

export function extractText(note: string): Promise<StructuredObservation> {
  return structuredCompletion(
    config.models.extraction,
    "text-extraction",
    note,
  );
}

export function inspectEquipmentPhoto(
  imagePath: string,
  note = "",
): Promise<StructuredObservation> {
  return structuredCompletion(
    config.models.vision,
    "visionpsy-equipment-inspection",
    note,
    imagePath,
  );
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  const spec = config.models.transcription;
  const metric = baseMetric(
    spec.path,
    "Q8_0",
    "voice-transcription",
    audioPath,
  );
  const loadStarted = performance.now();
  let modelId: string | undefined;
  try {
    modelId = await loadModel({
      modelSrc: localPath(spec.path),
      modelType: "whispercpp-transcription",
      modelConfig: {
        language: "auto",
        vadModelSrc: localPath(spec.vad_path),
      },
    });
    metric.model_load_ms = performance.now() - loadStarted;
    const inferenceStarted = performance.now();
    const text = await transcribe({ modelId, audioChunk: resolve(audioPath) });
    metric.total_inference_ms = performance.now() - inferenceStarted;
    metric.success = true;
    return text;
  } catch (error) {
    metric.error = errorMessage(error);
    throw error;
  } finally {
    await writePerformanceRecord(metric);
    if (modelId) await unloadModel({ modelId });
  }
}

export async function embedIdentity(text: string): Promise<number[]> {
  const spec = config.models.duplicates;
  const metric = baseMetric(
    spec.path,
    spec.quantization ?? "Q8_0",
    "asset-embedding",
    text,
  );
  const loadStarted = performance.now();
  let modelId: string | undefined;
  try {
    modelId = await loadModel({
      modelSrc: localPath(spec.path),
      modelType: "llamacpp-embedding",
    });
    metric.model_load_ms = performance.now() - loadStarted;
    const inferenceStarted = performance.now();
    const result = await embed({ modelId, text });
    metric.total_inference_ms = performance.now() - inferenceStarted;
    metric.success = true;
    return result.embedding;
  } catch (error) {
    metric.error = errorMessage(error);
    throw error;
  } finally {
    await writePerformanceRecord(metric);
    if (modelId) await unloadModel({ modelId });
  }
}

export async function embedIdentities(texts: string[]): Promise<number[][]> {
  const spec = config.models.duplicates;
  const metric = baseMetric(
    spec.path,
    spec.quantization ?? "Q8_0",
    "asset-embedding-batch",
    JSON.stringify(texts),
  );
  const loadStarted = performance.now();
  let modelId: string | undefined;
  try {
    modelId = await loadModel({
      modelSrc: localPath(spec.path),
      modelType: "llamacpp-embedding",
    });
    metric.model_load_ms = performance.now() - loadStarted;
    const inferenceStarted = performance.now();
    const result = await embed({ modelId, text: texts });
    metric.total_inference_ms = performance.now() - inferenceStarted;
    metric.success = true;
    return result.embedding;
  } catch (error) {
    metric.error = errorMessage(error);
    throw error;
  } finally {
    await writePerformanceRecord(metric);
    if (modelId) await unloadModel({ modelId });
  }
}

export async function closeQvac(): Promise<void> {
  await close();
}
