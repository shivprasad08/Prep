"use client";

import { useRef, useState } from "react";

type UploadType =
  | "resume"
  | "company_info"
  | "pyq"
  | "interview_experience";

type UploadedRecord = {
  id: string;
  title: string;
  type: UploadType;
  company: string | null;
  parsedText: string | null;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const typeOptions: Array<{ value: UploadType; label: string }> = [
  { value: "resume", label: "Resume" },
  { value: "company_info", label: "Company Info" },
  { value: "pyq", label: "Past Interview Questions" },
  { value: "interview_experience", label: "Interview Experience" },
];

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<UploadType>("resume");
  const [company, setCompany] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isNonResume = type !== "resume";

  function formatBytes(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }

  function validateAndSetFile(selectedFile: File | null) {
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setFile(null);
      setError("Only PDF files are allowed.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setError("File size must be 10MB or less.");
      return;
    }

    setFile(selectedFile);
  }

  function resetForm() {
    setFile(null);
    setTitle("");
    setType("resume");
    setCompany("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleUpload() {
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }

    if (isNonResume && !company.trim()) {
      setError("Please enter a company name.");
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim());
      formData.append("type", type);
      if (isNonResume) {
        formData.append("company", company.trim());
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: UploadedRecord;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error || "Upload failed");
      }

      if (json.data?.id && json.data.parsedText) {
        await fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: json.data.id,
            parsedText: json.data.parsedText,
            title: json.data.title,
            type: json.data.type,
            company: json.data.company,
          }),
        });
      }

      setSuccess("Document uploaded successfully.");
      resetForm();

      // Notify listeners (DocumentList) to refresh from API.
      window.dispatchEvent(new Event("documents:refresh"));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Upload PDF</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Upload your resume or preparation documents. Maximum file size: 10MB.
      </p>

      <div
        className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-violet-500 bg-violet-500/10"
            : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-500"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const droppedFile = event.dataTransfer.files?.[0] ?? null;
          validateAndSetFile(droppedFile);
        }}
      >
        <p className="text-sm text-zinc-300">Drag and drop your PDF here</p>
        <p className="mt-1 text-xs text-zinc-500">or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-md border border-zinc-600 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:bg-zinc-800"
        >
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => validateAndSetFile(event.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="mt-4 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-left text-sm text-zinc-200">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-xs text-zinc-400">{formatBytes(file.size)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-zinc-300">Document Title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Goldman Sachs OA Pattern"
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-300">Document Type</label>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as UploadType)}
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {isNonResume ? (
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Company Name</label>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Microsoft"
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500"
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-800/80 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-md border border-emerald-800/80 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleUpload}
        disabled={isUploading}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Uploading..." : "Upload Document"}
      </button>
    </section>
  );
}
