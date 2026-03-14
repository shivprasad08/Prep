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

type AmbitionBoxRecord = {
  company: string;
  title: string;
  content: string;
  url: string;
  source: "ambitionbox";
  scraped_at: string;
};

async function scrapeCompany(company: string) {
  const slug = slugifyCompany(company);
  const seedUrls = [
    `https://www.ambitionbox.com/interviews/${slug}-interview-questions`,
    `https://www.ambitionbox.com/search?query=${encodeURIComponent(
      `${company} interview questions`,
    )}`,
  ];

  const articleUrls = new Set<string>();

  for (const seedUrl of seedUrls) {
    const html = await fetchHtml(seedUrl);
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

      const absolute = href.startsWith("http")
        ? href
        : `https://www.ambitionbox.com${href}`;
      const lower = absolute.toLowerCase();

      if (
        lower.includes("ambitionbox.com") &&
        lower.includes("interview") &&
        (lower.includes(slug) || lower.includes(company.toLowerCase()))
      ) {
        articleUrls.add(absolute.split("#")[0]);
      }
    });
  }

  const records: AmbitionBoxRecord[] = [];

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
        $("main").text(),
        $("article").text(),
        $(".companyInterviews").text(),
        $(".interviewQuestions").text(),
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
        source: "ambitionbox",
        scraped_at: new Date().toISOString(),
      });

      console.log(`[AmbitionBox] Scraped: ${title}`);
    } catch (error) {
      console.warn(`[AmbitionBox] Failed to scrape ${url}`, error);
    }
  }

  const outputPath = path.join(
    process.cwd(),
    "data",
    "raw",
    "ambitionbox",
    `${toFileSafeName(company)}.json`,
  );

  await writeJson(outputPath, records);
  console.log(`[AmbitionBox] Saved ${records.length} records for ${company}`);
}

async function main() {
  for (const company of TARGET_COMPANIES) {
    console.log(`\n[AmbitionBox] Processing ${company}...`);
    try {
      await scrapeCompany(company);
    } catch (error) {
      console.warn(`[AmbitionBox] Company scrape failed for ${company}`, error);
    }
  }

  console.log("\n[AmbitionBox] Scrape complete.");
}

void main();
