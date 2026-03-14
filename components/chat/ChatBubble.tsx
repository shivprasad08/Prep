"use client";

type ChatBubbleProps = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyInlineMarkdown(input: string) {
  return input
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-900 px-1 py-0.5 text-xs">$1</code>');
}

function renderMarkdown(content: string) {
  const escaped = escapeHtml(content);

  const codeBlocks: string[] = [];
  const codeTokenized = escaped.replace(/```([\s\S]*?)```/g, (_, block: string) => {
    const index = codeBlocks.push(block.trim()) - 1;
    return `__CODE_BLOCK_${index}__`;
  });

  const lines = codeTokenized.split("\n");
  const html: string[] = [];

  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      closeLists();
      html.push('<div class="h-2"></div>');
      continue;
    }

    if (line.startsWith("__CODE_BLOCK_") && line.endsWith("__")) {
      closeLists();
      const index = Number(line.replace(/[^0-9]/g, ""));
      const code = codeBlocks[index] ?? "";
      html.push(
        `<pre class="overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs"><code>${code}</code></pre>`,
      );
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (!inUl) {
        closeLists();
        inUl = true;
        html.push('<ul class="list-disc space-y-1 pl-5">');
      }

      html.push(`<li>${applyInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inOl) {
        closeLists();
        inOl = true;
        html.push('<ol class="list-decimal space-y-1 pl-5">');
      }

      html.push(`<li>${applyInlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p>${applyInlineMarkdown(line)}</p>`);
  }

  closeLists();

  return html.join("");
}

export function ChatBubble({
  role,
  content,
  timestamp,
  isStreaming = false,
}: ChatBubbleProps) {
  const isUser = role === "user";
  const formattedTime = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <span className="mb-1 text-xs text-zinc-400">
          {isUser ? "You" : "PlacementGPT"}
        </span>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-purple-700 text-white"
              : "bg-zinc-800 text-zinc-100"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap wrap-break-word">{content}</p>
          ) : (
            <div
              className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap wrap-break-word"
              dangerouslySetInnerHTML={{
                __html:
                  renderMarkdown(content) +
                  (isStreaming
                    ? '<span class="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-purple-400 align-middle"></span>'
                    : ""),
              }}
            />
          )}
        </div>
        <span className="mt-1 text-[10px] text-zinc-500">{formattedTime}</span>
      </div>
    </div>
  );
}
