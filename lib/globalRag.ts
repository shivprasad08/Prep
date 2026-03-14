import { ChromaClient } from "chromadb";

import { queryDocuments, type QueryResultItem } from "@/lib/chromadb";
import { embedText } from "@/lib/embeddings";
import { buildContext } from "@/lib/rag";

type GlobalChunkMetadata = {
  company?: string;
  source?: string;
  title?: string;
  url?: string;
  chunkIndex?: number;
  documentId?: string;
};

type GlobalQueryResult = {
  id: string;
  chunk: string;
  metadata: GlobalChunkMetadata | null;
  distance: number | null;
};

const globalClient = new ChromaClient({
  path: process.env.CHROMA_URL || "http://localhost:8000",
});

async function getGlobalCollection() {
  return globalClient.getOrCreateCollection({
    name: "placementgpt_global",
  });
}

/**
 * Queries the global shared collection, optionally filtered by company.
 */
export async function queryGlobalCollection(
  query: string,
  company?: string,
  nResults = 5,
): Promise<GlobalQueryResult[]> {
  const collection = await getGlobalCollection();
  const queryEmbedding = await embedText(query);

  const where = company ? { company: company.toLowerCase() } : undefined;
  const result = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults,
    where,
    include: ["documents", "metadatas", "distances"],
  });

  const ids = result.ids?.[0] ?? [];
  const documents = result.documents?.[0] ?? [];
  const metadatas = (result.metadatas?.[0] ?? []) as Array<
    GlobalChunkMetadata | null
  >;
  const distances = result.distances?.[0] ?? [];

  return ids.map((id, index) => ({
    id,
    chunk: documents[index] ?? "",
    metadata: metadatas[index] ?? null,
    distance: distances[index] ?? null,
  }));
}

type RankedItem = {
  id: string;
  chunk: string;
  metadata: unknown;
  distance: number | null;
  scope: "personal" | "global";
  rankScore: number;
};

function rankPersonal(item: QueryResultItem): RankedItem {
  const distance = item.distance ?? 1;
  return {
    id: item.id,
    chunk: item.chunk,
    metadata: item.metadata,
    distance: item.distance,
    scope: "personal",
    rankScore: distance - 0.25,
  };
}

function rankGlobal(item: GlobalQueryResult): RankedItem {
  const distance = item.distance ?? 1;
  return {
    id: item.id,
    chunk: item.chunk,
    metadata: item.metadata,
    distance: item.distance,
    scope: "global",
    rankScore: distance + 0.25,
  };
}

/**
 * Runs hybrid retrieval across personal and global collections.
 */
export async function hybridRagPipeline(
  userId: string,
  query: string,
  company?: string,
  nResults = 5,
) {
  const [personalResults, globalResults] = await Promise.all([
    queryDocuments(userId, query, nResults),
    queryGlobalCollection(query, company, nResults),
  ]);

  const merged: RankedItem[] = [
    ...personalResults.map(rankPersonal),
    ...globalResults.map(rankGlobal),
  ];

  const seen = new Set<string>();
  const deduped: RankedItem[] = [];

  for (const item of merged.sort((a, b) => a.rankScore - b.rankScore)) {
    const title =
      typeof item.metadata === "object" && item.metadata !== null && "title" in item.metadata
        ? String((item.metadata as { title?: string }).title ?? "")
        : "";
    const dedupeKey = `${title}|${item.chunk.slice(0, 80)}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    deduped.push(item);

    if (deduped.length >= nResults) {
      break;
    }
  }

  const context = buildContext(deduped.map((item) => item.chunk));

  return {
    context,
    sources: deduped.map((item) => ({
      id: item.id,
      scope: item.scope,
      metadata: item.metadata,
      distance: item.distance,
    })),
  };
}
