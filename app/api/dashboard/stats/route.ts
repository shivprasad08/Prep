import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chats, documents, resumes, weakAreas } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Returns aggregate dashboard stats for the authenticated user.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      sessionsResult,
      documentsResult,
      resumesResult,
      messagesResult,
      weakAreasResult,
      modeResult,
      lastActiveResult,
    ] = await Promise.all([
      db
        .select({
          count: sql<number>`count(distinct ${chats.sessionId})`,
        })
        .from(chats)
        .where(and(eq(chats.userId, userId))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(and(eq(documents.userId, userId))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(resumes)
        .where(and(eq(resumes.userId, userId))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(chats)
        .where(and(eq(chats.userId, userId), eq(chats.role, "user"))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(weakAreas)
        .where(and(eq(weakAreas.userId, userId))),
      db
        .select({
          mode: chats.mode,
          modeCount: sql<number>`count(*)`,
        })
        .from(chats)
        .where(and(eq(chats.userId, userId)))
        .groupBy(chats.mode)
        .orderBy(sql`count(*) desc`)
        .limit(1),
      db
        .select({ lastActive: sql<Date | null>`max(${chats.createdAt})` })
        .from(chats)
        .where(and(eq(chats.userId, userId))),
    ]);

    const totalDocuments =
      Number(documentsResult[0]?.count ?? 0) + Number(resumesResult[0]?.count ?? 0);

    return NextResponse.json({
      total_sessions: Number(sessionsResult[0]?.count ?? 0),
      total_documents: totalDocuments,
      total_messages: Number(messagesResult[0]?.count ?? 0),
      weak_areas_count: Number(weakAreasResult[0]?.count ?? 0),
      most_used_mode: modeResult[0]?.mode ?? null,
      last_active: lastActiveResult[0]?.lastActive ?? null,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 },
    );
  }
}
