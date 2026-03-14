import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";

import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { WeakAreaTracker } from "@/components/dashboard/WeakAreaTracker";
import { chats, documents, resumes, weakAreas } from "@/db/schema";
import { db } from "@/lib/db";

async function getDashboardStats(userId: string) {
  const [sessionsResult, documentsResult, resumesResult, messagesResult, weakAreasResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(distinct ${chats.sessionId})` })
        .from(chats)
        .where(and(eq(chats.userId, userId))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(and(eq(documents.userId, userId))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(resumes)
        .where(and(eq(resumes.userId, userId))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(chats)
        .where(and(eq(chats.userId, userId), eq(chats.role, "user"))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(weakAreas)
        .where(and(eq(weakAreas.userId, userId))),
    ]);

  return {
    totalSessions: Number(sessionsResult[0]?.count ?? 0),
    totalDocuments:
      Number(documentsResult[0]?.count ?? 0) + Number(resumesResult[0]?.count ?? 0),
    totalMessages: Number(messagesResult[0]?.count ?? 0),
    weakAreasCount: Number(weakAreasResult[0]?.count ?? 0),
  };
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  const stats = userId ? await getDashboardStats(userId) : null;

  const displayName =
    user?.firstName || user?.fullName || user?.username || "Student";

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
          Here is your placement prep summary
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard
          title="Total Sessions"
          value={stats?.totalSessions ?? 0}
          subtitle="Interview sessions completed"
          icon="S"
          accentColor="border border-purple-700 bg-purple-950/70 text-purple-300"
        />
        <StatsCard
          title="Documents Uploaded"
          value={stats?.totalDocuments ?? 0}
          subtitle="Resume and prep material"
          icon="D"
          accentColor="border border-blue-700 bg-blue-950/70 text-blue-300"
        />
        <StatsCard
          title="Messages Sent"
          value={stats?.totalMessages ?? 0}
          subtitle="User messages in chat"
          icon="M"
          accentColor="border border-amber-700 bg-amber-950/70 text-amber-300"
        />
        <StatsCard
          title="Weak Areas Found"
          value={stats?.weakAreasCount ?? 0}
          subtitle="Topics needing extra focus"
          icon="W"
          accentColor="border border-red-700 bg-red-950/70 text-red-300"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <WeakAreaTracker />
        </div>
        <div className="lg:col-span-2">
          <RecentSessions />
        </div>
      </div>

      <QuickActions />
    </section>
  );
}