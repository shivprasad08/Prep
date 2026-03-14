import { ChromaClient, type Collection } from "chromadb";

import { embedText, embedTexts } from "@/lib/embeddings";

const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000",
});

export type ChunkMetadata = {
  documentId: string;
  title: string;
  type: "resume" | "company_info" | "pyq" | "interview_experience";
  company: string | null;
  chunkIndex: number;
};

export type QueryResultItem = {
  id: string;
  chunk: string;
  metadata: ChunkMetadata | null;
  distance: number | null;
};

function collectionNameFromUserId(userId: string) {
  const safeUserId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `placementgpt_${safeUserId}`;
}

/**
 * Gets or creates a user-isolated Chroma collection.
 */
export async function getOrCreateCollection(
  userId: string,
): Promise<Collection> {
  return chromaClient.getOrCreateCollection({
    name: collectionNameFromUserId(userId),
  });
}

/**
 * Embeds and stores document chunks in the user's Chroma collection.
 */
export async function addDocuments(
  userId: string,
  chunks: string[],
  metadata: ChunkMetadata[],
  ids: string[],
) {
  if (chunks.length === 0) {
    return;
  }

  if (chunks.length !== metadata.length || chunks.length !== ids.length) {
    throw new Error("Chunks, metadata, and ids must have equal lengths");
  }

  const collection = await getOrCreateCollection(userId);
  const embeddings = await embedTexts(chunks);

  await collection.add({
    ids,
    documents: chunks,
    metadatas: metadata,
    embeddings,
  });
}

/**
 * Queries the user's Chroma collection and returns top matching chunks.
 */
export async function queryDocuments(
  userId: string,
  query: string,
  nResults = 5,
): Promise<QueryResultItem[]> {
  const collection = await getOrCreateCollection(userId);
  const queryEmbedding = await embedText(query);

  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    include: ["documents", "metadatas", "distances"],
  });

  const ids = result.ids?.[0] ?? [];
  const documents = result.documents?.[0] ?? [];
  const metadatas = (result.metadatas?.[0] ?? []) as Array<ChunkMetadata | null>;
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, index) => ({
    id,
    chunk: documents[index] ?? "",
    metadata: metadatas[index] ?? null,
    distance: distances[index] ?? null,
  }));
}

/**
 * Deletes all chunks associated with a specific source document ID.
 */
export async function deleteDocuments(userId: string, documentId: string) {
  const collection = await getOrCreateCollection(userId);

  await collection.delete({
    where: { documentId },
  });
}
