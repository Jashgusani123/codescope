import ollama from "ollama";
import { EMBED_MODEL } from "./config.js";

export async function getEmbedding(text, label = "chunk") {
  const attempts = [text, text.slice(0, 900), text.slice(0, 400), text.slice(0, 150)];

  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const response = await ollama.embeddings({
        model: EMBED_MODEL,
        prompt: attempt,
      });
      return response.embedding;
    } catch (err) {
      if (err?.error?.includes("context length") || err?.error?.includes("exceeds")) {
        continue;
      }
      throw err;
    }
  }

  console.warn(`\n  ⚠ Skipping "${label}" — too large to embed even after truncation.`);
  return null;
}
