import * as cheerio from "cheerio";
import path from "path";

import {
  TARGET_COMPANIES,
  delay,
  fetchHtml,
  slugifyCompany,
  toFileSafeName,
  writeJson,
} from "./common";

type GfgRecord = {
  company: string;
  title: string;
  content: string;
  url: string;
  source: "gfg";
  scraped_at: string;
};

async function scrapeCompany(company: string) {
  const slug = slugifyCompany(company);
  const indexUrls = [
    `https://www.geeksforgeeks.org/tag/${slug}-interview-experiences/`,
    `https://www.geeksforgeeks.org/${slug}-interview-experience/`,
  ];

  const articleUrls = new Set<string>();

  for (const indexUrl of indexUrls) {
    const html = await fetchHtml(indexUrl);
    await delay(2000);

    if (!html) {
      continue;
    }

    const $ = cheerio.load(html);

    $("a[href]").each((_index: number, el) => {
      const href = $(el).attr("href");
      if (!href) {
        return;
      }

      const absolute = href.startsWith("http") ? href : `https://www.geeksforgeeks.org${href}`;
      const lower = absolute.toLowerCase();

      if (
        lower.includes("geeksforgeeks.org") &&
        (lower.includes("interview") || lower.includes("placement"))
      ) {
        articleUrls.add(absolute.split("#")[0]);
      }
    });
  }

  const records: GfgRecord[] = [];

  for (const url of Array.from(articleUrls).slice(0, 20)) {
    try {
      const html = await fetchHtml(url);
      await delay(2000);

      if (!html) {
        continue;
      }

      const $ = cheerio.load(html);
      const title = $("h1").first().text().trim() || `${company} interview`;
      const content = [
        $("article").text(),
        $(".post-content").text(),
        $(".entry-content").text(),
      ]
        .join("\n")
        .replace(/\s+/g, " ")
        .trim();

      if (!content) {
        continue;
      }

      records.push({
        company,
        title,
        content,
        url,
        source: "gfg",
        scraped_at: new Date().toISOString(),
      });

      console.log(`[GFG] Scraped: ${title}`);
    } catch (error) {
      console.warn(`[GFG] Failed to scrape ${url}`, error);
    }
  }

  const outputPath = path.join(
    process.cwd(),
    "data",
    "raw",
    "gfg",
    `${toFileSafeName(company)}.json`,
  );

  await writeJson(outputPath, records);
  console.log(`[GFG] Saved ${records.length} records for ${company}`);
}

async function main() {
  for (const company of TARGET_COMPANIES) {
    console.log(`\n[GFG] Processing ${company}...`);
    try {
      await scrapeCompany(company);
    } catch (error) {
      console.warn(`[GFG] Company scrape failed for ${company}`, error);
    }
  }

  console.log("\n[GFG] Scrape complete.");
}

void main();
