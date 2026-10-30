import "server-only";

import knowledge from "./knowledge.generated.json";

export interface KnowledgeFileMeta {
  file: string;
  source: string;
  last_updated: string;
}

export interface KnowledgeContext {
  files: KnowledgeFileMeta[];
  text: string;
  estimatedTokens: number;
}

/** The combined knowledge base generated at build time from content/. */
export function getKnowledgeContext(): KnowledgeContext {
  return knowledge;
}
