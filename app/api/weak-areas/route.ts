import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { weakAreas } from "@/db/schema";
import { db } from "@/lib/db";

type WeakAreaBody = {
  topic?: string;
};

/**
 * Returns all weak areas for the authenticated user.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(weakAreas)
      .where(and(eq(weakAreas.userId, userId)))
      .orderBy(desc(weakAreas.frequency));

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch weak areas" },
      { status: 500 },
    );
  }
}

/**
 * Creates or increments a weak area for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as WeakAreaBody;
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const existing = await db.query.weakAreas.findFirst({
      where: and(eq(weakAreas.userId, userId), eq(weakAreas.topic, topic)),
    });

    if (existing) {
      const [updated] = await db
        .update(weakAreas)
        .set({
          frequency: existing.frequency + 1,
          lastSeen: new Date(),
        })
        .where(and(eq(weakAreas.id, existing.id), eq(weakAreas.userId, userId)))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    const [created] = await db
      .insert(weakAreas)
      .values({
        userId,
        topic,
        frequency: 1,
      })
      .returning();

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to upsert weak area" },
      { status: 500 },
    );
  }
}
