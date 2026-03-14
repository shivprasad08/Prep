import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { runIngestion } from "../../../../scripts/ingest";

export const runtime = "nodejs";

type IngestBody = {
  source?: "gfg" | "ambitionbox" | "github";
  company?: string;
  adminKey?: string;
};

/**
 * Triggers global data ingestion with streaming logs, protected by admin secret.
 */
export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET_KEY;

  if (!secret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET_KEY is not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as IngestBody;
  const keyFromHeader = request.headers.get("x-admin-key");
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  const providedKey = keyFromHeader || bearer || body.adminKey;

  if (providedKey !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (line: string) => controller.enqueue(encoder.encode(`${line}\n`));

      push("[Admin] Ingestion started...");

      runIngestion(
        {
          source: body.source,
          company: body.company?.toLowerCase(),
        },
        push,
      )
        .then((summary) => {
          push(
            `[Admin] Completed. documents=${summary.documentsIngested}, chunks=${summary.totalChunksStored}`,
          );
          controller.close();
        })
        .catch((error) => {
          Sentry.captureException(error);
          push(`[Admin][ERROR] ${String(error)}`);
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
