import fs from "fs/promises";
import path from "path";

import { ensureDir, listJsonFiles, readJson, writeJson } from "./common";

type RawRecord = {
  company?: string;
  title?: string;
  section_title?: string;
  content?: string;
  url?: string;
  source?: string;
  repo?: string;
  scraped_at?: string;
};

function cleanText(input: string) {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

function inferCompany(fileName: string) {
  return fileName.replace(".json", "").replace(/-/g, " ").trim().toLowerCase();
}

async function processFile(filePath: string) {
  const records = await readJson<RawRecord[]>(filePath);
  const source = filePath.includes(`${path.sep}gfg${path.sep}`)
    ? "gfg"
    : filePath.includes(`${path.sep}ambitionbox${path.sep}`)
      ? "ambitionbox"
      : "github";

  const fileName = path.basename(filePath);
  const companyFallback = inferCompany(fileName);

  const dedupe = new Set<string>();
  const cleaned: Array<
    RawRecord & {
      company: string;
      title: string;
      content: string;
      source: string;
      scraped_at: string;
    }
  > = [];

  let removed = 0;

  for (const record of records) {
    const content = cleanText(record.content ?? "");
    if (content.length < 100) {
      removed += 1;
      continue;
    }

    if (dedupe.has(content)) {
      removed += 1;
      continue;
    }

    dedupe.add(content);

    cleaned.push({
      ...record,
      company: (record.company ?? companyFallback).toLowerCase(),
      title: cleanText(record.title ?? record.section_title ?? "Untitled"),
      content,
      source: record.source ?? source,
      scraped_at: record.scraped_at ?? new Date().toISOString(),
    });
  }

  const targetDir = path.join(process.cwd(), "data", "processed", source);
  await ensureDir(targetDir);
  const targetPath = path.join(targetDir, fileName);

  await writeJson(targetPath, cleaned);

  console.log(
    `[Clean] ${source}/${fileName}: cleaned=${cleaned.length}, removed=${removed}`,
  );
}

async function main() {
  const rawDir = path.join(process.cwd(), "data", "raw");
  const files = await listJsonFiles(rawDir);

  if (files.length === 0) {
    console.log("[Clean] No raw files found.");
    return;
  }

  for (const filePath of files) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        continue;
      }

      await processFile(filePath);
    } catch (error) {
      console.warn(`[Clean] Failed file ${filePath}`, error);
    }
  }

  console.log("[Clean] Data cleaning complete.");
}

void main();
