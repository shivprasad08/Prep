import { auth, currentUser } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

import { documents, resumes, users } from "@/db/schema";
import { db } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const VALID_TYPES = [
  "resume",
  "company_info",
  "pyq",
  "interview_experience",
] as const;

type UploadType = (typeof VALID_TYPES)[number];

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      const clerkUser = await currentUser();
      const primaryEmail = clerkUser?.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress;

      if (!primaryEmail) {
        return NextResponse.json(
          { error: "Unable to resolve user email. Please sign in again." },
          { status: 400 },
        );
      }

      await db
        .insert(users)
        .values({
          id: userId,
          email: primaryEmail,
          name: clerkUser?.fullName || clerkUser?.username || null,
        })
        .onConflictDoNothing({ target: users.id });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const title = (formData.get("title") as string | null)?.trim();
    const type = (formData.get("type") as UploadType | null)?.trim() as
      | UploadType
      | undefined;
    const company = (formData.get("company") as string | null)?.trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Document title is required" },
        { status: 400 },
      );
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 },
      );
    }

    if (type !== "resume" && !company) {
      return NextResponse.json(
        { error: "Company name is required for non-resume documents" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let parsedText = "";
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const parsedPdf = await parser.getText();
      parsedText = (parsedPdf.text || "").trim();
      await parser.destroy();
    } catch (error) {
      Sentry.captureException(error);
      return NextResponse.json(
        { error: "Failed to parse PDF content" },
        { status: 400 },
      );
    }

    const filename = `${Date.now()}-${file.name}`;
    const fileUrl = await uploadToCloudinary(fileBuffer, filename);

    if (type === "resume") {
      const [savedResume] = await db
        .insert(resumes)
        .values({
          userId,
          fileUrl,
          parsedText,
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: {
          ...savedResume,
          title,
          type: "resume",
          company: null,
        },
      });
    }

    const [savedDocument] = await db
      .insert(documents)
      .values({
        userId,
        title,
        type,
        company,
        fileUrl,
        parsedText,
      })
      .returning();

    return NextResponse.json({ success: true, data: savedDocument });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
