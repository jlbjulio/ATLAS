import {
  completion,
  downloadAsset,
  loadModel,
  QWEN3_600M_INST_Q4,
  WHISPER_TINY,
  VAD_SILERO_5_1_2,
  transcribe,
  unloadModel,
  type ModelProgressUpdate,
} from "@qvac/sdk";

import type { Extraction } from "./types";

type ProgressHandler = (label: string, percentage: number) => void;

let extractionModelId: string | null = null;
let transcriptionModelId: string | null = null;

const EXTRACTION_PROMPT = `
Eres el extractor local de ATLAS para observaciones de equipos médicos.
Devuelve SOLO JSON válido con esta forma:
{"equipments":[{"modality":"CT|MRI|XRAY|ULTRASOUND|PET|SPECT|MAMMOGRAPHY|FLUOROSCOPY|OTHER","brand":string|null,"model":string|null,"ageYears":number|null,"quantity":number,"confidence":number,"status":"Reportado|Estimado|Desconocido"}],"missingFields":string[],"nextQuestion":string|null,"confidence":number}
No inventes datos. Usa Reportado solo para información explícita, Estimado para aproximaciones y Desconocido cuando no haya evidencia. Nunca uses Confirmado para una inferencia. La salida debe ser JSON, sin markdown.
`;

function progress(label: string, onProgress: ProgressHandler | undefined) {
  return (update: ModelProgressUpdate) =>
    onProgress?.(label, Math.round(update.percentage));
}

export async function initializeQVAC(
  onProgress?: ProgressHandler,
): Promise<void> {
  if (extractionModelId && transcriptionModelId) return;

  onProgress?.("Preparando modelo de extracción", 0);
  await downloadAsset({
    assetSrc: QWEN3_600M_INST_Q4,
    onProgress: progress("Extracción", onProgress),
  });
  await downloadAsset({
    assetSrc: WHISPER_TINY,
    onProgress: progress("Voz", onProgress),
  });
  await downloadAsset({
    assetSrc: VAD_SILERO_5_1_2,
    onProgress: progress("VAD", onProgress),
  });

  extractionModelId = await loadModel({
    modelSrc: QWEN3_600M_INST_Q4,
    // CPU is the portable local backend on Android. It avoids device-specific GPU
    // driver failures while keeping all inference on the field device.
    modelConfig: { ctx_size: 1024, device: "cpu" },
  });
  transcriptionModelId = await loadModel({
    modelSrc: WHISPER_TINY,
    modelConfig: { vadModelSrc: VAD_SILERO_5_1_2, language: "auto" },
  });
  onProgress?.("Inferencia local lista", 100);
}

export async function extractObservation(note: string): Promise<Extraction> {
  if (!extractionModelId)
    throw new Error("El modelo de extracción local no está listo");
  const result = completion({
    modelId: extractionModelId,
    history: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: note },
    ],
    stream: false,
  });
  const final = await result.final;
  const text = final.contentText.trim() || final.raw.fullText.trim();
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("QVAC no devolvió una extracción estructurada");
  return JSON.parse(json) as Extraction;
}

export async function transcribeObservation(uri: string): Promise<string> {
  if (!transcriptionModelId)
    throw new Error("El modelo de voz local no está listo");
  // QVAC's native Whisper worker requires a filesystem path, not Expo's file URI.
  const audioPath = decodeURIComponent(uri.replace(/^file:\/\//, ""));
  return transcribe({ modelId: transcriptionModelId, audioChunk: audioPath });
}

export async function shutdownQVAC(): Promise<void> {
  if (extractionModelId)
    await unloadModel({ modelId: extractionModelId, clearStorage: false });
  if (transcriptionModelId)
    await unloadModel({ modelId: transcriptionModelId, clearStorage: false });
  extractionModelId = null;
  transcriptionModelId = null;
}
