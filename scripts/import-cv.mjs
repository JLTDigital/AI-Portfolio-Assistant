import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import TurndownService from "turndown";
import {
  assertFileIsClean,
  CONTENT_DIR,
  localDate,
  reportTokens,
  ROOT,
} from "./import-helpers.mjs";

const OUTPUT_FILE = join(CONTENT_DIR, "cv.md");
const OUTPUT_PATH = relative(ROOT, OUTPUT_FILE);

const ROLE = "Primary source. Canonical record of employment, skills and education.";

// dropImages removes the image but not the link, heading or list item around it.
function stripImageRemnants(markdown) {
  return markdown
    .replace(/\[\]\([^)]*\)/g, "")
    .replace(/^[ \t]*(#{1,6}|-|\d+\.)[ \t]*(\n|$)/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

async function convertDocx(path) {
  const { value, messages } = await mammoth.convertToHtml({ path });
  const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
  // Mammoth inlines images as base64, which would swamp the token budget. This has
  // to be a rule because remove() loses to Turndown's built-in image rule.
  turndown.addRule("dropImages", { filter: "img", replacement: () => "" });
  // Turndown pads bullets to four columns, unlike the rest of content/.
  const body = turndown.turndown(value).replace(/^([ \t]*)-[ \t]+/gm, "$1- ");
  return { body: stripImageRemnants(body), notes: messages.map(({ message }) => message) };
}

function pageToLines(textContent) {
  return textContent.items
    .map((item) => `${item.str ?? ""}${item.hasEOL ? "\n" : ""}`)
    .join("")
    .split("\n")
    .map((line) => line.trim().replace(/^[•●▪◦]\s*/, "- "))
    .join("\n");
}

async function convertPdf(path) {
  const data = new Uint8Array(readFileSync(path));
  const loadingTask = getDocument({ data, verbosity: 0 });
  try {
    const document = await loadingTask.promise;
    const pages = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      pages.push(pageToLines(await page.getTextContent()));
    }
    return {
      body: pages.join("\n\n").replace(/\n{3,}/g, "\n\n"),
      notes: ["PDF headings were not recovered, and multi-column layouts may be out of order."],
    };
  } finally {
    await loadingTask.destroy();
  }
}

const FORMATS = {
  ".docx": { label: "DOCX", convert: convertDocx },
  ".pdf": { label: "PDF", convert: convertPdf },
};

/** Builds the complete content/cv.md text for a converted CV. */
export function buildCvFile({ body, format, name, date }) {
  return [
    "---",
    `source: CV / Résumé (${format}, "${name}")`,
    `last_updated: ${date}`,
    `role: ${ROLE}`,
    "---",
    "",
    `${body.trim()}\n`,
  ].join("\n");
}

function resolveInput(args) {
  if (args.length !== 1) {
    throw new Error("usage: npm run import:cv -- path/to/cv.docx (or .pdf)");
  }
  const path = resolve(args[0]);
  const extension = extname(path).toLowerCase();
  const format = FORMATS[extension];
  if (!format) {
    throw new Error(`unsupported file type "${extension}". Use a .docx or .pdf file`);
  }
  if (!existsSync(path)) {
    throw new Error(`file not found: ${path}`);
  }
  return { path, format, name: basename(path, extname(path)) };
}

async function importCv(args) {
  const { path, format, name } = resolveInput(args);
  assertFileIsClean(OUTPUT_PATH);

  let converted;
  try {
    converted = await format.convert(path);
  } catch (error) {
    throw new Error(`could not read ${path}: ${error.message}`);
  }
  if (!converted.body.trim()) {
    throw new Error(`no text found in ${path}. It may be a scanned or image-only file`);
  }

  writeFileSync(
    OUTPUT_FILE,
    buildCvFile({ body: converted.body, format: format.label, name, date: localDate() }),
  );
  return converted.notes;
}

function printReview(notes) {
  console.log(`Wrote ${OUTPUT_PATH}`);
  for (const note of notes) console.log(`Note: ${note}`);
  console.log(`
Review the draft before committing: git diff ${OUTPUT_PATH}
- Remove anything that should not be public: phone number, home address, salary, right to work.
- Restore any hand-written detail the import lost.
- Discard the draft with: git restore ${OUTPUT_PATH}
`);
}

async function main() {
  try {
    printReview(await importCv(process.argv.slice(2)));
  } catch (error) {
    console.error(`CV import error: ${error.message}`);
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
