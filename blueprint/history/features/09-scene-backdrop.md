# Feature: Scene backdrop

**From build-plan:** feature 9
**Build attempt:** 1
**Branch:** feature/scene-backdrop
**Status:** verified

## Goal

Replace the flat page colour with the Holo Call scene: a near-black, CSS-only backdrop with a faint perspective grid, scanlines and a vignette, plus a dark readability gradient behind the chat so the page feels like a call without costing any text legibility.

## Design reference

- Style: [chat-ui-reference.png](../reference/chat-ui-reference.png). The approved chat frames, panel and tokens stay as they are; this feature only adds what sits behind them.
- Mood only: no image, and no logos, fonts or UI assets from the game. The Velin name never appears in the background.

## In scope

- A decorative `SceneBackdrop` component holding four static layers, back to front: perspective grid, scanlines, vignette, readability gradient.
- Mounting it on `/` behind the chat, independent of `Chat` so later intro and end-call work can use the same scene.
- Palette values kept near-black with faint cyan, using the existing tokens in `app/globals.css`.

## Out of scope

- Any animation, flicker, glitch or RGB split. These belong to the intro (feature 11), and the overview wants effects calmer during chat.
- Blob avatar and its scanlines (feature 10), incoming call, Skip and End call (features 11 to 13).
- Restyling the chat panel, frames or HUD labels.
- The placeholder page title and metadata (feature 17).
- The full contrast audit (feature 16). This feature only has to preserve chat contrast.

## Build loop

Build the steps in order on `feature/scene-backdrop`. `workflow.stepReview` is `feature`, so run `npm run lint` after each step and hold one review for the finished feature rather than stopping between steps. `workflow.checkpointCommits` is `disabled`, so make no commits during the build. `/complete` creates the final feature commit.

## Build steps

- [x] 1. **Backdrop layers.** Add `scene-grid` and `scene-scanlines` utilities to `app/globals.css`, beside `signal-static`, and create `components/scene/SceneBackdrop.tsx` with the grid, scanline and vignette layers. Render it before `Chat` in `app/page.tsx`.
  - Done when: `/` shows a near-black page with a faint receding grid in the lower part, fine scanlines and darkened edges in the margins around the chat at desktop width, the chat still works, and `npm run lint` passes.
- [x] 2. **Readability gradient.** Add a horizontal gradient as the top backdrop layer, solid `--background` across the chat column and fading to transparent towards the page edges.
  - Done when: the HUD labels and title bar have no grid lines visible behind them at desktop width, the grid remains visible in the outer margins, the panel stays opaque, and `npm run lint` passes.
- [x] 3. **Responsive and behaviour check.** Check the page at mobile (375px) and desktop (1440px) widths, adjusting opacity or grid size if the scene competes with the text.
  - Done when: neither width gains a scrollbar from the backdrop, a tall transcript scrolls while the backdrop stays fixed, chips, input and transcript all still take clicks and focus, signal-lost and end-of-call states look unchanged, and `npm run lint` and `npm run build` pass.

## Files / areas

- `components/scene/SceneBackdrop.tsx` - new server component, no `"use client"`.
- `app/page.tsx` - renders `SceneBackdrop` then `Chat`.
- `app/globals.css` - new `@utility` rules for the grid and scanlines.
- `components/chat/Chat.tsx` - not expected to change.

## Data / contracts

No data, API, route or persisted changes. The backdrop takes no props and has no client state.

- **Stacking:** the wrapper is `fixed inset-0 -z-10 overflow-hidden pointer-events-none`, so it stays behind all content, never scrolls with it, never takes input and cannot widen the page. `body` has no stacking context, so a negative z-index sits above its background.
- **Grid:** one element, wider than the viewport and anchored to the bottom, using cyan lines at low opacity with `transform: perspective(...) rotateX(...)` and a mask fading it out at the horizon. Keep the clipped overflow inside the wrapper.
- **Scanlines:** a `repeating-linear-gradient` following the `signal-static` pattern, in cyan at low opacity.
- **Vignette:** a radial gradient from transparent at the centre to `--background` at the corners.
- **Readability gradient:** the opaque panel already guarantees answer contrast and stays as it is. The gradient covers text that sits directly on the page: the title bar surround and HUD labels. Its solid band matches the `max-w-4xl` column.
- **Mobile:** the chat fills the width, so the backdrop only shows in the page padding and cut corners. This is accepted, because a visible scene must not come at the cost of readable chat.

## Testing

No test, typecheck, Verify or Browser tests command is configured, so the gate is `npm run lint`, `npm run build` and a manual look in the browser at the two widths in step 3. The feature has no logic to unit test. Only report visual evidence that was actually captured.

## Notes for the AI

- The whole layer is decorative: `aria-hidden="true"` on the wrapper, no text and no focusable content.
- Static layers need no `motion-reduce` handling, and static layers cannot flash. If a later change adds animation, it must respect `prefers-reduced-motion`.
- Scanlines stay behind the chat, not over it, so they never reduce text contrast.
- Keep it to CSS. No image file, canvas or new dependency.
- No Next.js API changes here beyond a component import in `app/page.tsx`, so the Next docs are only needed if something unexpected comes up.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5646,"specSha256":"1f72dca1c8ce68f11147eaf35890c3158b57a60c47543d31fcf7bd64b22356a5","branch":"refs/heads/feature/scene-backdrop","head":"1c6f29889f0ec56a6843e905ebfa315f5476962d","baseRef":"refs/heads/main","baseCommit":"1c6f29889f0ec56a6843e905ebfa315f5476962d","sourceTree":"acf991564657997b11ef52225a34d25b2d1af39f","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With `npm run dev` running, open http://localhost:3000 in a desktop-width window.

Expected:

A near-black page with fine scanlines, and a faint cyan grid receding towards the horizon in the lower left and right margins. The area behind the title bar and red HUD labels is plain black.

This proves:

The backdrop layers render behind the chat and the readability gradient keeps the column clear.
