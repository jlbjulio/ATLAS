import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import {
  close,
  downloadAsset,
  EMBEDDINGGEMMA_300M_Q8_0,
  MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
  QWEN3_1_7B_INST_Q4,
  QWEN3_600M_INST_Q4,
  VAD_SILERO_5_1_2,
  VISIONPSY_NANO_460M_MULTIMODAL_Q4_K_M,
  WHISPER_SMALL_Q8_0,
} from "@qvac/sdk";

const root = resolve(import.meta.dirname, "..");
const cacheRoot = join(homedir(), ".qvac", "models");

const assets = [
  [
    VISIONPSY_NANO_460M_MULTIMODAL_Q4_K_M,
    "models/vision/visionpsy-nano-460m-flash-q4_k_m-imat.gguf",
  ],
  [
    MMPROJ_VISIONPSY_NANO_460M_MULTIMODAL_Q8_0,
    "models/vision/mmproj-visionpsy-nano-460m-flash-q8.gguf",
  ],
  [QWEN3_600M_INST_Q4, "models/language/qwen3-0.6b-q4_0.gguf"],
  [WHISPER_SMALL_Q8_0, "models/speech/whisper-small-q8_0.bin"],
  [VAD_SILERO_5_1_2, "models/speech/silero-vad-5.1.2.bin"],
  [EMBEDDINGGEMMA_300M_Q8_0, "models/embeddings/embeddinggemma-300m-q8_0.gguf"],
];

// Optional: ATLAS_DOWNLOAD_QUERY_1_7B=1 downloads the larger query/answer model.
if (process.env.ATLAS_DOWNLOAD_QUERY_1_7B === "1") {
  assets.push([QWEN3_1_7B_INST_Q4, "models/language/qwen3-1.7b-q4_0.gguf"]);
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function valid(path, descriptor) {
  try {
    const info = await stat(path);
    return (
      info.size === descriptor.expectedSize &&
      (await sha256(path)) === descriptor.sha256Checksum
    );
  } catch {
    return false;
  }
}

async function filesBelow(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await filesBelow(path)));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

async function cachedFile(descriptor) {
  const files = await filesBelow(cacheRoot);
  const candidates = files.filter((path) => {
    const name = basename(path);
    return (
      name === descriptor.modelId || name.endsWith(`_${descriptor.modelId}`)
    );
  });
  for (const path of candidates) {
    if (await valid(path, descriptor)) return path;
  }
  throw new Error(
    `QVAC descargó ${descriptor.name}, pero no se encontró un archivo válido.`,
  );
}

async function ensureModel(descriptor, relativeDestination) {
  const destination = resolve(root, relativeDestination);
  if (await valid(destination, descriptor)) {
    console.log(`OK ${relativeDestination}`);
    return;
  }

  let lastPercent = -10;
  await downloadAsset({
    assetSrc: descriptor,
    onProgress(progress) {
      const percent = Math.floor(Number(progress.percentage ?? 0) / 10) * 10;
      if (percent >= lastPercent + 10) {
        lastPercent = percent;
        console.log(`${descriptor.name}: ${percent}%`);
      }
    },
  });

  const source = await cachedFile(descriptor);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  if (!(await valid(destination, descriptor))) {
    throw new Error(`Falló la verificación de ${relativeDestination}.`);
  }
  console.log(`OK ${relativeDestination}`);
}

try {
  for (const [descriptor, destination] of assets) {
    await ensureModel(descriptor, destination);
  }
  console.log("Todos los modelos de ATLAS están listos.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await close();
}
