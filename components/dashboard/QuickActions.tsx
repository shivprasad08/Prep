"use client";

import { useRouter } from "next/navigation";

type ActionItem = {
  mode: "mock_interview" | "resume_review" | "company_prep" | "pyq";
  title: string;
  description: string;
  icon: string;
  accent: string;
};

const actions: ActionItem[] = [
  {
    mode: "mock_interview",
    title: "Start Mock Interview",
    description: "Practice real interview rounds with targeted feedback.",
    icon: "MI",
    accent: "border-purple-700 bg-purple-950/70 text-purple-300",
  },
  {
    mode: "resume_review",
    title: "Review My Resume",
    description: "Get strict ATS and recruiter-style resume feedback.",
    icon: "RR",
    accent: "border-blue-700 bg-blue-950/70 text-blue-300",
  },
  {
    mode: "company_prep",
    title: "Prep for a Company",
    description: "Prepare for company-specific rounds and expectations.",
    icon: "CP",
    accent: "border-amber-700 bg-amber-950/70 text-amber-300",
  },
  {
    mode: "pyq",
    title: "Analyze Past Questions",
    description: "Find repeated patterns and likely upcoming questions.",
    icon: "PYQ",
    accent: "border-green-700 bg-green-950/70 text-green-300",
  },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <h2 className="mb-3 text-base font-semibold text-white">Quick Actions</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.mode}
            type="button"
            onClick={() => router.push(`/chat?mode=${action.mode}`)}
            className="group flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left transition hover:border-zinc-600 hover:bg-zinc-900"
          >
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border text-xs font-semibold ${action.accent}`}
              >
                {action.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-100">{action.title}</p>
                <p className="mt-1 text-xs text-zinc-400">{action.description}</p>
              </div>
            </div>
            <span className="text-zinc-500 transition group-hover:text-zinc-300">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}
