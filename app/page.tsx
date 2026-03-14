import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-violet-300">
          Placement Preparation Assistant
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          PlacementGPT
        </h1>
        <p className="mt-5 max-w-2xl text-base text-zinc-300 sm:text-lg">
          RAG-powered interview prep with personalized company insights, resume
          feedback, and mock interview practice.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          {!userId ? (
            <>
            <Link
              href="/sign-in"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-violet-600 px-6 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Get Started
            </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-violet-600 px-6 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
