import path from "path";

import { ChromaClient } from "chromadb";
import { v5 as uuidv5 } from "uuid";

import { embedTexts } from "../lib/embeddings";
import { chunkText } from "../lib/rag";
import { listJsonFiles, readJson } from "./common";

type ProcessedRecord = {
  company?: string;
  source?: string;
  title?: string;
  section_title?: string;
  url?: string;
  content?: string;
  repo?: string;
};

type IngestOptions = {
  source?: "gfg" | "ambitionbox" | "github";
  company?: string;
};

const DOCUMENT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function parseCliArgs(): IngestOptions {
  const args = process.argv.slice(2);
  const options: IngestOptions = {};

  for (const arg of args) {
    if (arg.startsWith("--source=")) {
      const source = arg.replace("--source=", "") as IngestOptions["source"];
      options.source = source;
    }
    if (arg.startsWith("--company=")) {
      options.company = arg.replace("--company=", "").toLowerCase();
    }
  }

  return options;
}

function normalizeRecord(record: ProcessedRecord, fallbackSource: string) {
  const source = (record.source ?? fallbackSource).toLowerCase();
  const company = (record.company ?? "general").toLowerCase();
  const title = (record.title ?? record.section_title ?? record.repo ?? "Untitled").trim();
  const url = record.url ?? "";
  const content = (record.content ?? "").trim();

  return { source, company, title, url, content };
}

/**
 * Runs ingestion from processed JSON files into the global Chroma collection.
 */
export async function runIngestion(
  options: IngestOptions = {},
  onLog: (line: string) => void = (line) => console.log(line),
) {
  const chromaClient = new ChromaClient({
    path: process.env.CHROMA_URL || "http://localhost:8000",
  });

  const collection = await chromaClient.getOrCreateCollection({
    name: "placementgpt_global",
  });

  const processedRoot = path.join(process.cwd(), "data", "processed");
  const allFiles = await listJsonFiles(processedRoot);

  const files = allFiles.filter((file) => {
    if (options.source && !file.includes(`${path.sep}${options.source}${path.sep}`)) {
      return false;
    }
    return true;
  });

  if (files.length === 0) {
    onLog("[Ingest] No processed files found for provided filters.");
    return { totalChunksStored: 0, documentsIngested: 0 };
  }

  let totalChunksStored = 0;
  let documentsIngested = 0;

  for (const filePath of files) {
    const fallbackSource = filePath.includes(`${path.sep}gfg${path.sep}`)
      ? "gfg"
      : filePath.includes(`${path.sep}ambitionbox${path.sep}`)
        ? "ambitionbox"
        : "github";

    const records = await readJson<ProcessedRecord[]>(filePath);

    for (const record of records) {
      try {
        const normalized = normalizeRecord(record, fallbackSource);

        if (!normalized.content) {
          continue;
        }

        if (options.company && normalized.company !== options.company) {
          continue;
        }

        const documentId = uuidv5(
          `${normalized.source}|${normalized.url}|${normalized.title}`,
          DOCUMENT_NAMESPACE,
        );

        const existing = await collection.get({
          where: { documentId },
        });

        if ((existing.ids?.length ?? 0) > 0) {
          onLog(
            `[Ingest] Skipping existing document ${normalized.title} (${documentId})`,
          );
          continue;
        }

        const chunks = chunkText(normalized.content, 500, 50);
        if (chunks.length === 0) {
          continue;
        }

        const embeddings = await embedTexts(chunks);
        const ids = chunks.map((_, chunkIndex) => `${documentId}_${chunkIndex}`);
        const metadatas = chunks.map((_, chunkIndex) => ({
          company: normalized.company,
          source: normalized.source,
          title: normalized.title,
          url: normalized.url,
          chunkIndex,
          documentId,
        }));

        onLog(
          `[Ingest] Ingesting ${normalized.company} from ${normalized.source}: ${normalized.title}`,
        );

        await collection.add({
          ids,
          documents: chunks,
          embeddings,
          metadatas,
        });

        totalChunksStored += chunks.length;
        documentsIngested += 1;
      } catch (error) {
        onLog(`[Ingest][WARN] Failed record from ${filePath}: ${String(error)}`);
      }
    }
  }

  onLog(`[Ingest] Documents ingested: ${documentsIngested}`);
  onLog(`[Ingest] Total chunks stored: ${totalChunksStored}`);

  return { totalChunksStored, documentsIngested };
}

async function main() {
  const options = parseCliArgs();
  await runIngestion(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
