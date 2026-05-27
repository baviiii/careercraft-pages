// Thin wrapper over AI SDK embed/embedMany using Azure OpenAI by default.
// Centralized so the embedding model + dimensions can be swapped in one place
// (e.g. moving from text-embedding-3-large to a Foundry-deployed embedder).

import { embed, embedMany } from "npm:ai@4";

import { getAzure } from "./providers.ts";
import { optEnv } from "../env.ts";

export interface EmbedOptions {
  /** Azure deployment name. Falls back to env AZURE_OPENAI_EMBEDDING_DEPLOYMENT, then "text-embedding-3-large". */
  deployment?: string;
}

function modelFor(opts: EmbedOptions = {}) {
  const deployment = opts.deployment
    ?? optEnv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large")!;
  return getAzure().textEmbeddingModel(deployment);
}

export async function embedText(text: string, opts?: EmbedOptions): Promise<number[]> {
  const { embedding } = await embed({
    model: modelFor(opts),
    value: text,
  });
  return embedding;
}

export async function embedTexts(texts: string[], opts?: EmbedOptions): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: modelFor(opts),
    values: texts,
  });
  return embeddings;
}
