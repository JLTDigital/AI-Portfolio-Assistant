# Fix: A relative path resolves from the project root

**Type:** Fix
**Status:** verified
**Branch:** fix/a-relative-path-resolves-from-the-project-root
**Fixes:** F-12

## The problem

`resolveInput` in `scripts/import-cv.mjs` (line 89) resolves the CV path with `resolve(args[0])`, which uses `process.cwd()`. The contract says the path resolves from the current working directory, but `npm run` changes the working directory to the project root before Node starts. From `content/`, `npm run import:cv -- sub-only-here.pdf` fails with `file not found` for a path at the project root, although the file is in the current folder. A same-named file at the root would be imported in its place, though the draft is still reviewed.

## The fix

Resolve the path against `process.env.INIT_CWD ?? process.cwd()`. npm sets `INIT_CWD` to the folder the command was run from. The fallback covers running `node scripts/import-cv.mjs` directly.

This must not change:

- Absolute paths, which `resolve` already leaves alone.
- Runs from the project root.
- The `file not found` and unsupported file type errors.
- `resolve(process.argv[1])` on line 149, which is the entry-point check and not user input.

No new dependency, helper or configuration.

## Build steps

- [x] **1. Resolve the CV path from the invoking folder.** Change line 89 in `resolveInput`.

**Done when:** a relative path run through `npm run import:cv` from a subfolder imports the file in that subfolder, even when a same-named file exists at the project root.

## Verify

No test runner is configured, so verify by running the real script with throwaway `.docx` files built outside the repo. Copy them in only as ignored or temporary files, and remove them afterwards.

1. From a subfolder holding a test file, run `npm run import:cv -- <name>.docx`: it imports that file.
2. With a different same-named file at the project root, repeat step 1: the subfolder's file is imported, not the root's.
3. From the project root, run with a relative path and with an absolute path: both work as before.
4. Run `node scripts/import-cv.mjs <relative path>` directly: it resolves from the current folder.
5. Run with a missing file: it fails with `file not found` and prints the path under the invoking folder.
6. Discard drafts with `git restore content/cv.md`, then confirm `git status` shows only the intended changes.
7. Run `npm run lint` and `npm run build`.

## Implementation notes

- Verified 2026-10-31 with throwaway `.docx` files in a temporary subfolder, removed afterwards. All seven Verify steps passed, and the unfixed code failed step 1 with `file not found` at the project root.
- Real CV files were not used.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2678,"specSha256":"60784fcb25243d7e0e75ea8add6a16cadfd437d5617d4167e704cd3beccad585","branch":"refs/heads/fix/a-relative-path-resolves-from-the-project-root","head":"50352e528431a966fb1715f4133ead1f2840b45d","baseRef":"refs/heads/main","baseCommit":"50352e528431a966fb1715f4133ead1f2840b45d","sourceTree":"aeb2057ea45fbd1eae607c0e2452ae2501b9c74c","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

```
cd content && npm run import:cv -- does-not-exist.docx
```

Expected:

`CV import error: file not found: <project root>/content/does-not-exist.docx`

This proves:

A relative path resolves from the folder the command was run in. The path includes `content/`, where it used to point at the project root. Nothing is written.
