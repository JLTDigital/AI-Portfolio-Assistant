# Feature: End call

**From build-plan:** feature 13
**Build attempt:** 1
**Branch:** feature/end-call
**Status:** verified

## Goal

Let the visitor hang up at any point in a connected call. The call collapses back to the scene, the conversation is wiped, and a "call ended" card shows the contact links, with a way to start a fresh call.

## In scope

- An END CALL control in the chat header, available whenever the call is connected: idle, thinking, streaming, signal lost, and after the 40-message cap.
- A collapse animation of the chat back to the scene, about 0.4s, with no flicker.
- With `prefers-reduced-motion`: no animation, the ended card appears at once.
- Reset on end: any in-flight answer aborted, and messages, status, signal-lost state and the input draft all cleared.
- A "call ended" card over the scene, in the approved style, with Portfolio and LinkedIn links.
- A CALL AGAIN control on that card, which runs the same path as Accept (Connecting, then Chat, or straight to Chat with reduced motion) and opens an empty conversation.
- Focus management at each hand-off, so keyboard and screen-reader users are never dropped to the body.

## Out of scope

- CV and email links, and a persistent links bar (feature 14). The card only uses the two links that exist today.
- Call sounds (feature 15).
- Any confirmation prompt before ending: one press hangs up.
- A call summary, or keeping the transcript after the call.
- Server-side changes. `/api/chat` and the rate limiter are untouched.
- Changes to the existing signal-lost or 40-message "CALL ENDED" panel, beyond sharing its links.

## Build loop

`workflow.stepReview` is `feature`, so build all steps, then review once at the end. `workflow.checkpointCommits` is `disabled`, so make no commits during the build. `/complete` creates the final feature commit. Work on `feature/end-call`.

## Build steps

- [x] **1. Add reset to the chat hook.** In `components/chat/use-chat.ts`, add `reset()`: abort `request.current`, then clear messages, set status to `idle` and signal-lost to false. Leave `request.current` for the existing `finally` to clear. Directly after `reader.read()`, return if `controller.signal.aborted`, so a chunk that had already resolved can't write the old answer back after the reset. Return `reset` from the hook.
  - **Done when:** `npm run lint` and `npm run build` pass and chat behaves as before.
- [x] **2. Extract the contact links.** Create `components/call/ContactLinks.tsx` holding the `LINKS` list, the `DETAILS` sentence and the `CONTROL` class from `SignalPanel.tsx`. It renders only the anchors, as a fragment, so they still sit beside RETRY in the panel's flex row. Keep the rule that a link with no env value isn't rendered, and keep `target="_blank"` and `rel="noopener noreferrer"`. Update `SignalPanel.tsx` to use it.
  - **Done when:** the signal-lost and 40-message panels look and behave exactly as before, and lint and build pass.
- [x] **3. End the call and show the card.** Move the `useChat()` call from `Chat` up to `CallSequence`, and pass its result to `Chat` as a `chat` prop, because the reset has to run from `CallSequence` after the collapse. Add an `ended` stage. Create `components/call/CallEnded.tsx`: a centred card in the `IncomingCall` frame style, with heading "CALL ENDED", the `DETAILS` sentence, `ContactLinks` and an amber CALL AGAIN button that calls `accept`. Its `h1` takes focus on mount, using the same approach as `Connecting`. In the `Chat` header, place an amber END CALL button beside the title; its handler clears the input draft and calls an `onEnd` prop. `endCall` in `CallSequence` calls `chat.reset()` and moves to `ended`.
  - **Done when:** in a browser, END CALL shows the card with focus on its heading, CALL AGAIN runs Connecting and opens an empty chat with the suggested questions, the avatar re-materialises, and a question sent in the new call gets an answer. Lint and build pass.
- [x] **4. Add the collapse.** Add an `ending` stage between `connected` and `ended`, and a `call-collapse` keyframe in `app/globals.css` that animates `clip-path` to `inset(50% 0)` and opacity to 0 over 0.4s with `forwards`. Use `clip-path` rather than `scale`, because the blob's canvas measures itself through transforms (see the note on `avatar-materialise`). `Chat` stays `connected` during `ending` and takes a `closing` prop that adds the animation and `inert` to its `main`, so a second press or a late send can't land. `endCall` checks `prefers-reduced-motion` as `accept` does: if reduced, it finishes at once; otherwise it sets `ending` and finishes after `CLOSING_MS` from a `setTimeout`. Finishing means `chat.reset()` and `ended`, in the same handler so they batch.
  - **Done when:** in a browser, the chat collapses to a horizontal line and fades with no flash of the empty conversation, including when ended mid-answer. With reduced motion emulated, the card appears at once with no animation. Lint and build pass.
- [x] **5. Check every state.** Exercise END CALL while thinking, while streaming, while typing out, on signal lost, and at the 40-message cap, then CALL AGAIN from each. Check keyboard use end to end, and check mobile and desktop widths down to 320px.
  - **Done when:** no old text, old answer, draft, RECONNECTING state or danger avatar survives into the new call, the header doesn't overflow at 320px, and focus is visible at every hand-off.

## Files / areas

- `components/call/CallSequence.tsx` - `ended` and `ending` stages, `endCall`, owns `useChat`
- `components/call/CallEnded.tsx` - new
- `components/call/ContactLinks.tsx` - new, shared links
- `components/chat/Chat.tsx` - `chat`, `closing` and `onEnd` props, END CALL button
- `components/chat/SignalPanel.tsx` - uses `ContactLinks`
- `components/chat/use-chat.ts` - `reset`, abort guard
- `app/globals.css` - `call-collapse` keyframe and `--animate-call-collapse`

## Data / contracts

- Stage: `"ringing" | "connecting" | "connected" | "ending" | "ended"`, in browser memory only.
- `reset()` takes no arguments and returns nothing. Nothing is stored, and no new API or env var is added.
- The conversation stays browser-only. Ending the call sends nothing to the server beyond aborting an open request.

## Testing

No test, typecheck or Verify command is configured, and no browser test harness exists, so no automated tests are added. Evidence is `npm run lint`, `npm run build` (which type-checks) and the browser checks in each `Done when`. Those need `NEXT_PUBLIC_PORTFOLIO_URL` and `NEXT_PUBLIC_LINKEDIN_URL` set locally for the links to appear. Report any browser check that wasn't run as not run.

## Notes for the AI

- Keep `Chat` mounted throughout, and don't reset it with a `key`. WebGL startup blocks the main thread, which is why it stays mounted now (see the comment in `CallSequence.tsx`).
- The existing `connected` effect in `Chat` already moves focus to the transcript on CALL AGAIN, and the `invisible` class hides the old chat from assistive tech while the card shows. Confirm both in the browser rather than adding more code.
- Check that the `wasLocked` effect in `Chat` doesn't pull focus to the textarea when a reset clears a locked state. The chat is invisible by then, so the focus call should do nothing, and `CallEnded` should keep focus.
- Reuse `accept` for CALL AGAIN. It skips the ringing card on purpose, so there's no need to focus Accept or press it twice.
- The per-conversation 40-message cap restarts with a new call. A reload already does this, and the per-IP rate limit still applies, so this adds no new exposure.
- The `DETAILS` sentence names the portfolio and LinkedIn even when an env value is missing. This matches `SignalPanel` today; leave it.
- Use the existing tokens and the approved style: red frames, cut corners, cyan text, amber controls, Rajdhani. Don't add dependencies.
- Move no knowledge, persona or API logic. This feature is client-side only, and needs no Next.js-specific APIs.

## Implementation notes

Lint and build passed. `/check` drove headless Chrome against the production build with no console errors or failed requests: 30 scripted claims passed, covering the collapse, the card, focus at each hand-off, ending from thinking, streaming, typing out, signal lost, reconnecting and the 40-message cap, reduced motion, keyboard use, and 320px and 390px widths. Chat responses were stubbed, apart from one real question answered through `/api/chat`. The running dev server had stale CSS without the `call-collapse` keyframes, so the collapse was proven on the production build, not in dev.

The card also has a short fade-in, reusing the `chat-in` keyframes, which the spec didn't ask for. END CALL is 38px tall on mobile; touch-target size is left for feature 16.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":8781,"specSha256":"600bc38c1eaaa67ba682638b3c5136504397da4eb7b52b61fb2888700d6eb27e","branch":"refs/heads/feature/end-call","head":"10289cb13a427d4633a2d3dddb81a73f2b99a167","baseRef":"refs/heads/main","baseCommit":"10289cb13a427d4633a2d3dddb81a73f2b99a167","sourceTree":"0b8be1f50ad5210b22ef38229341f12aa61bd75f","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Restart `npm run dev`, open http://localhost:3000 in a normal browser window, click ACCEPT, send a question, then click END CALL and CALL AGAIN.

Expected:

The chat collapses to a horizontal line and fades, and a CALL ENDED card shows Portfolio and LinkedIn links. CALL AGAIN plays the connecting screen and opens an empty chat with the suggested questions.

This proves:

A visitor can hang up, the conversation is wiped, and a fresh call can start.
