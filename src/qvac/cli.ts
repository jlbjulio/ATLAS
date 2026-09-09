import { existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  closeQvac,
  embedIdentities,
  embedIdentity,
  extractText,
  inspectEquipmentPhoto,
  transcribeAudio,
} from "./engine.js";
import { parseInventoryQuestion } from "./query.js";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function required(name: string): string {
  const value = option(name);
  if (!value) throw new Error(`Missing required option ${name}`);
  return value;
}

async function run(): Promise<void> {
  const command = process.argv[2];
  if (command === "health") {
    const paths = [
      "models/vision/visionpsy-nano-460m-flash-q4_k_m-imat.gguf",
      "models/vision/mmproj-visionpsy-nano-460m-flash-q8.gguf",
      "models/language/qwen3-1.7b-q4_0.gguf",
      "models/speech/whisper-small-q8_0.bin",
      "models/embeddings/embeddinggemma-300m-q8_0.gguf",
    ];
    const files = Object.fromEntries(
      paths.map((path) => [path, existsSync(resolve(path))]),
    );
    process.stdout.write(`${JSON.stringify({ local_only: true, files })}\n`);
    return;
  }
  if (command === "extract") {
    const text = required("--text");
    const image = option("--image");
    const result = image
      ? await inspectEquipmentPhoto(image, text)
      : await extractText(text);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === "transcribe") {
    const result = await transcribeAudio(required("--audio"));
    process.stdout.write(`${JSON.stringify({ text: result })}\n`);
    return;
  }
  if (command === "embed") {
    const textsJson = option("--texts-json");
    const result = textsJson
      ? await embedIdentities(JSON.parse(textsJson) as string[])
      : await embedIdentity(required("--text"));
    process.stdout.write(`${JSON.stringify({ embedding: result })}\n`);
    return;
  }
  if (command === "query") {
    const result = await parseInventoryQuestion(required("--text"));
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  throw new Error("Use health, extract, transcribe, embed, or query.");
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await closeQvac();
}
