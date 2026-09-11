import { QuerySession, type Summary } from "./session.js";

export async function answerInventoryQuestion(
  question: string,
  summary: Summary,
): Promise<string> {
  const session = new QuerySession();
  try {
    return await session.answer(question, summary);
  } finally {
    await session.close();
  }
}
