# Feature: Intro controls

**From build-plan:** feature 12
**Build attempt:** 1
**Branch:** feature/intro-controls
**Status:** verified

## Goal

Confirm the reduced-motion version of the intro is complete. Every visit starts at the call screen with Accept: there is no Skip control and past visits are not remembered, by product decision.

## In scope

- **Reduced-motion version:** close the one remaining gap (`Connecting`, below) and verify the whole path. The card without slide or pulse, Accept straight to chat and the static orb already exist from features 10 and 11.

## Out of scope

- A Skip control, the intro-seen flag and any returning-visitor behaviour. These were built, then removed at review, and the plans were updated to match.
- End call (13), contact links (14), sounds (15), the wider accessibility pass (16).
- Motion or GSAP, and changes to `useChat` or the API.

## Build loop

`workflow.stepReview` is `feature`, so build all steps, then review once at the end. `workflow.checkpointCommits` is `disabled`, so make no commits during the build. `/complete` creates the final feature commit. Work on `feature/intro-controls`.

## Build steps

- [x] **1. Reduced-motion version.** Add `motion-reduce:animate-none` to both animations in `Connecting`, so changing the OS setting during the 1.2s cannot leave static running. Then walk the path and fix only what it finds.
  - Done when: with reduced motion emulated, the card neither slides nor pulses, and Accept reaches a static chat with the orb and no animation. Without reduced motion, the full sequence still plays. A reload shows the card again. The flow works at 375px, 1280px and 320px wide. `npm run lint` and `npm run build` pass.

## Files / areas

- `components/call/Connecting.tsx`: reduced-motion guards
- `blueprint/build-plan.md`, `blueprint/project-plan.md`, `blueprint/context/project-overview.md`: Skip and intro-seen flag removed

## Data / contracts

- **Reduced-motion rule:** per the overview, no flicker or glitch, and instant transitions. Accept keeps its existing `matchMedia` check and goes straight to `connected`, where the entrance classes are already off under reduced motion.
- **Storage:** nothing is stored. The stage stays in memory, so every load starts at `ringing`.

## Testing

No test, typecheck or Verify command is configured, and no browser test harness exists, so no automated tests are added. Evidence is `npm run lint`, `npm run build` (which type-checks) and the browser checks in the `Done when`.

## Notes for the AI

- No em dashes in code comments or copy, per the coding standards.

## Implementation notes

Lint and build passed. 17 scripted checks in headless Chrome on the production build passed with no console errors, covering reduced motion at 320px, 375px and 1280px, the full sequence, and a reload returning to the card. The full sequence was not observed in a visible window.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2910,"specSha256":"e4e9f5e23385f7c4fff1c076de116b9d8831138c725cc0cb9e66fe13cce2c2fb","branch":"refs/heads/feature/intro-controls","head":"2181d532ded46a0fb218c959215f6cfd1d9dbf5a","baseRef":"refs/heads/main","baseCommit":"2181d532ded46a0fb218c959215f6cfd1d9dbf5a","sourceTree":"25c2b8f906f255b837d78c53626540317f779556","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000 in a normal browser window, click ACCEPT, then reload the page.

Expected:

The card shows ACCEPT with no Skip button, and the connecting sequence plays into the chat. After the reload, you're back on the call card.

This proves:

Every visit starts at the call screen, and nothing is remembered between visits.
