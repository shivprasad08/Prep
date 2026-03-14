import type { ReactNode } from "react";

type StatsCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  accentColor: string;
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
}: StatsCardProps) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {title}
          </p>
        </div>
        <span
          className={`inline-flex size-8 items-center justify-center rounded-md text-sm ${accentColor}`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
    </article>
  );
}
