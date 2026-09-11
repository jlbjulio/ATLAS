import { createInterface } from "node:readline";

import { QuerySession, type Summary } from "./session.js";

type WorkerRequest = {
  id: number;
  command: string;
  text?: string;
  question?: string;
  summary?: Summary | string;
};

const session = new QuerySession();
let queue = Promise.resolve();

function parseSummary(value: Summary | string | undefined): Summary {
  if (!value) return {};
  if (typeof value === "string") {
    return JSON.parse(value) as Summary;
  }
  return value;
}

async function handle(request: WorkerRequest): Promise<unknown> {
  switch (request.command) {
    case "query": {
      if (typeof request.text !== "string") {
        throw new Error("Missing text");
      }
      return session.parse(request.text);
    }
    case "answer": {
      if (typeof request.question !== "string") {
        throw new Error("Missing question");
      }
      const text = await session.answer(
        request.question,
        parseSummary(request.summary),
      );
      return { text };
    }
    case "health":
      return { loaded: session.modelLoaded, model: session.modelLabel };
    case "close":
      await session.close();
      return { closed: true };
    default:
      throw new Error(`Unknown command ${request.command}`);
  }
}

function respond(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

const reader = createInterface({ input: process.stdin });

reader.on("line", (line) => {
  queue = queue.then(async () => {
    let request: WorkerRequest;
    try {
      request = JSON.parse(line) as WorkerRequest;
    } catch {
      return;
    }
    try {
      const result = await handle(request);
      respond({ id: request.id, ok: true, result });
    } catch (error) {
      respond({
        id: request.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

reader.on("close", () => {
  void session.close().finally(() => process.exit(0));
});

// Warm up the model once so the first real query is fast.
void session.ensureModel().catch((error) => {
  process.stderr.write(`ATLAS QVAC worker warmup failed: ${String(error)}\n`);
});
