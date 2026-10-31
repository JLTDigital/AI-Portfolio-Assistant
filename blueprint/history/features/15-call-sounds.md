# Feature: Call Sounds

**From build-plan:** feature 15
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/call-sounds`

## Goal

Add optional ring and connect tones to the call, muted by default, with a toggle.
The sound adds to the holo-call feel without ever surprising a recruiter who has
the page open at work.

## In scope

- A ring tone that repeats while the incoming call card is showing and sound is on.
- A single connect sound when a call is accepted or restarted with sound on.
- A visible, keyboard-operable sound toggle, off on every visit.
- Two supplied sound files in `public/sounds/`, loaded only after sound is turned on.

## Out of scope

- Saving the preference between visits. The overview says sound is off by default
  and every visit starts at the call screen, so nothing is stored.
- Sounds for other events (end call, signal lost, message arrival).
- A volume control.
- The wider accessibility and mobile pass (feature 16).

## Build loop

Build one small step at a time. `workflow.stepReview` is `feature`, so produce one
review packet after all steps. `workflow.checkpointCommits` is `disabled`, so make
no checkpoint commits. `/complete` makes the final feature commit. Never accept a
review packet you have not read; split any diff that is too large to review.

## Build steps

- [x] **Step 1 - Sound hook** - Create `components/call/use-call-sounds.ts`,
  exporting `useCallSounds(ringing: boolean)` that returns
  `{ enabled, toggle, playConnect }`. `enabled` starts `false`. `toggle` creates
  the two `Audio` elements inside the click handler, because browsers block audio
  until a user gesture. An effect plays the looping ringtone only while
  `ringing && enabled`, and stops and rewinds it on cleanup. Turning sound off
  also stops the connect sound. `playConnect` does nothing when `enabled` is
  false. *Done when:* `npm run lint` and `npm run build` pass and the hook creates
  no audio objects before the first toggle.
- [x] **Step 2 - Wire into the call** - In `CallSequence`, call
  `useCallSounds(stage === "ringing")`, and call `playConnect()` at the top of
  `accept()` so it runs once on both the normal and reduced-motion paths. Do not
  trigger it from a stage effect, which would miss or double-fire across those
  paths. *Done when:* with sound on, Accept stops the ring and plays one connect
  sound, including with reduced motion enabled and from Call again.
- [x] **Step 3 - Toggle control** - Add a `<button type="button">` labelled
  `SOUND: OFF` or `SOUND: ON`, using the shared `CONTROL` style, next to the
  contact links at the bottom of `CallSequence`. Keep it outside
  `<nav aria-label="Contact">`, since it is not a contact link: wrap the nav and
  button in one centred, wrapping row. *Done when:* the button is visible and
  usable by keyboard on the ringing, connected and ended screens at mobile and
  desktop widths, the current state is readable from its label, and the row does
  not push the chat input off screen.
- [x] **Step 4 - Verify the sound states** - Run through the Testing checklist in a
  real browser, then run `npm run lint` and `npm run build`. *Done when:* every
  checklist item has been observed by ear and both commands pass. Report any item
  that could not be checked by ear as unverified.

## Files / areas

- `components/call/use-call-sounds.ts` (new) - loads and plays both sounds.
- `public/sounds/ringtone.mp3` and `public/sounds/connect.mp3` (new).
- `components/call/CallSequence.tsx` - hook use, `accept()`, toggle and bottom row.
- `components/call/ContactLinks.tsx` - reuse `CONTROL` only, no change expected.

## Data / contracts

None. The toggle state lives in React state in `CallSequence` for the page's
lifetime and is not stored, sent or logged.

**Sounds (supplied by Jonathan):**

- **Ring:** `public/sounds/ringtone.mp3`, from `Ringtone.mp3`, looping.
- **Connect:** `public/sounds/connect.mp3`, from `NotificationSFX.mp3`, 2s. It
  starts on Accept, inside the click, and carries over as the chat appears.
- **Volume:** 0.3 for both, adjustable by ear. iOS ignores `volume` on audio
  elements, so sounds play at device volume there.

**Behaviour:**

| Situation | Result |
| --- | --- |
| Page loads | Silent; toggle shows `SOUND: OFF` |
| Sound turned on while ringing | Ring starts straight away |
| Sound turned off while ringing | Ring stops straight away |
| Accept or Call again, sound on | Ring stops if playing; one connect sound |
| Accept or Call again, sound off | Silent |
| Sound on during a call or after it ends | No tone; applies to the next accept |
| End call, then Call again | Toggle keeps its setting, no ring (ended goes straight to connecting) |
| Page reload | Back to off |
| `prefers-reduced-motion` | Same sound behaviour; the setting concerns motion, not audio |
| Audio unavailable or fails to start | Call flow carries on silently, no error shown |

## Testing

No test runner is configured, so this relies on `npm run lint`, `npm run build`
and a manual run. No Browser tests command exists, so sound cannot be proven
automatically; a person must listen.

Manual checklist:

1. Load the page: silent, toggle reads `SOUND: OFF`.
2. Turn sound on while ringing: the ringtone plays and loops. Turn it off: silence
   at once.
3. Turn it on, press Accept: ring stops and one connect sound plays.
4. End the call, press Call again: toggle still on, one connect sound, no ring.
5. Accept with sound off: silent.
6. With reduced motion on, Accept with sound on: one connect sound.
7. Reload: back to off and silent.
8. Tab to the toggle and operate it with Enter and Space.
9. Check the bottom row at mobile width with both contact links set.

## Notes for the AI

- `CallSequence` is already a client component. Its hook file needs no separate
  directive beyond the existing `components/call/` and `components/chat/` hook
  pattern.
- Do not add a dependency; the `Audio` element is enough.
- Never create audio objects during render or on mount. They must not exist
  before the toggle is clicked.
- Treat audio as non-essential: a failure must not throw into the call flow, and
  a rejected `resume()` must not become an unhandled rejection.
- Match the approved style: amber control via `CONTROL`, no new colours.
- `Connecting` is a full-screen fixed layer, so it covers the bottom row for its
  1.2s. That is acceptable; do not change it for this feature.
- Confirm by running that `CallEnded` leaves the bottom row visible and reachable.
  If it does not, stop and report it rather than restyling that screen here.

## Verification evidence

- `npm run lint` and `npm run build` passed; `/check` drove headless Chrome against
  the dev server with real input, with no console errors or failed requests.
- Observed there: every behaviour-table state, reduced motion, reload, keyboard
  use, and layout at 1280, 390 and 320 wide. Audio state was read from the elements.
- Jonathan confirmed the sounds by ear on 2026-10-31.
- Not exercised: turning sound off during the answer sound, a failed sound load,
  and any browser other than desktop Chrome by automation.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7126,"specSha256":"7b52ef0b50eb15f59ff5bb03b277cd573e10b1f6c37517e944abb893f63dfb60","branch":"refs/heads/feature/call-sounds","head":"d7f7f38a0f0d514aa22d1f9eec400d1d06157c08","baseRef":"refs/heads/main","baseCommit":"d7f7f38a0f0d514aa22d1f9eec400d1d06157c08","sourceTree":"06956b9c81c7e4b9a5aa3be3f8bf86eba4a8d4c6","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000, click `SOUND: OFF`, then click `ACCEPT`.

Expected:

The page is silent on load. After the toggle click the button reads `SOUND: ON` and the ringtone loops. `ACCEPT` stops it and the answer sound plays once as the chat appears.

This proves:

Sound stays off until the visitor turns it on, and the ringtone hands off to the answer sound. It doesn't cover Call again, reduced motion or iPhone Safari, so check those separately.
