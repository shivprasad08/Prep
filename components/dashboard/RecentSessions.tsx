"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ChatMode = "mock_interview" | "resume_review" | "company_prep" | "pyq";

type SessionSummary = {
  session_id: string;
  mode: ChatMode;
  first_message: string;
  message_count: number;
  created_at: string;
};

const modeStyles: Record<ChatMode, string> = {
  mock_interview: "border-purple-700 bg-purple-950/70 text-purple-300",
  resume_review: "border-blue-700 bg-blue-950/70 text-blue-300",
  company_prep: "border-amber-700 bg-amber-950/70 text-amber-300",
  pyq: "border-green-700 bg-green-950/70 text-green-300",
};

const modeLabels: Record<ChatMode, string> = {
  mock_interview: "Mock Interview",
  resume_review: "Resume Review",
  company_prep: "Company Prep",
  pyq: "PYQ Analyzer",
};

export function RecentSessions() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/dashboard/sessions", {
          cache: "no-store",
        });
        const json = (await response.json()) as {
          success?: boolean;
          error?: string;
          data?: SessionSummary[];
        };

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || "Failed to load sessions");
        }

        setSessions(json.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load sessions",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSessions();
  }, []);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-white">Recent Sessions</h2>

      {error ? (
        <p className="mb-3 rounded-md border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-zinc-400">Loading sessions...</p> : null}

      {!loading && sessions.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-6 text-center">
          <p className="text-sm text-zinc-300">No sessions yet. Start your first session.</p>
        </div>
      ) : null}

      {!loading && sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.session_id}
              type="button"
              onClick={() =>
                router.push(
                  `/chat?sessionId=${encodeURIComponent(session.session_id)}&mode=${session.mode}`,
                )
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-3 text-left transition hover:border-zinc-600 hover:bg-zinc-900"
            >
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${modeStyles[session.mode]}`}
              >
                {modeLabels[session.mode]}
              </span>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-200">
                {session.first_message}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {session.message_count} messages • {new Date(session.created_at).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
