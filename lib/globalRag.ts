import {
  queryDocuments,
  queryGlobalDocuments,
  type GlobalQueryResult,
  type QueryResultItem,
} from "@/lib/chromadb";
import { buildContext } from "@/lib/rag";

/**
 * Queries the global shared collection, optionally filtered by company.
 */
export async function queryGlobalCollection(
  query: string,
  company?: string,
  nResults = 5,
): Promise<GlobalQueryResult[]> {
  return queryGlobalDocuments(query, company, nResults);
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
