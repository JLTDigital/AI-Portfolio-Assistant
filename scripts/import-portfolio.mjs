import { writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import TurndownService from "turndown";
import {
  assertFileIsClean,
  CONTENT_DIR,
  localDate,
  reportTokens,
  ROOT,
} from "./import-helpers.mjs";

const OUTPUT_FILE = join(CONTENT_DIR, "portfolio.md");
const OUTPUT_PATH = relative(ROOT, OUTPUT_FILE);

const DEFAULT_URL = "https://jlt.digital";
// /readme is the article index. Article pages stay out so the draft fits the token budget.
const PAGES = ["/", "/readme"];
const FETCH_TIMEOUT_MS = 15000;

const ROLE = "Supplementary. Project links, services, articles and certification not covered in cv.md.";

const DROPPED_ELEMENTS = [
  "script",
  "style",
  "noscript",
  "template",
  "title",
  "svg",
  "img",
  "picture",
  "video",
  "iframe",
  "canvas",
  "form",
  "button",
  "nav",
  "footer",
];

const LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

function absoluteLink(href, pageUrl) {
  try {
    const url = new URL(href, pageUrl);
    return LINK_PROTOCOLS.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

/** Converts one page of HTML to markdown, with its links made absolute. */
export function htmlToMarkdown(html, pageUrl) {
  const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
  // This has to be a rule because remove() loses to Turndown's built-in image rule.
  turndown.addRule("dropElements", { filter: DROPPED_ELEMENTS, replacement: () => "" });
  turndown.addRule("absoluteLinks", {
    filter: (node) => node.nodeName === "A" && node.getAttribute("href"),
    replacement: (content, node) => {
      const text = content.replace(/\s+/g, " ").trim();
      const href = absoluteLink(node.getAttribute("href"), pageUrl);
      return text && href ? `[${text}](${href})` : text;
    },
  });
  // Turndown pads bullets to four columns, unlike the rest of content/.
  return turndown
    .turndown(html)
    .replace(/^([ \t]*)-[ \t]+/gm, "$1- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Builds the complete content/portfolio.md text for the converted pages. */
export function buildPortfolioFile({ body, origin, date }) {
  return [
    "---",
    `source: Portfolio website ${origin}`,
    `last_updated: ${date}`,
    `role: ${ROLE}`,
    "---",
    "",
    `${body.trim()}\n`,
  ].join("\n");
}

function resolveOrigin(args) {
  if (args.length > 1) {
    throw new Error("usage: npm run import:portfolio -- [url]");
  }
  const input = args[0] ?? DEFAULT_URL;
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`invalid URL "${input}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`unsupported URL "${input}". Use an http or https URL`);
  }
  return url.origin;
}

async function fetchPage(pageUrl) {
  let response;
  try {
    response = await fetch(pageUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    const reason = error.cause?.message || error.cause?.code || error.message;
    throw new Error(`could not fetch ${pageUrl}: ${reason}`);
  }
  if (!response.ok) {
    throw new Error(`could not fetch ${pageUrl}: status ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`could not fetch ${pageUrl}: expected HTML, got "${contentType}"`);
  }
  return response.text();
}

async function importPage(pageUrl) {
  const markdown = htmlToMarkdown(await fetchPage(pageUrl), pageUrl);
  if (!markdown) {
    throw new Error(`no text found at ${pageUrl}. The page may be rendered by JavaScript`);
  }
  return `## Page: ${pageUrl}\n\n${markdown}`;
}

async function importPortfolio(args) {
  const origin = resolveOrigin(args);
  assertFileIsClean(OUTPUT_PATH);

  const pageUrls = PAGES.map((path) => new URL(path, origin).href);
  const sections = await Promise.all(pageUrls.map(importPage));

  writeFileSync(
    OUTPUT_FILE,
    buildPortfolioFile({ body: sections.join("\n\n"), origin, date: localDate() }),
  );
}

function printReview() {
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`
Review the draft before committing: git diff ${OUTPUT_PATH}
- Restore hand-written detail the import lost, such as project summaries and that the Visualsoft role has ended.
- Trim the draft to the token budget.
- Remove anything that should not be public.
- Discard the draft with: git restore ${OUTPUT_PATH}
`);
}

async function main() {
  try {
    await importPortfolio(process.argv.slice(2));
    printReview();
  } catch (error) {
    console.error(`Portfolio import error: ${error.message}`);
    process.exit(1);
  }

  try {
    reportTokens();
  } catch (error) {
    console.error(`Knowledge base error: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
