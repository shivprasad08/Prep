import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chats } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Returns the last 5 sessions with summary information for dashboard widgets.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await db
      .select()
      .from(chats)
      .where(and(eq(chats.userId, userId)))
      .orderBy(desc(chats.createdAt));

    const sessions = new Map<
      string,
      {
        session_id: string;
        mode: "mock_interview" | "resume_review" | "company_prep" | "pyq";
        first_message: string;
        message_count: number;
        created_at: Date;
      }
    >();

    for (const row of raw) {
      const key = row.sessionId;
      const existing = sessions.get(key);

      if (!existing) {
        sessions.set(key, {
          session_id: row.sessionId,
          mode: row.mode,
          first_message: row.content,
          message_count: 1,
          created_at: row.createdAt,
        });
      } else {
        existing.message_count += 1;

        // Keep oldest message as preview.
        if (row.createdAt < existing.created_at) {
          existing.created_at = row.createdAt;
          existing.first_message = row.content;
          existing.mode = row.mode;
        }
      }
    }

    const result = Array.from(sessions.values())
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, 5)
      .map((session) => ({
        ...session,
        first_message:
          session.first_message.length > 60
            ? `${session.first_message.slice(0, 60)}...`
            : session.first_message,
      }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to load recent sessions" },
      { status: 500 },
    );
  }
}
