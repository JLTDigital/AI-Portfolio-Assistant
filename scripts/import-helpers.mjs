import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledge, TOKEN_BUDGET } from "./build-knowledge.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT_DIR = join(ROOT, "content");

export function assertFileIsClean(outputPath) {
  let status;
  try {
    status = execFileSync("git", ["status", "--porcelain", "--", outputPath], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`could not check ${outputPath} with git, so it was not overwritten`);
  }
  if (status.trim()) {
    throw new Error(
      `${outputPath} has uncommitted changes. Commit them, or discard them with "git restore ${outputPath}", then run the import again`,
    );
  }
}

export function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function reportTokens() {
  const { estimatedTokens } = loadKnowledge(CONTENT_DIR);
  console.log(`Knowledge base: about ${estimatedTokens} tokens`);
  if (estimatedTokens > TOKEN_BUDGET) {
    console.warn(
      `Knowledge base warning: about ${estimatedTokens} tokens, over the ${TOKEN_BUDGET} budget`,
    );
  }
}
