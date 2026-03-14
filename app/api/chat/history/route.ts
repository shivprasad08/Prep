import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chats } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Returns chat history for a session or latest message from the last 5 sessions.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      const messages = await db
        .select({
          id: chats.id,
          role: chats.role,
          content: chats.content,
          mode: chats.mode,
          created_at: chats.createdAt,
        })
        .from(chats)
        .where(and(eq(chats.userId, userId), eq(chats.sessionId, sessionId)))
        .orderBy(asc(chats.createdAt));

      return NextResponse.json({ success: true, data: messages });
    }

    const latestBySession = await db.execute(sql`
      SELECT DISTINCT ON (session_id)
        id,
        role,
        content,
        mode,
        created_at
      FROM chats
      WHERE user_id = ${userId}
      ORDER BY session_id, created_at DESC
      LIMIT 5
    `);

    const sorted = [...latestBySession.rows].sort(
      (a, b) =>
        new Date(String(a.created_at)).getTime() -
        new Date(String(b.created_at)).getTime(),
    );

    return NextResponse.json({ success: true, data: sorted });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 },
    );
  }
}
