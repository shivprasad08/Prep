import axios from "axios";
import fs from "fs/promises";
import path from "path";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const TARGET_COMPANIES = [
  "Google",
  "Amazon",
  "Microsoft",
  "Flipkart",
  "Adobe",
  "TCS",
  "Infosys",
  "Wipro",
  "Cognizant",
  "Accenture",
] as const;

export function slugifyCompany(company: string) {
  return company.toLowerCase().replace(/\s+/g, "-");
}

export function toFileSafeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
}

export async function delay(ms = 2000) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJson(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function fetchHtml(url: string) {
  try {
    const response = await axios.get<string>(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 20000,
      validateStatus: () => true,
    });

    if (response.status === 403 || response.status === 429) {
      console.warn(`[WARN] ${response.status} from ${url}. Skipping.`);
      return null;
    }

    if (response.status < 200 || response.status >= 300) {
      console.warn(`[WARN] Non-success status ${response.status} from ${url}`);
      return null;
    }

    return response.data;
  } catch (error) {
    console.warn(`[WARN] Request failed for ${url}`, error);
    return null;
  }
}

export async function listJsonFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}
