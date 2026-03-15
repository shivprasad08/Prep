import axios from "axios";

import { embedText, embedTexts } from "@/lib/embeddings";

const API_VERSION = "2024-07";
const DEFAULT_GLOBAL_NAMESPACE = "placementgpt_global";

type PineconeMatch = {
  id?: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

function getPineconeConfig() {
  const apiKey = process.env.PINECONE_API_KEY;
  const rawHost = process.env.PINECONE_HOST;

  if (!apiKey || !rawHost) {
    throw new Error("PINECONE_API_KEY and PINECONE_HOST are required");
  }

  const host = rawHost.startsWith("http") ? rawHost : `https://${rawHost}`;

  return { apiKey, host };
}

function getGlobalNamespace() {
  return process.env.PINECONE_GLOBAL_NAMESPACE || DEFAULT_GLOBAL_NAMESPACE;
}

async function pineconePost<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const { apiKey, host } = getPineconeConfig();

  const response = await axios.post<TResponse>(`${host}${path}`, body, {
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "X-Pinecone-API-Version": API_VERSION,
    },
    timeout: 20000,
  });

  return response.data;
}

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

function namespaceFromUserId(userId: string) {
  const safeUserId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `user_${safeUserId}`;
}

/**
 * Checks whether Pinecone credentials and host are reachable.
 */
export async function checkVectorStoreConnection() {
  await pineconePost("/describe_index_stats", {});
}

/**
 * Embeds and stores document chunks in a user namespace in Pinecone.
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

  const embeddings = await embedTexts(chunks);

  const vectors = ids.map((id, index) => ({
    id,
    values: embeddings[index],
    metadata: {
      ...metadata[index],
      chunk: chunks[index],
    },
  }));

  await pineconePost("/vectors/upsert", {
    namespace: namespaceFromUserId(userId),
    vectors,
  });
}

/**
 * Queries a user namespace and returns top matching chunks.
 */
export async function queryDocuments(
  userId: string,
  query: string,
  nResults = 5,
): Promise<QueryResultItem[]> {
  const queryEmbedding = await embedText(query);

  const result = await pineconePost<{ matches?: PineconeMatch[] }>("/query", {
    namespace: namespaceFromUserId(userId),
    topK: nResults,
    vector: queryEmbedding,
    includeMetadata: true,
    includeValues: false,
  });

  const matches = result.matches ?? [];

  return matches.map((match) => {
    const metadata = (match.metadata ?? {}) as Record<string, unknown>;

    return {
      id: match.id ?? "",
      chunk: typeof metadata.chunk === "string" ? metadata.chunk : "",
      metadata: {
        documentId: String(metadata.documentId ?? ""),
        title: String(metadata.title ?? ""),
        type: (metadata.type as ChunkMetadata["type"]) ?? "company_info",
        company:
          metadata.company === null || typeof metadata.company === "string"
            ? (metadata.company as string | null)
            : null,
        chunkIndex:
          typeof metadata.chunkIndex === "number" ? metadata.chunkIndex : 0,
      },
      distance: typeof match.score === "number" ? 1 - match.score : null,
    };
  });
}

export type GlobalChunkMetadata = {
  company?: string;
  source?: string;
  title?: string;
  url?: string;
  chunkIndex?: number;
  documentId?: string;
};

export type GlobalQueryResult = {
  id: string;
  chunk: string;
  metadata: GlobalChunkMetadata | null;
  distance: number | null;
};

/**
 * Adds globally shared chunks to Pinecone global namespace.
 */
export async function addGlobalDocuments(
  chunks: string[],
  metadata: GlobalChunkMetadata[],
  ids: string[],
) {
  if (chunks.length === 0) {
    return;
  }

  if (chunks.length !== metadata.length || chunks.length !== ids.length) {
    throw new Error("Chunks, metadata, and ids must have equal lengths");
  }

  const embeddings = await embedTexts(chunks);
  const vectors = ids.map((id, index) => ({
    id,
    values: embeddings[index],
    metadata: {
      ...metadata[index],
      chunk: chunks[index],
    },
  }));

  await pineconePost("/vectors/upsert", {
    namespace: getGlobalNamespace(),
    vectors,
  });
}

/**
 * Queries global namespace and optionally filters by company.
 */
export async function queryGlobalDocuments(
  query: string,
  company?: string,
  nResults = 5,
): Promise<GlobalQueryResult[]> {
  const queryEmbedding = await embedText(query);

  const result = await pineconePost<{ matches?: PineconeMatch[] }>("/query", {
    namespace: getGlobalNamespace(),
    topK: nResults,
    vector: queryEmbedding,
    includeMetadata: true,
    includeValues: false,
    filter: company ? { company: { $eq: company.toLowerCase() } } : undefined,
  });

  return (result.matches ?? []).map((match) => {
    const metadata = (match.metadata ?? {}) as Record<string, unknown>;

    return {
      id: match.id ?? "",
      chunk: typeof metadata.chunk === "string" ? metadata.chunk : "",
      metadata: {
        company: typeof metadata.company === "string" ? metadata.company : undefined,
        source: typeof metadata.source === "string" ? metadata.source : undefined,
        title: typeof metadata.title === "string" ? metadata.title : undefined,
        url: typeof metadata.url === "string" ? metadata.url : undefined,
        chunkIndex:
          typeof metadata.chunkIndex === "number" ? metadata.chunkIndex : undefined,
        documentId:
          typeof metadata.documentId === "string" ? metadata.documentId : undefined,
      },
      distance: typeof match.score === "number" ? 1 - match.score : null,
    };
  });
}

/**
 * Deletes all chunks associated with a specific source document ID.
 */
export async function deleteDocuments(userId: string, documentId: string) {
  await pineconePost("/vectors/delete", {
    namespace: namespaceFromUserId(userId),
    filter: {
      documentId: {
        $eq: documentId,
      },
    },
  });
}
