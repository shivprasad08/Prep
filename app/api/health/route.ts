import axios from "axios";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { db } from "@/lib/db";
import { checkVectorStoreConnection } from "@/lib/chromadb";

export const runtime = "nodejs";

/**
 * Returns deployment health for core dependencies.
 */
export async function GET() {
  const services: {
    database: "ok" | "error";
    vectordb: "ok" | "error";
    groq: "ok" | "error";
  } = {
    database: "error",
    vectordb: "error",
    groq: "error",
  };

  try {
    await db.execute(sql`select 1`);
    services.database = "ok";
  } catch (error) {
    Sentry.captureException(error);
  }

  try {
    await checkVectorStoreConnection();
    services.vectordb = "ok";
  } catch (error) {
    Sentry.captureException(error);
  }

  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      );

      if (response.status >= 200 && response.status < 300) {
        services.groq = "ok";
      }
    }
  } catch (error) {
    Sentry.captureException(error);
  }

  const healthyCount = Object.values(services).filter((value) => value === "ok").length;

  const status = healthyCount === 3 ? "ok" : healthyCount > 0 ? "degraded" : "down";

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    services,
  });
}
