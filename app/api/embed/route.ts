import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { addDocuments, type ChunkMetadata } from "@/lib/chromadb";
import { chunkText } from "@/lib/rag";

type EmbedRequestBody = {
  documentId?: string;
  parsedText?: string;
  title?: string;
  type?: "resume" | "company_info" | "pyq" | "interview_experience";
  company?: string | null;
};

/**
 * Chunks parsed text and stores chunk embeddings in the current user's Chroma collection.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as EmbedRequestBody;
    const { documentId, parsedText, title, type, company = null } = body;

    if (!documentId || !parsedText || !title || !type) {
      return NextResponse.json(
        {
          error:
            "documentId, parsedText, title, and type are required fields",
        },
        { status: 400 },
      );
    }

    const chunks = chunkText(parsedText, 500, 50);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No valid text chunks generated for embedding" },
        { status: 400 },
      );
    }

    const metadata: ChunkMetadata[] = chunks.map((_, index) => ({
      documentId,
      title,
      type,
      company,
      chunkIndex: index,
    }));

    const ids = chunks.map((_, index) => `${documentId}_${index}`);

    await addDocuments(userId, chunks, metadata, ids);

    return NextResponse.json({
      success: true,
      chunksStored: chunks.length,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to create embeddings" },
      { status: 500 },
    );
  }
}
