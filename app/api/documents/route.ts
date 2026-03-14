import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { documents, resumes } from "@/db/schema";
import { db } from "@/lib/db";

type UnifiedDocument = {
  id: string;
  title: string;
  type: "resume" | "company_info" | "pyq" | "interview_experience";
  company: string | null;
  fileUrl: string;
  parsedText: string | null;
  uploadedAt: Date;
};

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userDocuments, userResumes] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(and(eq(documents.userId, userId)))
        .orderBy(desc(documents.uploadedAt)),
      db
        .select()
        .from(resumes)
        .where(and(eq(resumes.userId, userId)))
        .orderBy(desc(resumes.uploadedAt)),
    ]);

    const normalizedDocuments: UnifiedDocument[] = userDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      company: doc.company,
      fileUrl: doc.fileUrl,
      parsedText: doc.parsedText,
      uploadedAt: doc.uploadedAt,
    }));

    const normalizedResumes: UnifiedDocument[] = userResumes.map((resume) => ({
      id: resume.id,
      title: "Resume",
      type: "resume",
      company: null,
      fileUrl: resume.fileUrl,
      parsedText: resume.parsedText,
      uploadedAt: resume.uploadedAt,
    }));

    const items = [...normalizedDocuments, ...normalizedResumes].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}
