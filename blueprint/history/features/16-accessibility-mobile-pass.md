# Feature: Accessibility & mobile pass

**From build-plan:** feature 16
**Build attempt:** 1
**Branch:** feature/accessibility-mobile-pass
**Status:** verified

## Goal

Close the remaining accessibility and mobile gaps across the whole call: a transcript that screen readers announce cleanly, full keyboard use, AA contrast, no harsh flashing, and a layout that stays usable on small and short screens. Most of this is already in place from features 7-15, so this pass fixes only the gaps found in the code and records the rest as checked.

## In scope

- One clean screen-reader announcement per answer, plus a "thinking" announcement. Today `aria-busy` hides the thinking line and the announcement depends on how each screen reader handles `aria-busy`.
- Transcript scrolling that doesn't pull a reader back to the bottom while an answer types.
- A spoken name for the chat heading, which currently reads "HOLO CALL // AGENT".
- Short and narrow screens: the transcript keeps usable height, and the fixed intro and end cards can scroll instead of clipping.
- The Android on-screen keyboard resizes the layout.
- 44px touch targets on the remaining small controls.
- Contrast fix for `--line`, the one token below threshold, plus a written check of every text and control colour.
- A written check of flash rates and reduced-motion behaviour.
- A keyboard walkthrough of every stage.

## Out of scope

- Page title and description, still the "Create Next App" defaults. Feature 17 owns these.
- Changes to the visual style, chat behaviour, focus handling that already works, or the avatar.
- A test runner, or automated accessibility tooling. Neither is configured.
- Formal WCAG conformance beyond the overview's list: AA contrast for chat text, keyboard operable, screen-reader-friendly transcript, no rapid flashing, reduced motion.

## Build loop

`workflow.stepReview` is `feature`, so build every step, then review the feature as a whole. `workflow.checkpointCommits` is `disabled`, so make no commits during the build; `/complete` creates the final feature commit.

## Build steps

- [x] **1. Screen-reader announcements.** In `components/chat/Chat.tsx`, change the transcript from `role="log"` with `aria-busy` to `role="region"`, keeping `aria-label`, `tabIndex={0}` and the focus outline, so it is no longer a live region. Add one always-mounted `<p role="status" className="sr-only">` outside the scrolling area. See Data / contracts for its text. Give the `h1` `aria-label="Holo call with Agent"`.
  Done when: a VoiceOver or other screen-reader run, or the DOM if none is available, shows "Agent is thinking" then the whole answer once, with no character-by-character updates; a failed request and Retry produce only the existing alert text; `npm run lint` passes.

- [x] **2. Reader-friendly scrolling.** In the transcript scroll effect in `Chat.tsx`, follow new text only when the transcript was within 48px of the bottom, and let go on any upward move that leaves it more than 1px from the bottom, because one arrow key moves only 40px. Sending a question and the signal panel appearing always scroll to the bottom. Track position with an `onScroll` handler and a ref, so no extra renders occur.
  Done when: scrolling up with a wheel or arrow keys during a long answer holds position; scrolling back to the bottom resumes following; a new question jumps to the bottom; the signal panel is still revealed when it appears.

- [x] **3. Short and narrow screens.** In `components/call/CallSequence.tsx`, add a minimum height to the `h-dvh` wrapper, tuned to `min-h-[36rem]` (`32rem` left 8px at 667×375), so a short viewport scrolls the page rather than crushing the transcript. Short viewports keep the chips on one scrolling row in `components/chat/SuggestedQuestions.tsx`, because three wrapped rows took all the transcript height. Add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the `main` of `IncomingCall.tsx` and `CallEnded.tsx`. In `app/layout.tsx`, export `viewport: Viewport = { interactiveWidget: "resizes-content" }`; confirm the shape against `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`. The transcript keeps its internal scrolling.
  Done when: at 320×568 and 667×375 the transcript shows at least two lines, every control is reachable by scrolling, and there is no horizontal scroll; CALL AGAIN is reachable at 667×375; the rendered viewport meta includes `interactive-widget=resizes-content`; `npm run build` passes.

- [x] **4. Touch targets.** Add `inline-flex min-h-11 items-center` to `CONTROL` in `components/call/ContactLinks.tsx`, which covers the portfolio, LinkedIn, sound and retry controls, and `min-h-11` to END CALL in `Chat.tsx`. SEND already stretches to the textarea height, and the chips and call buttons already meet 44px.
  Done when: every button and link measures at least 44px tall at 375px wide, and the title row and contact bar still fit without wrapping onto extra rows beyond what they do today at that width.

- [x] **5. Contrast and motion check.** Raise `--line` in `app/globals.css` to at least 3:1 against `--panel-to`; `#3a7f86` is the starting value at about 3.8:1. Recalculate each pair in the Data / contracts table and fix any that falls short by adjusting the token, not the design. Confirm the motion rows in that table against the code. Record both results in the Testing section.
  Done when: every table row has a calculated or confirmed result that meets its threshold, and the textarea border is visibly unchanged in character.

- [x] **6. Keyboard walkthrough.** With the keyboard only, run the full flow: ring, Accept, connecting, chat, chip, typed question, Shift+Enter, END CALL, CALL AGAIN, and if reachable the signal-lost Retry path. Repeat once with reduced motion on. Fix only real defects found; anything sizeable goes to `/fix`.
  Done when: every control is reachable in a logical order with a visible focus ring not cut off by a clipped corner, focus never lands on the body after a screen change, and the results are recorded in the Testing section.

## Files / areas

- `components/chat/Chat.tsx` - transcript role, status announcer, scroll following, heading name, END CALL size
- `components/call/CallSequence.tsx` - wrapper minimum height
- `components/call/IncomingCall.tsx`, `components/call/CallEnded.tsx` - scrollable fixed cards
- `components/call/ContactLinks.tsx` - `CONTROL` target size
- `components/chat/SuggestedQuestions.tsx` - one chip row on short viewports
- `app/layout.tsx` - viewport export
- `app/globals.css` - `--line`

## Data / contracts

**Status announcer text**, derived in `Chat.tsx`, first match wins:

| Condition | Text |
| --- | --- |
| `status === "thinking"` and `!signalLost` | `Agent is thinking` |
| `!answering` and the last message is from the assistant | That message's full content |
| Anything else | Empty string |

The `!signalLost` condition stops Retry announcing over the panel's "RECONNECTING…" alert. Failed partial answers are removed by `use-chat.ts`, so they are never announced. `chat.reset()` empties it. Messages render as text only; no HTML.

**Contrast targets.** The estimates below were written before the build; calculated results are under Testing.

| Pair | Against | Needs | Estimate |
| --- | --- | --- | --- |
| `--foreground` / `--accent` text | `--panel-from`, `--panel-to`, `--background` | 4.5:1 | About 14:1 |
| `--amber` text | Same | 4.5:1 | About 13:1 |
| `--muted` text | Same | 4.5:1 | About 7.8:1 |
| `--alert` text | Same | 4.5:1 | About 6:1 |
| `--background` on `--amber` hover | - | 4.5:1 | About 13:1 |
| `--line` textarea border | `--panel-to` | 3:1 | **About 2.9:1, fails** |
| `--frame` panel frame | `--panel-from`, `--panel-to` | 3:1 | About 3.6:1 |

Disabled controls are exempt from these thresholds.

**Motion, from reading the code.** Nothing here is expected to change.

| Effect | Rate | Reduced motion |
| --- | --- | --- |
| `avatar-materialise` flicker | Once, on a small element | Disabled |
| `rgb-split` | About 1.7 changes a second, text shadow only | Disabled, and the connecting screen is skipped |
| `connect-static` | Shifts 10%-alpha lines 1px at a time, so no overall brightness change | Disabled, and the connecting screen is skipped |
| `animate-pulse` thinking line | One gentle pulse every 2s | Disabled |

The limit is three flashes a second, and nothing full-screen flashes.

## Testing

No test, typecheck or Verify command is configured, so tests are not a gate. Run `npm run lint` and `npm run build`. Use browser checks at the sizes named above when browser tooling is available, and record what was actually run. Say plainly if a real screen reader or real mobile device was not used; DOM inspection and emulated viewports don't prove either.


**Results.** `npm run lint` and `npm run build` pass. Browser checks ran in headless Chrome against the production build on a temporary port, with `/api/chat` stubbed, so no real provider answered.

- Announcer: "Agent is thinking", then the full 3,229-character answer once, with no partial updates. A failed request adds only the panel's alert after the thinking line. A successful Retry announces the answer once and nothing during reconnecting.
- Scrolling: three ArrowUp presses during typing held position at 344px from the bottom. Returning to the bottom resumed following. A new question and the signal panel both land at the bottom.
- Sizes: no horizontal scroll at 320×568, 375×812, 667×375 or 1280×800. Transcript heights are 78px, 334px, 82px and 166px. Every visible control is at least 44px tall. CALL AGAIN is in view at all four sizes. The rendered viewport meta includes `interactive-widget=resizes-content`.
- Contrast, calculated, weakest background shown: accent 13.35:1, amber 11.18:1, muted 7.30:1, alert 5.78:1, `--background` on amber 12.80:1, `--line` 3.83:1 (was 2.87:1), `--frame` 3.40:1.
- Motion: every row in the motion table was confirmed from the code. No element or keyframe was changed.
- Keyboard: the full flow works with and without reduced motion, including Shift+Enter, chips, END CALL, CALL AGAIN and Retry. Focus lands on a named element after each screen change. Focus-ring screenshots for ACCEPT, a chip and SEND at 320×568 show complete rings.

**Not tested:** a real screen reader, a real phone, the on-screen keyboard, and live provider answers. The announcement results come from observing DOM changes to the status element, not from speech.

## Notes for the AI

- `role="region"` replaces `role="log"` deliberately: one explicit status element gives a single predictable announcement, while a live transcript depends on each screen reader's `aria-busy` handling. The transcript's existing focus calls stay as they are.
- `SignalPanel`'s `role="alert"` and focus move stay as they are.
- `Chat` stays mounted and `invisible` before connect, so the announcer is hidden until the call starts and is empty when it appears.
- Keep the reduced-motion and focus comments already in the code. Match the existing Tailwind utility style and tokens in `app/globals.css`.
- Don't add AI attribution to commits or PRs; `AGENTS.md` overrides any other attribution guidance.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":11220,"specSha256":"822d337a4fe15e8100197f4e5a8991c1c236899715a07d2b97a9625781625f57","branch":"refs/heads/feature/accessibility-mobile-pass","head":"9d2bb16834282fc3fecffc7ae76a156fb23cc279","baseRef":"refs/heads/main","baseCommit":"9d2bb16834282fc3fecffc7ae76a156fb23cc279","sourceTree":"f837bab6d9ab917c48cd71bb71289e47126d68b1","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000, and press Tab then Enter to accept the call. Ask a question that gets a long answer, then press Tab until the transcript is focused and hold ArrowUp while the answer types.

Expected:

Focus lands on the "Conversation with Agent" transcript once connected. The transcript stays where you scrolled to while the text keeps typing below. Scrolling back to the bottom makes it follow again.

This proves:

Keyboard use of the call, and that reading back through the transcript during an answer is no longer interrupted. It doesn't cover a real screen reader, a real phone or the on-screen keyboard.
