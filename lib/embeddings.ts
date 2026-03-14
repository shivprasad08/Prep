import { pipeline } from "@xenova/transformers";

type FeatureExtractor = Awaited<ReturnType<typeof pipeline>>;

let extractorPromise: Promise<FeatureExtractor> | null = null;

/**
 * Returns a singleton feature-extraction pipeline instance.
 */
async function getExtractor() {
  if (!extractorPromise) {
    console.log("Loading embedding model: Xenova/all-MiniLM-L6-v2");
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  return extractorPromise;
}

/**
 * Generates a normalized embedding vector for a single text.
 */
export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await (extractor as unknown as (
    value: string,
    options: Record<string, unknown>,
  ) => Promise<unknown>)(text, {
    pooling: "mean",
    normalize: true,
  });

  const vector =
    typeof output === "object" && output !== null && "data" in output
      ? (output as { data: Float32Array }).data
      : (output as Float32Array);

  return Array.from(vector);
}

/**
 * Generates embedding vectors for multiple texts.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];

  for (const text of texts) {
    vectors.push(await embedText(text));
  }

  return vectors;
}
