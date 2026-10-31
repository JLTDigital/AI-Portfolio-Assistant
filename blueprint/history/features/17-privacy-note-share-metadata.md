# Feature: Privacy note & share metadata

**From build-plan:** feature 17
**Build attempt:** 1
**Branch:** feature/privacy-note-share-metadata
**Status:** verified

## Goal

Tell visitors, before they ask anything, that their questions go to a third-party AI provider, and make a shared link look deliberate: real page metadata plus an Open Graph image of the holo-call card for LinkedIn previews.

## Design reference

Approved style and the live card in [IncomingCall.tsx](../../components/call/IncomingCall.tsx): red cut-corner frame, cyan text, amber control, Rajdhani, near-black base. No game logos, fonts or screenshots.

## In scope

- A one-line privacy note, visible at every call stage, including the ringing screen before Accept.
- Replace the create-next-app `title` and `description` in the root layout, and add Open Graph title, description, URL and type.
- `metadataBase` from `NEXT_PUBLIC_SITE_URL`.
- A code-generated 1200x630 PNG Open Graph image of the holo-call card, with alt text, using Rajdhani.

## Out of scope

- A `twitter-image` or other platform-specific image.
- A replacement favicon or a privacy policy page.
- Question logging, or any change to what the chat route sends or stores.
- Editing `project-plan.md` or the overview's open questions.
- Setting env vars on Vercel, which happens at first deploy.

## Build loop

Implement all steps in order, then stop for feature-level review (`workflow.stepReview: feature`). Checkpoint commits are disabled. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Privacy note.** On branch `feature/privacy-note-share-metadata`, add the note as a `<p>` in the bottom wrapper of [CallSequence.tsx](../../components/call/CallSequence.tsx), after the contact nav and sound toggle, with `w-full text-center text-sm text-muted` so it takes its own row. It sits outside the `nav` and is plain text with no link.
  **Done when:** the note shows on the ringing, connected and ended stages, wraps without clipping at 320px wide, does not overlap the input or the call card, and `npm run lint` passes.
  **Evidence:** lint passes and the note is in the prerendered `/` HTML. The wrap and overlap checks at 320px were not viewed in a browser.

- [x] **2. Page metadata.** In [layout.tsx](../../app/layout.tsx), set the title, description, `metadataBase` and `openGraph` values from Data / contracts.
  **Done when:** `npm run build` passes with `NEXT_PUBLIC_SITE_URL` unset and with it set to a sample URL, and the served `/` HTML has the new title and description, `og:title`, `og:description`, `og:type`, and an absolute `og:url` built from that sample URL.

- [x] **3. Open Graph image.** Add `assets/fonts/Rajdhani-SemiBold.ttf` and its `OFL.txt` from the `google/fonts` repository, then add `app/opengraph-image.tsx` using `ImageResponse` from `next/og`. Read the font once at module scope, per the Next docs. Inline `style` values only: flexbox, no grid, no Tailwind classes, and hex colours because CSS variables are unavailable in Satori. Keep the composition in Data / contracts.
  **Done when:** `npm run build` lists `/opengraph-image` as a static route, `/opengraph-image` on `npm run start` returns a 1200x630 `image/png` that has been viewed and shows the card in Rajdhani with the cut corner intact, and `/` has `og:image` with width, height, type and alt. If the font pushes the image past the 500KB bundle limit, stop and report it.

## Files / areas

- `components/call/CallSequence.tsx` - privacy note.
- `app/layout.tsx` - metadata.
- `app/opengraph-image.tsx` - new, picked up by the Next file convention.
- `assets/fonts/Rajdhani-SemiBold.ttf`, `assets/fonts/OFL.txt` - new. Read at build through `process.cwd()`.

## Data / contracts

**Privacy note (exact copy):** `Questions go to third-party AI providers, which may use them to improve their models. This site doesn't keep them.`

**Metadata:**

- `title`: `Holo Call: ask Jonathan Taft's AI agent`
- `description`: `Accept the call and ask Agent, Jonathan Taft's AI agent, about his skills and experience.`
- `metadataBase`: `new URL(NEXT_PUBLIC_SITE_URL)` when set, otherwise `null`. Next then uses `VERCEL_PROJECT_PRODUCTION_URL` on Vercel and localhost elsewhere, so production previews work without extra fallback code.
- `openGraph`: same title and description, `url: "/"`, `type: "website"`. The image tags come from the file convention.

**Image:**

- `size`: 1200x630. `contentType`: `image/png`. `alt`: `Incoming holo call card from Agent, Jonathan Taft's AI agent`.
- Near-black `#07060c` page with one centred card. Frame is `#c9343f` around a `#150d24` to `#071b24` gradient, with the bottom-right corner cut. The frame and gradient are one inline SVG polygon, because Satori does not clip children to a `clip-path`.
- Card contents, top to bottom: `VELIN NETWORK` in `#ff5a5f`; the cyan ring and dot, `INCOMING HOLO CALL` in `#86aeb0`, `AGENT` in `#6df5ea` and the signal bars on one row; `JONATHAN TAFT'S AI AGENT` in `#86aeb0`; a static `ACCEPT` outlined in `#f7c766`.
- Text is large enough to read in a small LinkedIn feed preview.

## Testing

No test command is configured, so no unit tests. Use `npm run lint`, `npm run build`, the served HTML and a viewed PNG. LinkedIn Post Inspector cannot be run until the site is deployed, so the real LinkedIn preview stays unverified by this feature.

## Notes for the AI

- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` and `.../04-functions/image-response.md` before writing the image route. Cache Components is enabled, so confirm the route still prerenders.
- The privacy copy resolves the overview's open question. It says only that this site does not keep questions, because free-tier providers may. The rate-limit KV holds counters, not questions, and the chat route does not log message content.
- Do not reuse `IncomingCall` in the image. It relies on Tailwind and animation classes that Satori cannot read.
- `NEXT_PUBLIC_SITE_URL` is not in `.env` yet. Do not treat that as a defect. It is added at first deploy.
- No em dashes in generated content.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6148,"specSha256":"d01df37a9200e562ae4d8565563a1b14669cfe11828f99d01ee361350534cc1e","branch":"refs/heads/feature/privacy-note-share-metadata","head":"7f0c62bb0f9e27df48022b0c89e56fdda4d2acc5","baseRef":"refs/heads/main","baseCommit":"7f0c62bb0f9e27df48022b0c89e56fdda4d2acc5","sourceTree":"67f7d57883874d95ad33373eccab6c9fa974f5e5","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000, then open http://localhost:3000/opengraph-image.

Expected:

The call screen shows this line below the contact links and the sound toggle: "Questions go to third-party AI providers, which may use them to improve their models. This site doesn't keep them." The browser tab reads "Holo Call: ask Jonathan Taft's AI agent". The image URL shows the red-framed card with VELIN NETWORK, AGENT, JONATHAN TAFT'S AI AGENT and ACCEPT, with the bottom-right corner cut.

This proves:

The privacy note appears before a visitor accepts the call, and the page title and the generated share image are live. It does not cover the real LinkedIn preview, which needs a deployed site.
