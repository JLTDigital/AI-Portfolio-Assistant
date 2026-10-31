# Fix: A dropped image leaves empty markdown behind

**Type:** Fix
**Status:** verified
**Branch:** fix/a-dropped-image-leaves-empty-markdown-behind
**Fixes:** F-11

## The problem

`convertDocx` in `scripts/import-cv.mjs` drops images through the `dropImages` rule, but the element that wrapped the image stays. A throwaway `.docx` produced `[](https://jlt.digital/)` from an image inside a link, `## ` from an image in a heading, and `-` from an image in a list item. Linked social icons are common on CVs, so these remnants are likely, and they reach the system prompt unless removed by hand during review. No base64 or image text survives, so this is cleanup, not data loss.

## The fix

After Turndown, in `convertDocx`, remove what the dropped images left behind, in this order:

1. Empty links: `[](url)`, including any title.
2. Lines holding only a heading, bullet or ordered list marker. The finding names heading and bullet markers; ordered markers are included because an image in a numbered item leaves the same remnant.
3. Runs of three or more newlines, which the removals leave behind, collapsed to one blank line. `convertPdf` already does the same.

This must not change:

- Links with text, and any text that shares a line with a removed empty link.
- List spacing from the existing bullet normalisation on line 27, or indented nested bullets.
- The `no text found` error for a file that has only images: the body must still come out empty.
- PDF conversion, which has no images to drop.

No new dependency, helper module or configuration.

## Build steps

- [x] **1. Strip the remnants from DOCX output.** Extend the post-Turndown cleanup in `convertDocx`.

**Done when:** a `.docx` with images inside a link, a heading, a bullet and a numbered item imports with no `[](`, no marker-only lines and no run of two or more blank lines, while its normal text, links and lists are unchanged.

## Verify

No test runner is configured, so verify by running the real script.

1. Build a throwaway `.docx` outside the repo with: an image-only link, an image-only heading, an image-only bullet, an image-only numbered item, a linked word next to an image-only link on one line, a normal link, and a nested list.
2. Run `npm run import:cv -- <path>` and read `content/cv.md`: the remnants are gone and all normal content is intact.
3. Import a `.docx` that holds only images and confirm it fails with `no text found`, leaving `content/cv.md` unchanged.
4. Discard the draft with `git restore content/cv.md`.
5. Run `npm run lint` and `npm run build`.

## Implementation notes

- Marker-only lines are removed with their newline, so an empty item in the middle of a list does not split it with a blank line.
- Verified 2026-10-31 with throwaway `.docx` files built outside the repo, and a before/after comparison. All remnants were present before the fix and absent after it.
- Two cosmetic leftovers remain, by choice: list numbers are not renumbered (`1.` then `3.`), and removing an inline empty link leaves two spaces in the sentence. Neither changes the text, and both fall to the review the import already asks for.
- Real CV files were not used.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3161,"specSha256":"833652fbd00fb14b08caea0748ef70dbac061e40e4d25ae6d4c5d06275d2afb5","branch":"refs/heads/fix/a-dropped-image-leaves-empty-markdown-behind","head":"b715c49b396fc62e20a69ab00d8cacd2ea993561","baseRef":"refs/heads/main","baseCommit":"b715c49b396fc62e20a69ab00d8cacd2ea993561","sourceTree":"b17771a74d17e57a7b09ab53ba78973b03d14f12","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

```
npm run import:cv -- path/to/cv-with-linked-images.docx
git diff content/cv.md
git restore content/cv.md
```

Use any `.docx` with an image inside a link, a heading or a list item.

Expected:

`content/cv.md` contains no `[](`, and no line holding only `## `, `-` or a list number. The document's normal text, links and lists are intact.

This proves:

Images in links, headings and list items leave nothing behind in a DOCX import, while normal content survives.
