import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { QWEN3_1_7B_INST_Q4 } from "@qvac/sdk";

const root = resolve(import.meta.dirname, "../..");
export const defaultModelPath = resolve(
  root,
  "models/language/qwen3-0.6b-q4_0.gguf",
);
const largeModelPath = resolve(root, "models/language/qwen3-1.7b-q4_0.gguf");

export type QueryModelSource = string | typeof QWEN3_1_7B_INST_Q4;

const SMALL_MODEL = {
  src: defaultModelPath,
  label: "models/language/qwen3-0.6b-q4_0.gguf",
};

export async function queryModel(): Promise<{
  src: QueryModelSource;
  label: string;
}> {
  const preference = process.env.ATLAS_QUERY_MODEL;
  if (preference === "0.6b") {
    return SMALL_MODEL;
  }
  try {
    await access(largeModelPath);
    return {
      src: largeModelPath,
      label: "models/language/qwen3-1.7b-q4_0.gguf",
    };
  } catch {
    // The verified 0.6B model remains the default when the 1.7B is absent.
  }
  if (preference === "1.7b") {
    return { src: QWEN3_1_7B_INST_Q4, label: "registry://Qwen3-1.7B-Q4_0" };
  }
  return SMALL_MODEL;
}
