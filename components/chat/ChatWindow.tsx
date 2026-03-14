"use client";

import { useEffect, useRef } from "react";

import { ChatBubble } from "@/components/chat/ChatBubble";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type ChatWindowProps = {
  messages: Message[];
  isStreaming: boolean;
  onExamplePromptClick: (prompt: string) => void;
};

const examplePrompts = [
  "Quiz me on arrays and graphs for Google",
  "Review my resume for a backend role",
  "What did people ask in TCS interviews last year?",
];

export function ChatWindow({
  messages,
  isStreaming,
  onExamplePromptClick,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isStreaming]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4"
    >
      {messages.length === 0 ? (
        <div className="flex h-full min-h-70 flex-col items-center justify-center px-4 text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300">
            AI
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Select a mode and start your session
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Try one of these prompts to get started quickly.
          </p>

          <div className="mt-4 grid w-full max-w-2xl gap-2">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onExamplePromptClick(prompt)}
                className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-4 py-2 text-left text-sm text-zinc-200 transition hover:border-violet-500 hover:bg-zinc-900"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatBubble
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              isStreaming={
                isStreaming &&
                index === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
