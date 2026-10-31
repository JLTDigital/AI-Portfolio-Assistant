# Feature: Chat Interface

**From build-plan:** feature 7
**Build attempt:** 1
**Branch:** feature/chat-interface
**Status:** verified

## Goal

Replace the starter page with a working chat at `/`: a message transcript, an
input box and streamed "holo transmission" answers from `/api/chat`, responsive
from mobile to desktop. Jonathan chose to build this before feature 6, so
signal lost can be built into the real chat rather than a temporary page.

## Design reference

Jonathan asked for the look of
[chat-ui-reference.png](../reference/chat-ui-reference.png), a fan-made Cyberpunk
2077 chat page, and pointed to the Cybercore CSS framework as a similar style.
Take the style, not the assets: a red-framed title bar, a dark gradient panel
with cut corners and a left bracket, cyan text, amber controls, thin frames and
small HUD labels. Built in Tailwind, without installing Cybercore, because it is
a separate framework and adds nothing Tailwind can't do here.

## In scope

- A transcript showing visitor and Agent messages.
- A 500-character input with a send button, using the route's own limit.
- Streaming answers as they arrive, with a soft glow.
- Thinking, empty and basic failure states.
- Sending the transcript to `/api/chat` as `{ messages }`.
- A near-black, cyan-accented dark theme for the chat.
- Baseline keyboard and screen-reader behaviour for these controls.
- Recording the feature 6 decisions in the overview, so they survive this spec.

## Out of scope

- The signal-lost message, its links, retry button and input disabling
  (feature 6). This feature shows only a plain failure note.
- `NEXT_PUBLIC_PORTFOLIO_URL` and `NEXT_PUBLIC_LINKEDIN_URL` (feature 6).
- Suggested question chips (feature 8).
- Scene backdrop, grid, scanlines and readability gradient (feature 9).
- Agent blob (feature 10), intro and call flow (features 11-12),
  End call (feature 13), contact links (feature 14).
- The full accessibility pass (feature 16), and page metadata (feature 17).
- Markdown rendering, conversation persistence, and a chat SDK dependency.

## Build loop

Work through the steps in order on the feature branch. `workflow.stepReview` is
`feature`, so review happens once for the whole feature, not after each step.
`workflow.checkpointCommits` is `disabled`, so make no checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] 1. **Share the input limit.** Create `lib/chat/limits.ts` exporting
      `MAX_USER_CHARS = 500`, and import it in `app/api/chat/route.ts`. It must
      stay free of server-only imports so the client can use it.
      **Done when:** a 501-character request still returns 400
      `input_too_long`; `npm run lint` and `npm run build` pass.

- [x] 2. **Add the chat logic.** Create `components/chat/use-chat.ts`, a client
      hook holding `messages`, `status` (`idle`, `thinking`, `streaming`,
      `failed`) and `send(text)`. It posts the transcript, reads the plain-text
      stream with `fetch` and `TextDecoder`, and follows the rules in Data /
      contracts.
      **Done when:** it compiles and is used by step 3; `npm run lint` and
      `npm run build` pass.

- [x] 3. **Build the chat UI.** Create `components/chat/Chat.tsx` and replace
      `app/page.tsx` with a server component that renders it. Remove the
      starter content. Set the theme tokens in `app/globals.css`, making the
      site dark regardless of system preference.
      **Done when:** at `/`, a typed question shows immediately, a thinking
      indicator appears, and the answer streams in; the page works at 375px and
      desktop widths with no horizontal scroll; `npm run lint` and `npm run
      build` pass.

- [x] 4. **Verify the failure and keyboard paths.** Exercise a failed request
      and a cut-off stream in the running app, and fix anything found.
      **Done when:** a failure removes the unfinished turn, shows the failure
      note, and restores the question to the input; Enter sends, Shift+Enter
      adds a line, and focus stays in the input throughout.

- [x] 5. **Update the project docs.** In `blueprint/context/project-overview.md`,
      make the Signal-lost message section say the input stays disabled until a
      Retry button's resend succeeds, and that the 40-message cap shows
      signal-lost styling with end-of-call wording and no retry. Delete the
      resolved "Signal-lost recovery" and "Build order" open questions. In
      `blueprint/context/coding-standards.md`, replace the components TODO with
      the `components/<area>/` location.
      **Done when:** both documents match this spec and the overview stays
      under 20,000 bytes.

- [x] 6. **Restyle to the design reference.** Add cut-corner utilities and the
      reference palette in `app/globals.css`, switch to Rajdhani with
      `next/font`, and restyle `components/chat/Chat.tsx`: title bar, framed
      panel, left bracket, static HUD labels hidden from screen readers, and
      amber controls. No behaviour changes.
      **Done when:** the page matches the reference's frame and palette at 375px
      and desktop widths, text meets AA contrast, the step 4 paths still pass,
      and `npm run lint` and a clean `npm run build` pass.

## Files / areas

- `lib/chat/limits.ts` - new; shared input limit.
- `app/api/chat/route.ts` - imports the limit; no behaviour change.
- `components/chat/use-chat.ts` - new; request and stream state.
- `components/chat/Chat.tsx` - new; transcript and input.
- `app/page.tsx` - replaced.
- `app/globals.css` - theme tokens and cut-corner utilities.
- `app/layout.tsx` - Rajdhani font.
- `blueprint/reference/chat-ui-reference.png` - design reference, not shipped.
- `blueprint/context/project-overview.md`,
  `blueprint/context/coding-standards.md` - decisions and conventions.

## Data / contracts

**Request:** `POST /api/chat` with `{ messages: ChatMessage[] }`, sending every
completed message plus the new question. The server trims what the model sees.

**Success:** a 200 `text/plain` stream of answer text, with no framing. This
feature adds no route behaviour.

**State rules:**

- Messages live in client state only and are lost on reload, as planned.
- One request at a time. `send` does nothing while one is in progress.
- Text is trimmed before sending; an empty result does not send.
- The visitor's message is added at once. The Agent message is added on the
  first chunk, so `thinking` shows no empty bubble.
- A non-200 response, a network error, a rejected stream read, or a stream that
  ends empty sets `failed`.
- On failure, remove the visitor's question and any partial answer, and put the
  question back in the input. The route rejects a cut-off stream so it cannot
  look complete, and keeping it would send a broken turn in the next request.
- Sending again clears the failure note.
- Leaving the page aborts the request, and an abort shows no failure note.

**Failure note:** plain copy, such as "Transmission failed. Try again." It covers
every failure, including `rate_limited` and `conversation_too_long`, until
feature 6 replaces it.

**Rendering:** messages render as React text with `whitespace-pre-wrap`. Never
use `dangerouslySetInnerHTML`. Answers are shown as written, so any Markdown
symbols appear literally, and URLs are not linked.

**Streamed display:** chunks are shown as they arrive. No artificial typing delay.

**Empty state:** one static line in the transcript, such as "Agent is on the
line. Ask about Jonathan's experience."

**Input:** a `textarea` with `maxLength` from `MAX_USER_CHARS` and an associated
label, which may be visually hidden. It stays enabled while an answer streams, so
focus and the mobile keyboard are not lost. The send button is disabled while a
request runs or the input is blank.

**Accessibility baseline:**

- The transcript uses `role="log"` with `aria-busy` true while answering, so
  screen readers read a whole answer, not each chunk.
- The failure note uses `role="alert"`.
- The latest message scrolls into view, instantly with
  `prefers-reduced-motion`. Any glow is static or disabled for those users.
- Text meets WCAG AA contrast, and focus states are visible.
- Layout uses `dvh` so the input stays visible above mobile keyboards.

## Testing

No test runner or Verify command is configured, so no automated tests are added.
Verify with `npm run lint`, `npm run build`, and the running app in a browser at
mobile and desktop widths, capturing a screenshot if browser tooling is
available. Report any path not exercised live.

Real answers spend a small amount of provider quota, so keep live requests few.
Simulate failures with browser offline mode or a blocked request rather than by
exhausting a limit.

## Notes for the AI

- Read `node_modules/next/dist/docs/` for client components and streaming before
  coding. Cache Components is enabled in `next.config.ts`.
- `ai` is installed, but no React chat package is, and the route returns plain
  text rather than the SDK's protocol. Use plain `fetch`; add no dependency.
- Do not start `next dev` while an independent review receipt is current, because
  it rewrites `AGENTS.md`. Use `next start` for receipt-sensitive checks.
- Keep Tailwind only, with no inline styles.

**Agreed for feature 6, not to build here:** the input stays disabled until a
Retry button resends the last question successfully; `conversation_too_long`
uses the signal-lost styling with end-of-call wording and no retry; the portfolio
and LinkedIn links use `NEXT_PUBLIC_PORTFOLIO_URL` and
`NEXT_PUBLIC_LINKEDIN_URL`, whose values are `https://jlt.digital` and
`https://www.linkedin.com/in/jonathan-taft-21087771/` per `content/`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9679,"specSha256":"03ea0cb204d15ceaffba8a6c256b3d58f0f5270ae84bd8ccb764aafc33b51a77","branch":"refs/heads/feature/chat-interface","head":"cee18372c8b717858dab818c67524a80a6859888","baseRef":"refs/heads/main","baseCommit":"cee18372c8b717858dab818c67524a80a6859888","sourceTree":"93e767b6095812f90bb214b653917d5ecb495a94","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000, type "Who is Jonathan?" and press Enter.

Expected:

Your question appears on the right in amber, "AGENT IS THINKING…" shows briefly, then an answer streams in as glowing cyan text inside the red-framed, cut-corner panel.

This proves:

The page sends your question to `/api/chat` and streams the answer into the transcript.
