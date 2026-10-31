# Feature: Suggested questions

**From build-plan:** feature 8
**Build attempt:** 1
**Branch:** feature/suggested-questions
**Status:** verified

## Goal

Give a recruiter who doesn't know what to ask a one-click start: clickable chips
above the chat input that send common recruiter questions to Agent.

## In scope

- Five starter chips above the input, in the existing chat panel.
- Clicking a chip sends its question through the normal chat path, exactly as if
  it had been typed.
- Chips disappear once the conversation starts.
- Keyboard operation and sensible focus after a chip is used.
- Responsive layout from 320px to desktop: one scrolling row below `sm`, wrapped
  rows from `sm` up.

## Out of scope

- Follow-up or context-aware suggestions after the first question.
- Generating chips from the model or the knowledge base.
- Any change to `/api/chat`, the persona, the knowledge base or the rate limits.
- Backdrop, avatar, intro and end-call work (features 9-13).
- Reset behaviour: End call (feature 13) resets `messages`, which will bring the
  chips back without further work here.

## Build loop

Step review is `feature`, so run all the build steps, then stop for review.
Checkpoint commits are disabled, so make no commits during the build. `/complete`
creates the final feature commit.

## Build steps

- [x] **1. Add the chips component.** Create
      `components/chat/SuggestedQuestions.tsx` with the fixed question list and an
      `onSelect(question: string)` prop.
      Done when: `npm run lint` passes and the component renders one native
      `<button type="button">` per question inside a labelled list.

- [x] **2. Wire the chips into the chat.** Render the component in
      `components/chat/Chat.tsx`, between the `SignalPanel` slot and the form,
      only while `messages.length === 0`. On select, move focus to the transcript
      and call `send(question)`.
      Done when: on `/`, clicking a chip shows that question as a YOU message, the
      chips disappear, and Agent answers or the signal-lost panel appears;
      `npm run lint` and `npm run build` pass.

- [x] **3. Keep the transcript usable on small phones.** Below the `sm` breakpoint,
      show the chips as one sideways-scrolling row instead of wrapped rows, because
      five wrapped chips left the transcript 48px tall at 320x568.
      Done when: at 320x568 the chips take one row, the empty-state line isn't
      clipped, the next chip peeks in, every chip can be reached by scrolling and by Tab, and focus rings
      aren't cut off; from `sm` up the chips still wrap; `npm run lint` and
      `npm run build` pass.

## Files / areas

- `components/chat/SuggestedQuestions.tsx` (new)
- `components/chat/Chat.tsx`

## Data / contracts

The list is a constant in `SuggestedQuestions.tsx`, in this order:

1. `What Shopify work has he done?`
2. `What's his tech stack?`
3. `What projects has he built?`
4. `What roles is he looking for?`
5. `When can he start?`

The content already answers all five (`content/cv.md`, `content/portfolio.md`,
`content/faq.md`). Each is well under `MAX_USER_CHARS`, and each goes through
`send()`, so it counts against the same rate limit and 40-message cap as a typed
question. No new API, stored data or request shape.

Behaviour:

- **Visibility:** shown only while `messages.length === 0`. `send()` adds the
  question before the request starts, so the chips can't be shown during a
  request, in signal-lost or at the end of a call, and need no disabled state.
- **Failure:** a failed chip question behaves like a typed one. The question stays
  in the transcript, the signal-lost panel appears and Retry resends it. The chips
  don't come back.
- **Draft text:** a chip doesn't read or clear the input, so anything typed there
  stays.
- **Double click:** the guard in `requestAnswer` already stops a second request.

## Testing

No test command is configured, so tests are not a gate. Run `npm run lint` and
`npm run build`. Check these in the browser during `/check` when available, and
report anything not run as not run:

- Each chip sends its exact question, and Agent gives a grounded answer.
- Tab reaches the chips between the transcript and the input; Enter and Space
  activate a chip.
- After a keyboard activation, focus lands on the transcript, not `<body>`.
- At 320px, 768px and desktop widths, the page has no horizontal overflow and the
  transcript stays usable.
- A provider failure on a chip question shows the signal-lost panel and Retry
  works.

**Results:** `npm run lint` and `npm run build` passed after step 3. `/check` in
real Chrome passed every item except the 320x568 layout, which step 3 repairs.
After step 3, the layout at 320, 375, 639, 640, 768 and 1280 wide and Tab reach at
320 were re-measured in Chrome and passed. The other `/check` items were not re-run
after step 3, which changed only `SuggestedQuestions.tsx`. Real touch swiping on a
phone has not been tried.

## Notes for the AI

- Follow the approved style in the existing chat: amber controls, matching the
  SEND button's border, text, hover and focus treatment
  (`focus-visible:outline-2 focus-visible:outline-offset-2
  focus-visible:outline-accent`), with no inline styles. Use `text-sm` below `sm` so the next chip
  peeks into the row at 320px, `text-base` from `sm` up, and a
  minimum height of about 44px (`min-h-11`) so chips are comfortable touch
  targets.
- Mark up as `<ul aria-label="Suggested questions">` with `flex gap-2`,
  one `<li>` per chip. Use the question string as the React key. The questions
  are static strings, so rendering them as text is safe.
- Focus: the clicked chip is removed from the DOM, which would drop focus to
  `<body>`, so call `transcript.current?.focus()` before `send()`. Use the
  transcript rather than the textarea, because focusing the textarea opens the
  on-screen keyboard on mobile and covers the answer. The transcript already has
  `tabIndex={0}` and a `focus-visible` outline, and its `role="log"` announces the
  new messages.
- Add no server code. `Chat.tsx` is already a client component, so
  `SuggestedQuestions.tsx` needs no `"use client"` of its own and no new
  dependency.
- Keep the existing empty-state line ("Agent is on the line…") as it is.

### Decisions recorded

- **"Is he open to non-tech roles?" is left out**, although the project plan gives
  it as an example. The overview lists this as an open contradiction, the agreed
  target roles are three developer roles, and the knowledge base says nothing
  about non-tech work, so the chip would only get an "I don't know" answer.
  "What roles is he looking for?" replaces it.
- **Chips are starters only.** The build plan calls them starter chips, and hiding
  them after the first question leaves the transcript as much height as possible
  on mobile.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6836,"specSha256":"0257ece0fae380911ba9940dfac541d5c7b5ff370ea86ce7e84b6a62acc5e9d9","branch":"refs/heads/feature/suggested-questions","head":"4243fc12643310a5341546a8ba1374cfc22f4fe1","baseRef":"refs/heads/main","baseCommit":"4243fc12643310a5341546a8ba1374cfc22f4fe1","sourceTree":"940399c17cbcdb4bca0590a4ae7d7cbbcc2c6f53","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With the dev server running, open http://localhost:3000 at about 320px wide and swipe the chip row, then tap **When can he start?**

Expected:

One row of chips sits above the input, with the second chip peeking in at the right edge and the "Agent is on the line" message fully visible. After the tap, the chips disappear and Agent answers that Jonathan is available immediately.

This proves:

The chips stay reachable on a small screen without squeezing the transcript, and a chip still sends its question.
