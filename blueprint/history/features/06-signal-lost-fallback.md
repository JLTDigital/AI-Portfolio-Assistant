# Feature: Signal-lost fallback

**From build-plan:** feature 6
**Build attempt:** 1
**Branch:** feature/signal-lost-fallback
**Status:** verified

## Goal

When Agent can't answer, keep the visitor inside the call. Replace the plain
"Transmission failed" note with a pre-written, in-call "signal lost" panel that
links to Jonathan's portfolio and LinkedIn and offers Retry. At the 40-message
cap, show the same panel with end-of-call wording and no Retry.

## In scope

- A signal-lost panel in the chat, shown on any failed answer: rate limit, no
  provider configured, every provider failing, a network error, a stream cut off
  mid-answer, or an empty answer.
- Portfolio and LinkedIn links in the panel, from `NEXT_PUBLIC_PORTFOLIO_URL` and
  `NEXT_PUBLIC_LINKEDIN_URL`.
- Input and Send disabled while the signal is lost, with a short "try again
  later" note.
- A Retry button that resends the last question. The input is enabled again only
  when that answer completes.
- The end-of-call panel once the transcript reaches 40 messages, with no Retry.
- Moving `MAX_MESSAGES` into `lib/chat/limits.ts`, so the route and the chat share
  the cap.
- Agent's answers typing out at a paced rate until complete, instead of landing
  in provider bursts (added at Jonathan's request during review).
- The decorative `[ LINK: STABLE ]` footer label following the state, so it never
  contradicts the panel.

## Out of scope

- The blob's signal-lost state (feature 10).
- End call and conversation reset (feature 13). After the cap, the visitor reloads
  to start again.
- The persistent contact links bar, including CV and email (feature 14).
- A countdown or automatic retry based on `Retry-After`.
- Different wording per failure cause. Visitors get one message.
- Any change to rate limiting, the provider chain, or route error codes.

## Build loop

Build all steps, then stop for one feature-level review (`workflow.stepReview` is
`feature`). Checkpoint commits are disabled; `/complete` creates the feature
commit.

## Build steps

- [x] 1. **Share the cap.** Move `MAX_MESSAGES` from `app/api/chat/route.ts` to
      `lib/chat/limits.ts` and import it in the route.
      Done when: the route behaves the same and `npm run lint` and `npm run build`
      pass.

- [x] 2. **Update the chat hook.** In `components/chat/use-chat.ts`:
      - Remove `"failed"` from `ChatStatus` and add a `signalLost` boolean, set on
        failure and cleared only when an answer completes.
      - On failure, keep `sent` (the question stays, any partial answer goes), so
        the conversation still ends on a user message and can be resent.
      - Extract the fetch and stream logic into one internal function used by both
        `send(question)` and a new `retry()`, which resends `messages` unchanged.
        Both return nothing.
      - Return `callEnded`, true when `status === "idle"`, `!signalLost` and
        `messages.length >= MAX_MESSAGES`.
      Done when: the types and lint pass, with `Chat.tsx` updated in step 3 before
      checking.

- [x] 3. **Add the panel.** Add `components/chat/SignalPanel.tsx`, render it in
      `Chat.tsx` where the failure note was, and remove that note and the logic
      that restored a failed question to the input. See Data / contracts for the
      copy, links and focus rules. Add a static `signal-static` utility to
      `app/globals.css` for the scanline treatment.
      Done when: a failed request shows the panel with both links, the input and
      Send are disabled, and a successful Retry removes the panel and re-enables
      the input.

- [x] 4. **Handle the end of the call.** Render the end-of-call variant when
      `callEnded` is true, and disable the input and Send. Make the footer label
      read `[ LINK: LOST ]` or `[ LINK: CLOSED ]` to match.
      Done when: the panel appears as soon as the 20th answer finishes, with no
      Retry, and no 41st message can be sent.

- [x] 5. **Verify.** Run `npm run lint` and `npm run build`, then run the manual
      checks under Testing.
      Done when: every check has passed, or any that couldn't run is reported.

- [x] 6. **Type out answers.** Add `components/chat/use-typed-answer.ts` to pace
      the newest answer in `Chat.tsx`. Keep Send disabled, `aria-busy` true and the
      end-of-call panel held back until typing finishes. Show text at once under
      `prefers-reduced-motion`.
      Done when: an answer types out smoothly to its end, a long one finishes in
      about ten seconds, and reduced motion shows it instantly.

## Files / areas

- `lib/chat/limits.ts` - add `MAX_MESSAGES`.
- `app/api/chat/route.ts` - import it instead of declaring it.
- `components/chat/use-chat.ts` - `signalLost`, `callEnded`, `retry`.
- `components/chat/SignalPanel.tsx` - new.
- `components/chat/Chat.tsx` - render the panel, lock the input, focus, footer.
- `app/globals.css` - `signal-static` utility.
- `components/chat/use-typed-answer.ts` - new.

## Data / contracts

**Panel variants.** The copy is pre-written in the component and never comes from
the LLM.

| | Signal lost | Call ended |
| --- | --- | --- |
| Heading | `SIGNAL LOST` | `CALL ENDED` |
| Message | Agent's bandwidth is maxed out for now. You can find Jonathan's full details on his portfolio or LinkedIn. | This call has reached its limit. You can find Jonathan's full details on his portfolio or LinkedIn. |
| Note | Try again later. | None |
| Retry | Yes | No |
| Footer label | `[ LINK: LOST ]` | `[ LINK: CLOSED ]` |

**Retry in progress.** The panel stays up and the input stays disabled. The live
text changes to `RECONNECTING…`, and Retry uses `aria-disabled` rather than
`disabled`, with clicks ignored, so it keeps keyboard focus. If the retry fails,
the signal-lost text returns.

**Links.** Reference `process.env.NEXT_PUBLIC_PORTFOLIO_URL` and
`process.env.NEXT_PUBLIC_LINKEDIN_URL` by their full names, because Next only
inlines direct references. Both are set in `.env`. Render a link only when its
value is set. Links open in a new tab with `rel="noopener noreferrer"`, so the
call stays open.

**Accessibility.**

- The heading and message sit in a `role="alert"` region, so each change is
  announced.
- When the panel appears, focus moves to it (`tabIndex={-1}`), because disabling
  the textarea would otherwise drop focus. When a retry clears it, focus returns
  to the input.
- Amber controls and visible focus rings match the existing Send button.
- `signal-static` has no motion or flicker, so it needs no reduced-motion variant.
  Text stays at WCAG AA contrast.

**Cap.** The route rejects more than 40 messages, and 40 is reached by the 20th
answer. The client stops there using the shared constant, so the chat never sends
a request that would return `conversation_too_long`. Since that code isn't
reachable from the UI, the client doesn't need to parse it.

**Failure detection.** Every non-OK response is treated alike. `use-chat.ts` keeps
ignoring failures caused by its own abort on unmount.

## Testing

No test command is configured, so tests are not a gate. Check manually with the
dev server:

- **No provider:** start with all three provider keys set to empty values. Confirm
  the panel, links, disabled input and no console or browser error.
- **Retry:** restart with real keys and press Retry with the page still open.
  Confirm the answer arrives and the input is enabled and focused.
- **Failed retry and rate limit:** use a temporary browser `fetch` stub, not
  committed, to return a 429 and to cut off a stream mid-answer. Confirm the panel
  shows, the partial answer is gone and the question remains.
- **Cap:** use the same stub to reach 40 messages without spending quota. Confirm
  the end-of-call panel has no Retry and the input is disabled.
- **Typing:** confirm an answer types out to its end, Send stays disabled until it
  finishes, and reduced motion shows it instantly. On the 20th answer, confirm the
  end-of-call panel waits for typing to finish.
- **Keyboard and layout:** reach the links and Retry by keyboard, and check the
  panel at mobile and desktop widths.

## Implementation notes

- `/check` proved steps 3 to 6 in headless Chrome. The 429, cut-off stream, cap and
  typing cases used a temporary in-page `fetch` stub; the no-provider failure and
  one answer through Retry were real. No screen reader was used.
- `RETRY` relies on the hook's in-flight guard to ignore clicks during a retry.
- `SignalPanel` has a `key` per variant, so focus moves again if a retry's answer
  is the 20th and the panel changes from signal lost to call ended.

## Notes for the AI

- Read `blueprint/context/coding-standards.md` before changing code. Use Tailwind
  only, with no inline styles, and match the approved red frames, cyan text, amber
  controls and Rajdhani type.
- The wording applies to every failure, including a provider error, because the
  overview gives one example message and no cause-specific copy.
- `Retry` counts against the visitor's rate limit like any request. That's
  expected.
- Feature 13 will reset the conversation, so keep `signalLost` and `callEnded`
  easy to clear, but add no reset code now.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9176,"specSha256":"defba677a6eaae22c64fb945cb5398b66a34b3997db64760cdb4664b26967c87","branch":"refs/heads/feature/signal-lost-fallback","head":"19c013d169fe8409f0e7721d62fe74ec978f1737","baseRef":"refs/heads/main","baseCommit":"19c013d169fe8409f0e7721d62fe74ec978f1737","sourceTree":"8f660730e577cacfa18c64e9151b86e5552bbe86","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

```bash
GOOGLE_GENERATIVE_AI_API_KEY= GROQ_API_KEY= OPENROUTER_API_KEY= npm run dev
```

Open http://localhost:3000 and send any question.

Expected:

The question stays in the transcript and a red-framed `SIGNAL LOST` panel appears, reading "Agent's bandwidth is maxed out for now. You can find Jonathan's full details on his portfolio or LinkedIn." and "Try again later." It has RETRY, PORTFOLIO and LINKEDIN controls, the input and SEND are disabled, and the footer reads `[ LINK: LOST ]`.

This proves:

The no-provider failure shows the pre-written in-call panel with its links and a locked input. It does not cover a successful retry, typed answers or the 40-message cap.
