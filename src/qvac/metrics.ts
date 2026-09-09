import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { PerformanceRecord } from "./types.js";

const defaultPath = resolve("data/local/performance.jsonl");

export async function writePerformanceRecord(
  record: PerformanceRecord,
  destination = defaultPath,
): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  await appendFile(destination, `${JSON.stringify(record)}\n`, "utf8");
}
