import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { weakAreas } from "@/db/schema";
import { db } from "@/lib/db";

/**
 * Deletes a weak area record belonging to the authenticated user.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await db.query.weakAreas.findFirst({
      where: and(eq(weakAreas.id, id), eq(weakAreas.userId, userId)),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Weak area not found" },
        { status: 404 },
      );
    }

    await db.delete(weakAreas).where(eq(weakAreas.id, id));

    return NextResponse.json({ success: true, message: "Weak area deleted" });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to delete weak area" },
      { status: 500 },
    );
  }
}
