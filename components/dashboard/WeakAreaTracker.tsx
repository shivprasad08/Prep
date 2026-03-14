"use client";

import { useEffect, useState } from "react";

type WeakArea = {
  id: string;
  topic: string;
  frequency: number;
  lastSeen: string;
};

function frequencyClass(frequency: number) {
  if (frequency >= 6) {
    return "border-red-700 bg-red-950/70 text-red-300";
  }
  if (frequency >= 3) {
    return "border-amber-700 bg-amber-950/70 text-amber-300";
  }
  return "border-zinc-700 bg-zinc-800 text-zinc-300";
}

export function WeakAreaTracker() {
  const [items, setItems] = useState<WeakArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadWeakAreas() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/weak-areas", { cache: "no-store" });
      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: Array<{
          id: string;
          topic: string;
          frequency: number;
          lastSeen: string;
        }>;
      };

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || "Failed to load weak areas");
      }

      setItems(
        [...json.data].sort((a, b) => b.frequency - a.frequency),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load weak areas",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWeakAreas();
  }, []);

  async function removeWeakArea(id: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));

    const response = await fetch(`/api/weak-areas/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setItems(previous);
      setError("Failed to delete weak area");
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Weak Area Tracker</h2>
        <button
          type="button"
          onClick={() => void loadWeakAreas()}
          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mb-3 rounded-md border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-zinc-400">Loading weak areas...</p> : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-6 text-center">
          <p className="text-sm text-zinc-300">No weak areas tracked yet.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Start a mock interview to track your weak spots.
          </p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-100">{item.topic}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Last seen {new Date(item.lastSeen).toLocaleString()}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${frequencyClass(item.frequency)}`}
                >
                  {item.frequency} {item.frequency === 1 ? "time" : "times"}
                </span>
                <button
                  type="button"
                  onClick={() => void removeWeakArea(item.id)}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition hover:border-red-700 hover:bg-red-950/70 hover:text-red-300"
                  aria-label={`Delete ${item.topic}`}
                >
                  X
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
