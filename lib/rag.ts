import { queryDocuments } from "@/lib/chromadb";

/**
 * Splits text into overlapping chunks for retrieval.
 */
export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 50,
): string[] {
  const sanitizedText = text.replace(/\s+/g, " ").trim();

  if (!sanitizedText) {
    return [];
  }

  if (chunkSize <= overlap) {
    throw new Error("chunkSize must be greater than overlap");
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < sanitizedText.length) {
    const end = Math.min(start + chunkSize, sanitizedText.length);
    chunks.push(sanitizedText.slice(start, end));

    if (end === sanitizedText.length) {
      break;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Builds a context block with separators from retrieved chunks.
 */
export function buildContext(retrievedChunks: string[]): string {
  if (retrievedChunks.length === 0) {
    return "No relevant context found.";
  }

  return retrievedChunks
    .map((chunk, index) => `--- Chunk ${index + 1} ---\n${chunk}`)
    .join("\n\n");
}

/**
 * Runs end-to-end retrieval and returns context plus source metadata.
 */
export async function ragPipeline(userId: string, query: string, nResults = 5) {
  const results = await queryDocuments(userId, query, nResults);
  const retrievedChunks = results.map((item) => item.chunk).filter(Boolean);
  const context = buildContext(retrievedChunks);

  return {
    context,
    sources: results.map((item) => ({
      id: item.id,
      metadata: item.metadata,
      distance: item.distance,
    })),
  };
}
