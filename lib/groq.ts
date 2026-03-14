import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export const groqModel = groq(modelName);

type StreamResponseInput = {
  systemPrompt: string;
  userMessage: string;
  context: string;
  onFinish?: (text: string) => Promise<void> | void;
};

/**
 * Streams a model response while injecting retrieved RAG context.
 */
export function streamResponse({
  systemPrompt,
  userMessage,
  context,
  onFinish,
}: StreamResponseInput) {
  const contextualSystemPrompt = `${systemPrompt}\n\nRetrieved context:\n${context}`;

  return streamText({
    model: groqModel,
    system: contextualSystemPrompt,
    prompt: userMessage,
    onFinish: async ({ text }) => {
      if (onFinish) {
        await onFinish(text);
      }
    },
  });
}
