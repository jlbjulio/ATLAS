import { QuerySession } from "./session.js";

export async function parseInventoryQuestion(question: string): Promise<object> {
  const session = new QuerySession();
  try {
    return await session.parse(question);
  } finally {
    await session.close();
  }
}
