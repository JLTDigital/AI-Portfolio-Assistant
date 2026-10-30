import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content");
const OUTPUT_FILE = join(ROOT, "lib", "knowledge", "knowledge.generated.json");

const PERSONA_FILE = "persona.md";

export const TOKEN_BUDGET = 6000;

function parseFrontMatter(raw, file) {
  // Pasted or GitHub-edited content can carry a BOM or CRLF line endings.
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    throw new Error(`${file}: missing front matter`);
  }

  const fields = {};
  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value.replace(/^(["'])(.*)\1$/, "$2");
  }

  return { fields, body: normalized.slice(match[0].length).trim() };
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Date rolls 2026-02-30 over to March, so compare the round trip.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseKnowledgeFile(contentDir, file) {
  const { fields, body } = parseFrontMatter(readFileSync(join(contentDir, file), "utf8"), file);

  if (!fields.source) {
    throw new Error(`${file}: missing front matter field "source"`);
  }
  if (!fields.last_updated) {
    throw new Error(`${file}: missing front matter field "last_updated"`);
  }
  if (!isCalendarDate(fields.last_updated)) {
    throw new Error(`${file}: "last_updated" must be a real date in YYYY-MM-DD form`);
  }
  if (!body) {
    throw new Error(`${file}: body is empty`);
  }

  return { file, source: fields.source, last_updated: fields.last_updated, body };
}

/** Reads content/*.md into the KnowledgeContext shape, throwing on invalid content. */
export function loadKnowledge(contentDir) {
  if (!existsSync(contentDir)) {
    throw new Error(`${contentDir}: folder not found`);
  }

  const names = readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
  if (names.length === 0) {
    throw new Error(`${contentDir}: no .md files found`);
  }

  const parsed = names.map((file) => parseKnowledgeFile(contentDir, file));
  const persona = parsed.find(({ file }) => file === PERSONA_FILE);
  if (!persona) {
    throw new Error(`${PERSONA_FILE}: required file is missing`);
  }

  const text = parsed
    .filter((entry) => entry !== persona)
    .map(
      ({ file, source, last_updated, body }) =>
        `[${file} | source: ${source} | last_updated: ${last_updated}]\n${body}`,
    )
    .join("\n\n");
  const systemPrompt = `${persona.body}\n\n# Knowledge base\n\n${text}`;

  return {
    files: parsed.map(({ file, source, last_updated }) => ({ file, source, last_updated })),
    text,
    systemPrompt,
    estimatedTokens: Math.ceil(systemPrompt.length / 4),
  };
}

function main() {
  let knowledge;
  try {
    knowledge = loadKnowledge(CONTENT_DIR);
  } catch (error) {
    console.error(`Knowledge base error: ${error.message}`);
    process.exit(1);
  }

  if (knowledge.estimatedTokens > TOKEN_BUDGET) {
    console.warn(
      `Knowledge base warning: about ${knowledge.estimatedTokens} tokens, over the ${TOKEN_BUDGET} budget`,
    );
  }

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(knowledge, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
