"use client";

import { useCallback, useEffect, useState } from "react";

type DocumentType = "resume" | "company_info" | "pyq" | "interview_experience";

type DocumentItem = {
  id: string;
  title: string;
  type: DocumentType;
  company: string | null;
  fileUrl: string;
  uploadedAt: string;
};

const typeLabelMap: Record<DocumentType, string> = {
  resume: "Resume",
  company_info: "Company Info",
  pyq: "Past Interview Questions",
  interview_experience: "Interview Experience",
};

const typeColorMap: Record<DocumentType, string> = {
  resume: "border-violet-700/80 bg-violet-950/60 text-violet-300",
  company_info: "border-blue-700/80 bg-blue-950/60 text-blue-300",
  pyq: "border-amber-700/80 bg-amber-950/60 text-amber-300",
  interview_experience: "border-emerald-700/80 bg-emerald-950/60 text-emerald-300",
};

export function DocumentList() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/documents", { cache: "no-store" });
      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: DocumentItem[];
      };

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || "Failed to load documents");
      }

      setItems(json.data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load documents",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    function handleRefresh() {
      void fetchDocuments();
    }

    window.addEventListener("documents:refresh", handleRefresh);
    return () => window.removeEventListener("documents:refresh", handleRefresh);
  }, [fetchDocuments]);

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Delete failed");
      }

      setItems((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete document",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Uploaded Documents</h2>
        <button
          type="button"
          onClick={() => void fetchDocuments()}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-800/80 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-400">Loading documents...</p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-6 text-center">
          <p className="text-sm text-zinc-400">No documents uploaded yet.</p>
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex size-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {item.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${typeColorMap[item.type]}`}
                    >
                      {typeLabelMap[item.type]}
                    </span>
                    {item.company ? (
                      <span className="text-xs text-zinc-400">{item.company}</span>
                    ) : null}
                    <span className="text-xs text-zinc-500">
                      {new Date(item.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="rounded-md border border-red-800/70 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deletingId === item.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
