import { auth, currentUser } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { chats, resumes, weakAreas } from "@/db/schema";
import { db } from "@/lib/db";
import { hybridRagPipeline } from "@/lib/globalRag";
import { streamResponse } from "@/lib/groq";
import { buildCompanyPrepPrompt } from "@/prompts/companyPrep";
import { buildMockInterviewPrompt } from "@/prompts/mockInterview";
import { buildPYQAnalyzerPrompt } from "@/prompts/pyqAnalyzer";
import { buildResumeReviewPrompt } from "@/prompts/resumeReview";

export const runtime = "nodejs";

type ChatMode = "mock_interview" | "resume_review" | "company_prep" | "pyq";

type ChatRequestBody = {
  message?: string;
  mode?: ChatMode;
  company?: string;
  role?: string;
  sessionId?: string;
};

function ensureUuid(sessionId?: string) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (sessionId && uuidRegex.test(sessionId)) {
    return sessionId;
  }

  return crypto.randomUUID();
}

const weakAreaSignals = [
  "you missed",
  "incorrect",
  "wrong",
  "you should have mentioned",
  "the correct answer",
  "common mistake",
  "don't forget",
];

function shouldTrackWeakArea(text: string) {
  const lower = text.toLowerCase();
  return weakAreaSignals.some((signal) => lower.includes(signal));
}

function extractWeakAreaTopic(input: {
  userMessage: string;
  context: string;
  assistantText: string;
}) {
  const userWords = input.userMessage
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const candidateKeywords = [
    "array",
    "arrays",
    "string",
    "graph",
    "graphs",
    "tree",
    "dp",
    "dynamic",
    "sql",
    "database",
    "system",
    "design",
    "oops",
    "os",
    "network",
    "api",
    "javascript",
    "react",
    "node",
    "python",
    "java",
  ];

  const matchedKeyword = candidateKeywords.find((keyword) =>
    userWords.includes(keyword),
  );

  if (matchedKeyword) {
    return matchedKeyword;
  }

  const contextLine = input.context
    .split("\n")
    .find((line) => line.toLowerCase().includes("chunk"));

  if (contextLine) {
    return contextLine.replace(/---/g, "").trim().slice(0, 80);
  }

  return input.assistantText.split("\n")[0].slice(0, 80) || "General concepts";
}

/**
 * Runs retrieval-augmented chat and streams model output while persisting chat history.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ChatRequestBody;
    const {
      message,
      mode,
      company = "Target Company",
      role = "Software Engineer",
    } = body;
    const sessionId = ensureUuid(body.sessionId);
    const weakAreaEndpoint = new URL("/api/weak-areas", request.url).toString();
    const cookieHeader = request.headers.get("cookie") || "";

    if (!message || !mode) {
      return NextResponse.json(
        { error: "message and mode are required" },
        { status: 400 },
      );
    }

    const selectedCompany =
      mode === "company_prep" || mode === "pyq" ? company : undefined;

    const [retrieval, resumeRecord, weakTopicRows, clerkUser] = await Promise.all([
      hybridRagPipeline(userId, message, selectedCompany, 5),
      db
        .select()
        .from(resumes)
        .where(and(eq(resumes.userId, userId)))
        .orderBy(desc(resumes.uploadedAt))
        .limit(1),
      db
        .select()
        .from(weakAreas)
        .where(and(eq(weakAreas.userId, userId)))
        .orderBy(desc(weakAreas.frequency))
        .limit(5),
      currentUser(),
    ]);

    const resumeSummary =
      resumeRecord[0]?.parsedText?.slice(0, 2000) ||
      "No resume summary available yet.";

    const weakAreasSummary =
      weakTopicRows.map((item) => item.topic).join(", ") || "No weak areas tracked yet.";

    const userName =
      clerkUser?.firstName || clerkUser?.fullName || clerkUser?.username || "Candidate";

    let systemPrompt = "";

    if (mode === "mock_interview") {
      systemPrompt = buildMockInterviewPrompt({
        name: userName,
        company,
        resumeSummary,
        weakAreas: weakAreasSummary,
        context: retrieval.context,
      });
    } else if (mode === "resume_review") {
      systemPrompt = buildResumeReviewPrompt({
        resumeText: resumeSummary,
        jobDescription: message,
        context: retrieval.context,
      });
    } else if (mode === "company_prep") {
      systemPrompt = buildCompanyPrepPrompt({
        company,
        role,
        resumeSummary,
        context: retrieval.context,
      });
    } else {
      systemPrompt = buildPYQAnalyzerPrompt({
        company,
        role,
        context: retrieval.context,
      });
    }

    await db.insert(chats).values({
      userId,
      sessionId,
      role: "user",
      content: message,
      mode,
    });

    const result = streamResponse({
      systemPrompt,
      userMessage: message,
      context: retrieval.context,
      onFinish: async (text) => {
        try {
          const sourceSummary = retrieval.sources
            .map((source) => {
              const metadata = source.metadata as { title?: string } | null;
              return metadata?.title;
            })
            .filter(Boolean)
            .join(", ");

          const assistantContent = sourceSummary
            ? `${text}\n\nSources: ${sourceSummary}`
            : text;

          await db.insert(chats).values({
            userId,
            sessionId,
            role: "assistant",
            content: assistantContent,
            mode,
          });

          // Track weak areas silently after mock interview feedback responses.
          if (mode === "mock_interview" && shouldTrackWeakArea(assistantContent)) {
            const topic = extractWeakAreaTopic({
              userMessage: message,
              context: retrieval.context,
              assistantText: assistantContent,
            });

            await fetch(weakAreaEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                cookie: cookieHeader,
              },
              body: JSON.stringify({ topic }),
            }).catch(() => null);
          }
        } catch (saveError) {
          Sentry.captureException(saveError);
          console.error("Failed to save assistant message", saveError);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
