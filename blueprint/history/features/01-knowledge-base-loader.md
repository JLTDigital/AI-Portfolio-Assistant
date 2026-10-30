# Feature: Knowledge base loader

**From build-plan:** feature 1
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/knowledge-base-loader`

## Goal

Read every markdown file in `content/` at build time, with its front matter, and combine them into one context that later features send to the LLM. Updating Agent's knowledge must take an edit to `content/` and no code change, and the build must warn when the content grows past the token budget.

## In scope

- A build-time generator that reads `content/*.md`, parses `source` and `last_updated` front matter, and writes one generated JSON file.
- Automatic generation before `npm run dev` and `npm run build`.
- A size guard that warns past a budget of 6,000 estimated tokens and lets the build continue.
- Build failure with a clear message when the knowledge base is empty or a file is invalid.
- A server-only accessor exposing the combined context to later features.
- A seed `content/faq.md` containing only the answers already agreed in the project plan, so the loader has real input.

## Out of scope

- Writing `cv.md`, `linkedin.md` or `portfolio.md`. Jonathan authors these.
- `persona.md` and the system prompt (feature 2).
- Calling an LLM or adding `/api/chat` (feature 3).
- Import helper scripts (features 19 and 20).
- A browser-based content editor (post-MVP).

## Build loop

Build one small step at a time. `workflow.stepReview` is `feature`, so `/implement` produces one review packet after all steps. Checkpoint commits are disabled. `/complete` makes the final feature commit. Never accept a review packet you have not read; split any diff that is too large to review.

## Build steps

- [x] **Step 1 - Seed content** - Create `content/faq.md` with front matter and the agreed answers for availability, salary, location and working pattern, target roles, right to work, and anything not covered. *Done when:* the file has valid `source` and `last_updated: 2026-10-30` front matter, and every answer traces to project-plan §4 with no added facts.
- [x] **Step 2 - Generator** - Add `scripts/build-knowledge.mjs`, exporting `loadKnowledge(contentDir)` and writing the generated JSON when run directly. Implement the parsing, validation, ordering and combined-text rules in Data / contracts. *Done when:* `node scripts/build-knowledge.mjs` writes `lib/knowledge/knowledge.generated.json` containing `faq.md`, and calling `loadKnowledge` on temporary fixture folders fails with a message naming the file and problem for each failure case listed under Testing.
- [x] **Step 3 - Size guard** - Estimate tokens and print a build warning past the budget, including the estimate and budget, while still writing the output and exiting 0. *Done when:* a fixture over 6,000 estimated tokens warns and exits 0, and a fixture under budget prints no warning.
- [x] **Step 4 - Build wiring** - Add `predev` and `prebuild` npm scripts and gitignore the generated file. *Done when:* after deleting the generated file, `npm run build` recreates it and passes, `npm run dev` recreates it on start, and `git status` does not list it.
- [x] **Step 5 - Server accessor** - Add `lib/knowledge/index.ts`, with `import 'server-only'` and exported `KnowledgeContext` types, returning the generated data. Record the new `lib/` and `scripts/` locations in `coding-standards.md`. *Done when:* `npm run build` and `npm run lint` pass with the accessor type-checked, and adding a throwaway `content/*.md` file then rebuilding includes it with no code change (remove it afterwards).

## Files / areas

- `content/faq.md` (new)
- `scripts/build-knowledge.mjs` (new)
- `lib/knowledge/index.ts` (new)
- `lib/knowledge/knowledge.generated.json` (generated, gitignored)
- `package.json` (`predev` and `prebuild` scripts)
- `.gitignore`
- `blueprint/context/coding-standards.md` (File Organization note)

## Data / contracts

Later features depend on this shape.

```ts
interface KnowledgeFileMeta {
  file: string;         // e.g. "faq.md"
  source: string;       // from front matter
  last_updated: string; // YYYY-MM-DD, from front matter
}

interface KnowledgeContext {
  files: KnowledgeFileMeta[];
  text: string;            // combined context for the system prompt
  estimatedTokens: number;
}

export function getKnowledgeContext(): KnowledgeContext; // server only
```

**Input rules**

- Read `*.md` directly inside `content/`, non-recursively. Ignore other files and subfolders.
- Process files in filename order so output is deterministic.
- Front matter sits between `---` lines at the very start of the file. Parse flat `key: value` lines, strip one pair of matching surrounding quotes from values, and ignore unknown keys.
- Tolerate a UTF-8 BOM and CRLF line endings, since content may be pasted or edited on GitHub.
- `source` must be non-empty. `last_updated` must be a real calendar date in `YYYY-MM-DD` form.
- The body after front matter is trimmed and must be non-empty.

**Combined text**

Each file becomes one block, separated by a blank line:

```text
[<file> | source: <source> | last_updated: <last_updated>]
<body>
```

**Size guard**

- `estimatedTokens` is `Math.ceil(text.length / 4)`. It is an estimate, not a tokenizer count.
- `TOKEN_BUDGET` is a `6000` constant in the script, from the plan's "~6k tokens".

**Failure behaviour**

- A missing `content/` folder, no `.md` files, missing or malformed front matter, an invalid field or an empty body each stop the generator with a non-zero exit and a message naming the file and problem. The output file is not written.
- Over budget only warns.

**Security**

- `content/` is owner-authored and committed, so it is trusted input.
- The generated data must stay server-side. Later features will combine it with persona rules that Agent must not reveal, so `server-only` guards the accessor against client imports.

## Testing

No test runner is configured, so tests are not a gate. Verify by running commands, using fixture folders in a temporary directory rather than the real `content/`:

- Happy path: valid files, including a BOM and CRLF file, produce the contract shape in filename order.
- Failures: missing folder, empty folder, no front matter, missing `source`, invalid `last_updated` (such as `2026-02-30`) and empty body.
- Ignored inputs: a non-`.md` file and a nested subfolder don't appear in the output.
- Size guard: over and under budget.
- Build: `npm run build` and `npm run lint` pass from a state with no generated file.

`/check` should not claim any Vercel or LLM evidence, as neither runs in this feature.

## Implementation notes

- Jonathan added all five `content/*.md` files before implementation, so Step 1 used the supplied `faq.md` instead of a seed. It includes facts beyond project-plan §4, such as contact details, which are the author's own.
- Front matter `role` keys are ignored as unknown keys, as specified. `persona.md` is included in the combined text; feature 2 decides how it reaches the system prompt.
- The `predev` hook was run directly with `npm run predev`. No dev server was started.

## Notes for the AI

- **Why a generator:** the plan requires reading at build time, and a build-time warning. A generated JSON file imported by the server also needs no file-tracing configuration on Vercel.
- **Why plain `.mjs`:** the local Node is 22.17.0, which doesn't run TypeScript without a flag, and `next.config.ts` is a poor place for this. Don't add `tsx` or similar.
- **No new dependencies.** Front matter here is two flat keys, so a small parser is enough, and it avoids YAML turning dates into `Date` objects. Next.js handles `server-only` internally, so don't install it (see `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`).
- `next dev` needs a restart to pick up content edits, which is acceptable because the plan's update workflow is commit and redeploy.
- Vercel must run the `build` npm script for `prebuild` to fire. Don't override the build command with bare `next build`.
- The generated file doesn't exist on a clean checkout, so typecheck after `prebuild` runs. `next build` covers this.
- The accessor has no caller until feature 2. That's expected; don't add a temporary route to exercise it.
- Keep `faq.md` faithful to the plan. Don't add contact details, a non-tech roles answer or any other fact the plan doesn't state.
- No em dashes in generated content or comments, per `coding-standards.md`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8442,"specSha256":"a871d072f56815e6678347a9e6666c3ab67b39d594826cf55afd7e1fec8ebb6a","branch":"refs/heads/feature/knowledge-base-loader","head":"8f951de877ca49639349e3ea8f18a489d8700ad0","baseRef":"refs/heads/main","baseCommit":"8f951de877ca49639349e3ea8f18a489d8700ad0","sourceTree":"1ac3ddd77890d4b532c7eb130096088764099675","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

```bash
npm run prebuild && node -p "const k=require('./lib/knowledge/knowledge.generated.json'); k.files.map(f=>f.file).join(', ')+' | ~'+k.estimatedTokens+' tokens'"
```

Expected:

After npm's script header, the last line reads `cv.md, faq.md, linkedin.md, persona.md, portfolio.md | ~4383 tokens`.

This proves:

The generator reads every file in `content/` and writes the combined knowledge base.
