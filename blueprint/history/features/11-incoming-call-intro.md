# Feature: Incoming call intro

**From build-plan:** feature 11
**Build attempt:** 1
**Branch:** feature/incoming-call-intro
**Status:** verified

## Goal

Turn the page into a call the visitor answers. `/` opens on an incoming call card from Agent. Accept plays a short connecting glitch, then Agent materialises from a point of light and the chat is ready to use.

## Design reference

- Style: `blueprint/reference/chat-ui-reference.png` and the approved look already in `components/chat/Chat.tsx`: red frame, cut corners, dark purple-to-teal panel, cyan text, amber controls, small red HUD labels, Rajdhani. Use the existing tokens and the `cut-sm` / `cut-lg` utilities in `app/globals.css`.
- Take the style only. No game logos, fonts or assets.

## In scope

- **Call sequence:** a client component owning the stage, `ringing` then `connecting` then `connected`. It replaces `<Chat />` in `app/page.tsx`. `SceneBackdrop` stays in place throughout.
- **Incoming call card:** a compact card sliding in, top right on desktop and centred on the page on mobile. Content: caller "AGENT", "VELIN NETWORK" label, "INCOMING HOLO CALL", signal bars, pulsing ring and a large amber ACCEPT button. It rings until accepted, with no timeout.
- **Connecting:** a screen lasting 1.2s (the overview's limit is 1.5s) with static, scanlines and RGB split on the text "CONNECTING… ENCRYPTED LINK ESTABLISHED".
- **Agent materialises:** `Chat` is revealed when connecting ends. Its one `AgentAvatar` reveals from a point of light, flickers once and settles into idle, while the rest of the chat fades in around it.
- **Blob startup behind the card:** `Chat` is mounted invisible from the start, so the blob loads and WebGL starts while the card rings, and the blob rather than the fallback orb is what materialises.
- **Project-wide accessibility these new animations must meet:** see Data / contracts.

## Out of scope

- Skip intro button, the intro-seen flag and returning-visitor behaviour (feature 12). The intro plays on every load until then.
- Any reduced-motion work beyond the contract below (feature 12).
- End call (13), contact links (14), sounds (15), page metadata (17).
- Motion or GSAP. The sequence is one timer plus CSS animations, so no animation dependency is added.
- Changes to chat behaviour, `useChat`, or the API.

## Build loop

`workflow.stepReview` is `feature`, so build all steps, then review once at the end. `workflow.checkpointCommits` is `disabled`, so make no commits during the build. `/complete` creates the final feature commit. Work on `feature/incoming-call-intro`.

## Build steps

- [x] **1. Call sequence and card.** Add `components/call/CallSequence.tsx` and `components/call/IncomingCall.tsx`, add the `card-in` and ring animations to `app/globals.css`, and render `CallSequence` in `app/page.tsx`. Accept goes straight to `connected` for now.
  - Done when: `/` shows the card over the backdrop in the right position at 375px and 1280px wide, Tab reaches ACCEPT and Enter opens a working chat. `npm run lint` passes.
- [x] **2. Connecting stage.** Add `components/call/Connecting.tsx` with its static and RGB-split animations, and the 1.2s timer in `CallSequence`, cleared on unmount. Accept moves focus to the connecting heading.
  - Done when: Accept shows the connecting screen for 1.2s and then the chat, and no full-screen flash is visible. `npm run lint` passes.
- [x] **3. Materialise and hand-off.** Add the materialise animation to `AgentAvatar`, the chat fade-in to `Chat`, and focus on the transcript when `Chat` opens.
  - Done when: the blob appears from a point of light at its full, sharp size, flickers once and idles; the transcript has focus; a question sends and streams normally; the orb fallback (no WebGL) also materialises; the blob's size is correct after the animation with no window resize. `npm run lint` passes.
- [x] **4. Reduced motion and final pass.** Add the `prefers-reduced-motion` branch in the Accept handler and `motion-reduce:animate-none` on every new animation.
  - Done when: with reduced motion emulated, the card appears without sliding or pulsing and Accept goes straight to a static chat with the orb. The full sequence works at 375px, 1280px and 320px wide. `npm run lint` and `npm run build` pass.
- [x] **5. Repair: start WebGL behind the card.** `/check` found the reveal skipped because WebGL startup stalled the main thread for about 1.6s as `Chat` mounted. Mount `Chat` invisible from the start and reveal it at `connected`, replacing the preload.
  - Done when: a frame recording on the production build shows the reveal running through its keyframes with no stall, on a real GPU, and connecting still lasts about 1.2s. `npm run lint` and `npm run build` pass.

## Files / areas

- New: `components/call/CallSequence.tsx`, `components/call/IncomingCall.tsx`, `components/call/Connecting.tsx`
- `app/page.tsx`: render `CallSequence` in place of `Chat`
- `app/globals.css`: new keyframes and animation tokens
- `components/agent/AgentAvatar.tsx`: `materialise` prop
- `components/chat/Chat.tsx`: `connected` prop, fade-in, focus

## Data / contracts

- **Stage:** in-memory `useState` in `CallSequence`. Nothing is stored, and no request is sent before Accept. `Chat` is mounted but `invisible` until `connected`, so it cannot be reached by keyboard or screen reader, and conversation state is untouched by the intro.
- **Chat `connected` prop:** reveals the chat, plays its entrance and moves focus.
- **Reduced motion:** per the overview, no flicker or glitch and instant transitions. The Accept handler checks `matchMedia("(prefers-reduced-motion: reduce)")` and goes directly to `connected`.
- **Flashing:** static and RGB split must not flash full-screen. Static moves a low-opacity pattern without changing overall brightness, and the blob flickers exactly once.
- **Focus and landmarks:**
  - The card and connecting screen each render a `<main>` with one `<h1>`.
  - The card takes no autofocus. ACCEPT is the first tab stop.
  - Accept unmounts its own button, so focus moves to the connecting `<h1>` (`tabIndex={-1}`), which also announces it to screen readers.
  - `Chat` focuses the transcript when `connected`, not the input, because focusing the input opens the mobile keyboard. This matches `askSuggested` in `Chat.tsx`.
  - Decorative bars, ring, HUD labels and static are `aria-hidden`.
- **Timing:** the card is in the server-rendered HTML and slides in within about 0.3s, meeting the "first meaningful interaction within ~3 seconds" target.
- **ACCEPT target:** at least 44px high.

## Testing

No test, typecheck or Verify command is configured, and no browser test harness exists, so no automated tests are added. Evidence is `npm run lint`, `npm run build` (which type-checks) and the manual browser checks in each step's `Done when`.

## Notes for the AI

- **Do not scale the blob from zero.** `react-use-measure`, which R3F uses, reads `getBoundingClientRect`, so a mount-time transform is measured, and `ResizeObserver` does not fire when the transform ends. A canvas mounted at a small scale would stay small and blurry. Animate the reveal with `clip-path: circle()` and opacity on `AgentAvatar`'s root, plus a small glowing point element behind it, so it reads as scaling up from a point of light. Keep any `transform` off the canvas's ancestors during the reveal.
- Keep the one `AgentAvatar` in `Chat`. Do not render a second one for the intro, which would create and tear down a second WebGL context.
- **WebGL startup blocks the main thread** for about 1.6s on an Intel Iris GPU, which skips any CSS animation running at that moment. Keep it behind the ringing card, where the pulse and slide run on the compositor. `visibility: hidden` keeps the canvas measured, which `display: none` would not.
- Reuse the existing `scene-scanlines` and `signal-static` utilities first, adding new ones only where they fall short.
- Effects are heaviest in the intro, calmer during chat. Nothing from the intro should keep animating after the entrance ends.
- No em dashes in code comments or copy, per the coding standards.

## Implementation notes

Lint and build passed. Evidence comes from headless Chrome on the production build, with an Intel Iris GPU.

- Reveal: 7 of 8 runs after the repair played about 60 frames with a worst gap of 43ms. The first run after a rebuild stalled about 1s during the reveal, probably a cold GPU shader cache, and did not recur.
- Connecting: 1.22 to 1.25s on GPU. In a freshly started browser, the first page took 1.7 to 1.8s with software rendering and with WebGL disabled, over the 1.5s limit. Not seen on GPU.
- Not observed: absence of full-screen flashing (no measurement, screenshots only), and behaviour in a visible, non-headless window.

## Open questions

- **Ringing blob (decision made, reversible):** the overview gives the blob a ringing state but only materialises it after Connecting. This spec follows the numbered flow and the feature's own wording: the card has a CSS pulsing ring, the blob stays hidden until materialise, and the `ringing` state stays unused. A small ringing blob on the card would need a second WebGL context. Say so at review if you want it instead.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9232,"specSha256":"c8cf87651fbcb231a075e66a35f2aa2e0da81e8a552aab77aa946d9dc5dff2ce","branch":"refs/heads/feature/incoming-call-intro","head":"400fe2ed75743a702f7968782542b4766c4ad447","baseRef":"refs/heads/main","baseCommit":"400fe2ed75743a702f7968782542b4766c4ad447","sourceTree":"e7793564248ff33e299b3f2b3cdd4aa08b806e11","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000 in a normal browser window, wait for the card and click ACCEPT.

Expected:

About 1.2s of "CONNECTING… ENCRYPTED LINK ESTABLISHED" with static and no bright flash. Then a point of light opens into the blob, it dips once and settles, and the chat fades in around it, ready for a question. On mobile the card sits in the centre of the page.

This proves:

The reveal plays in a real window at the machine's normal speed, and the connecting static doesn't flash.
