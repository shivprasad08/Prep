"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CompanyRoleSelector } from "@/components/chat/CompanyRoleSelector";
import { ModeSelector } from "@/components/chat/ModeSelector";

type ChatMode = "mock_interview" | "resume_review" | "company_prep" | "pyq";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type HistoryItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: ChatMode;
  created_at: string;
};

const SESSION_STORAGE_KEY = "placementgpt_chat_session_id";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeMode, setActiveMode] = useState<ChatMode>("mock_interview");
  const [company, setCompany] = useState("Google");
  const [role, setRole] = useState("Software Engineer");
  const [sessionId, setSessionId] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionReady = useMemo(() => Boolean(sessionId), [sessionId]);

  useEffect(() => {
    const requestedMode = searchParams.get("mode") as ChatMode | null;
    const requestedSessionId = searchParams.get("sessionId");

    if (
      requestedMode &&
      ["mock_interview", "resume_review", "company_prep", "pyq"].includes(requestedMode)
    ) {
      setActiveMode(requestedMode);
    }

    if (requestedSessionId) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, requestedSessionId);
      setSessionId(requestedSessionId);
      return;
    }

    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      setSessionId(existing);
      return;
    }

    const generated = uuidv4();
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    setSessionId(generated);
  }, [searchParams]);

  useEffect(() => {
    async function fetchHistory() {
      if (!sessionReady) {
        return;
      }

      try {
        setError(null);
        const response = await fetch(
          `/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" },
        );

        const json = (await response.json()) as {
          success?: boolean;
          error?: string;
          data?: HistoryItem[];
        };

        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error || "Failed to load chat history");
        }

        setMessages(
          json.data.map((item) => ({
            id: item.id,
            role: item.role,
            content: item.content,
            timestamp: item.created_at,
          })),
        );
      } catch (historyError) {
        setError(
          historyError instanceof Error
            ? historyError.message
            : "Failed to load chat history",
        );
      }
    }

    void fetchHistory();
  }, [sessionId, sessionReady]);

  async function sendMessage(messageText: string) {
    if (!sessionReady || isStreaming) {
      return;
    }

    setError(null);
    setIsStreaming(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          mode: activeMode,
          company,
          role,
          sessionId,
        }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Failed to stream response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((current) =>
          current.map((item) =>
            item.id === assistantMessageId
              ? { ...item, content: assistantContent }
              : item,
          ),
        );
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Message send failed",
      );

      setMessages((current) =>
        current.filter((item) => item.id !== assistantMessageId),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <section className="flex h-[calc(100vh-9rem)] min-h-0 flex-col gap-4">
      <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />

      <CompanyRoleSelector
        mode={activeMode}
        company={company}
        role={role}
        onCompanyChange={setCompany}
        onRoleChange={setRole}
      />

      {error ? (
        <p className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        onExamplePromptClick={(prompt) => void sendMessage(prompt)}
      />

      <ChatInput onSend={sendMessage} isLoading={isStreaming} />
    </section>
  );
}