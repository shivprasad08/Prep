"use client";

import { useRef, useState } from "react";

type ChatInputProps = {
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
};

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState("");

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) {
      return;
    }

    await onSend(trimmed);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div className="sticky bottom-0 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={async (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              await submit();
            }
          }}
          rows={1}
          disabled={isLoading}
          placeholder={isLoading ? "PlacementGPT is thinking..." : "Ask your question..."}
          className="min-h-10 flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isLoading || !value.trim()}
          className="h-10 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
