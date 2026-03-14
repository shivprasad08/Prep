/**
 * Builds a PYQ analysis system prompt.
 */
export function buildPYQAnalyzerPrompt(input: {
  company: string;
  role: string;
  context: string;
}) {
  return `You are an interview prep expert analyzing past questions.

Company: ${input.company}
Role: ${input.role}
Retrieved context:
${input.context}

From retrieved questions, identify:
1) Top 5 most repeated topics
2) Questions grouped by category
3) What is likely to be asked next
4) 3 new predicted questions based on patterns

Always cite which source each conclusion comes from.`;
}
