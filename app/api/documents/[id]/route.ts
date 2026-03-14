import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { documents, resumes } from "@/db/schema";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [existingDocument, existingResume] = await Promise.all([
      db.query.documents.findFirst({
        where: and(eq(documents.id, id), eq(documents.userId, userId)),
      }),
      db.query.resumes.findFirst({
        where: and(eq(resumes.id, id), eq(resumes.userId, userId)),
      }),
    ]);

    if (!existingDocument && !existingResume) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (existingDocument) {
      await db.delete(documents).where(eq(documents.id, id));
    } else if (existingResume) {
      await db.delete(resumes).where(eq(resumes.id, id));
    }

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
