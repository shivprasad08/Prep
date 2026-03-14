import axios from "axios";
import path from "path";

import { USER_AGENT, delay, toFileSafeName, writeJson } from "./common";

type RepoSpec = {
  owner: string;
  repo: string;
};

type GithubRecord = {
  repo: string;
  section_title: string;
  content: string;
  url: string;
  source: "github";
  scraped_at: string;
};

const REPOS: RepoSpec[] = [
  { owner: "jwasham", repo: "coding-interview-university" },
  { owner: "donnemartin", repo: "system-design-primer" },
  { owner: "checkcheckzz", repo: "system-design-interview" },
  { owner: "yangshun", repo: "tech-interview-handbook" },
];

async function getDefaultBranch(repo: RepoSpec) {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  const response = await axios.get<{ default_branch: string }>(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/vnd.github+json",
    },
    timeout: 20000,
  });

  return response.data.default_branch;
}

async function getMarkdownPaths(repo: RepoSpec, branch: string) {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${branch}?recursive=1`;
  const response = await axios.get<{ tree: Array<{ path: string; type: string }> }>(
    url,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/vnd.github+json",
      },
      timeout: 30000,
    },
  );

  return response.data.tree
    .filter((item) => item.type === "blob" && item.path.toLowerCase().endsWith(".md"))
    .map((item) => item.path)
    .slice(0, 50);
}

function parseMarkdownSections(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const sections: Array<{ section_title: string; content: string }> = [];

  let currentTitle = "Overview";
  let buffer: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      const content = buffer.join("\n").trim();
      if (content.length > 0) {
        sections.push({ section_title: currentTitle, content });
      }
      currentTitle = headingMatch[1].trim();
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  const tail = buffer.join("\n").trim();
  if (tail.length > 0) {
    sections.push({ section_title: currentTitle, content: tail });
  }

  return sections;
}

async function fetchRawMarkdown(rawUrl: string) {
  const response = await axios.get<string>(rawUrl, {
    headers: { "User-Agent": USER_AGENT },
    timeout: 20000,
    validateStatus: () => true,
  });

  if (response.status === 403 || response.status === 429) {
    console.warn(`[GitHub] Rate-limited or forbidden (${response.status}) at ${rawUrl}`);
    return null;
  }

  if (response.status < 200 || response.status >= 300) {
    console.warn(`[GitHub] Failed to fetch ${rawUrl} status=${response.status}`);
    return null;
  }

  return response.data;
}

async function scrapeRepo(repo: RepoSpec) {
  const repoName = `${repo.owner}/${repo.repo}`;
  const branch = await getDefaultBranch(repo);
  const markdownPaths = await getMarkdownPaths(repo, branch);
  const records: GithubRecord[] = [];

  for (const filePath of markdownPaths) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${branch}/${filePath}`;
      const markdown = await fetchRawMarkdown(rawUrl);
      await delay(2000);

      if (!markdown) {
        continue;
      }

      const sections = parseMarkdownSections(markdown);
      for (const section of sections) {
        records.push({
          repo: repoName,
          section_title: section.section_title,
          content: section.content,
          url: rawUrl,
          source: "github",
          scraped_at: new Date().toISOString(),
        });
      }

      console.log(`[GitHub] Parsed ${filePath} (${sections.length} sections)`);
    } catch (error) {
      console.warn(`[GitHub] Failed file ${filePath} for ${repoName}`, error);
    }
  }

  const outputPath = path.join(
    process.cwd(),
    "data",
    "raw",
    "github",
    `${toFileSafeName(repo.repo)}.json`,
  );

  await writeJson(outputPath, records);
  console.log(`[GitHub] Saved ${records.length} records for ${repoName}`);
}

async function main() {
  for (const repo of REPOS) {
    console.log(`\n[GitHub] Processing ${repo.owner}/${repo.repo}...`);
    try {
      await scrapeRepo(repo);
    } catch (error) {
      console.warn(`[GitHub] Repo scrape failed for ${repo.owner}/${repo.repo}`, error);
    }
  }

  console.log("\n[GitHub] Scrape complete.");
}

void main();
