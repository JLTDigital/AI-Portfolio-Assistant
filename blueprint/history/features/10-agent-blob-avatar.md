# Feature: Agent blob avatar

**From build-plan:** feature 10
**Build attempt:** 1
**Branch:** feature/agent-blob-avatar
**Status:** verified

## Goal

Give Agent a visible presence in the call: a Nyx UI Morphing Blob that reacts to the conversation (idle, ringing, thinking, speaking, signal lost). It loads in the browser only and falls back cleanly on mobile, reduced-motion and no-WebGL devices. If the avatar fails, the chat must keep working.

## In scope

- Vendor the Nyx UI Morphing Blob to `components/ui/morphing-blob.tsx` and install its dependencies.
- `AgentAvatar`, which takes a `state` prop of `idle | ringing | thinking | speaking | signal-lost`.
- A live mapping from each state to theme, complexity, speed and CSS treatment, with no 3D scene remount.
- Hologram framing: a projection base ring and faint scanlines over the blob.
- Browser-only dynamic import, so three.js is not in the initial bundle.
- Lower `particleCount` and no bloom on mobile and low-power devices.
- A static gradient orb for `prefers-reduced-motion`, no WebGL, and load or render failure.
- Mount the avatar in `Chat` and drive it from the real chat state.

## Out of scope

- Incoming call card, Accept, connecting glitch and the materialise animation (feature 11). The `ringing` state is built here, but nothing in the app triggers it until that feature.
- Moving the load to "after the call card appears". No card exists yet, so the avatar loads when `Chat` mounts and feature 11 moves the mount.
- Skip, returning-visitor logic, End call, sounds (features 12, 13 and 15).
- Recovering a WebGL context lost mid-call. The blob would go blank but the chat keeps working.

## Build loop

`workflow.stepReview` is `feature`, so build all steps, then review once at the end. `workflow.checkpointCommits` is `disabled`, so make no commits during the build. `/complete` creates the final feature commit. Work on `feature/agent-blob-avatar`.

## Build steps

- [x] 1. **Install and vendor.** Create the branch. Install `three@~0.186.1`, `@react-three/fiber@^9`, `@react-three/postprocessing@^3`, `postprocessing@^6` and dev dependency `@types/three@~0.186.0`, without `--force` or `--legacy-peer-deps`. Copy the component from `https://nyxui.com/r/morphing-blob.json` to `components/ui/morphing-blob.tsx`, with a one-line source and MIT credit comment. Remove its `isClient` state and `FallbackComponent`, because the avatar never renders on the server. **Done when** `npm run lint` and `npm run build` pass, with any lint exception for this vendored file scoped to it.
- [x] 2. **Smooth live changes.** Edit the vendored blob so state changes don't snap. The shader's `uTime*uSpeed` jumps the noise phase whenever speed changes, so accumulate a new `uPhase` uniform in `useFrame` (`phase += min(delta, 0.1) * speed * 0.25`) and use it in place of `uTime*uSpeed`. Ease `uComplexity` towards its target in the same callback. **Done when** temporarily changing `speed` and `complexity` in the browser shifts the blob smoothly, with no jump and no canvas remount.
- [x] 3. **Fallback orb and mode detection.** Add `AgentOrb`, a CSS-only radial gradient orb with the same framing, which dims and turns red for `signal-lost`. Add `useAvatarMode`, built on `useSyncExternalStore`, returning `orb | lite | full`. The server snapshot is `orb`. It returns `orb` for reduced motion (live, via a `matchMedia` subscription) or when a WebGL probe fails. It returns `lite` for `(pointer: coarse)`, `(max-width: 639px)` or `navigator.hardwareConcurrency <= 2`. Otherwise it returns `full`. **Done when** the hook gives the right mode under emulated reduced motion, a mobile viewport and disabled WebGL, with no hydration warning.
- [x] 4. **AgentAvatar.** Load `MorphingBlob` with `next/dynamic` and `ssr: false`, using the orb as its `loading` state, and only when the mode isn't `orb`. Wrap it in a `catchError` boundary from `next/error` that renders the orb. `full` uses `particleCount` 150 with effects on; `lite` uses 40 with effects off. Apply the state map below, the base ring and the scanlines. Add the pulse and dim keyframes to `app/globals.css`. The whole avatar is `aria-hidden`, because the transcript already carries these states in text. **Done when** each state renders correctly under a temporary hardcoded prop, removed afterwards, and a forced render error shows the orb with the chat still usable.
- [x] 5. **Mount in Chat.** Derive the state from existing values and pass it to the avatar, using the Open questions layout. **Done when** in the browser a real question moves idle → thinking → speaking → idle, a failing request shows signal lost, Retry returns to thinking, the transcript scroll and input focus still behave, and the layout works at 375px and 1280px wide and at short viewport heights.
- [x] 6. **Final checks.** Confirm in the Network panel that the three.js chunk isn't requested under reduced motion, and isn't part of the initial page JS otherwise. Confirm rendering stops in a hidden tab with a temporary frame counter, removed afterwards. **Done when** `npm run lint` and `npm run build` pass and the page loads with no console errors.

## Files / areas

- New: `components/ui/morphing-blob.tsx`, `components/agent/AgentAvatar.tsx`, `components/agent/AgentOrb.tsx`, `components/agent/use-avatar-mode.ts`
- Changed: `components/chat/Chat.tsx`, `app/globals.css`, `package.json`, `package-lock.json`
- Changed only if step 1 needs it: `eslint.config.mjs`

## Data / contracts

```ts
export type AgentState = "idle" | "ringing" | "thinking" | "speaking" | "signal-lost";
```

| State | Theme | Complexity | Speed | CSS wrapper |
| --- | --- | --- | --- | --- |
| idle | aurora | 1 | 1 | none |
| ringing | aurora | 2 | 2 | scale pulse in time with the ring |
| thinking | aurora | 4 | 4 | none |
| speaking | aurora | 2 | 3 | rhythmic scale pulse |
| signal-lost | danger | 1 | 1 | hold, then dim to about 45% opacity and stay visible |

The numbers are starting values, to be tuned by eye in the browser. `aurora` is used because its palette (`#4A00FF`, `#FF006B`, `#00FFFF`) is the closest to the project's cyan and magenta.

State in `Chat`, first match wins:

1. `status === "thinking"` gives `thinking`, which puts Retry ahead of the still-true `signalLost`.
2. `status === "streaming" || typing` gives `speaking`.
3. `locked` gives `signal-lost`. This includes the 40-message end of call, which the overview gives the same styling.
4. Otherwise `idle`.

No persisted data, API or server changes.

## Testing

No test, typecheck or Verify command is configured, and no browser test harness exists, so no automated tests are added. Evidence is `npm run lint`, `npm run build` (which type-checks) and the manual browser checks in each step's `Done when`. The `ringing` state can only be checked with the temporary prop in step 4.

## Notes for the AI

- Read the `next/dynamic` lazy-loading guide in `node_modules/next/dist/docs/` before step 4. `ssr: false` is only allowed in a client component, and `cacheComponents` and `partialPrefetching` are enabled. `catchError` is documented at `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/catchError.md`.
- `three` stays below 0.187 because `postprocessing@6.39.5` declares a peer range of `three >=0.168.0 <0.187.0`. `@react-three/fiber@9.8.2` accepts React `<19.4`, and the project is on 19.3.0.
- Licence: the Nyx UI repo has no LICENSE file, and GitHub reports none, but its README says "MIT License - feel free to use this project for personal or commercial purposes" and tells users to copy the code. The credit comment in step 1 records that.
- `theme`, `complexity` and `speed` already update through uniforms without a remount. A particle colour change rebuilds only the particles, inside the same canvas.
- Check in step 4 that bloom doesn't draw an opaque box on the transparent canvas. If it does, stop and report it rather than dropping bloom silently.
- The vendored file's inline styles are an accepted exception to the "no inline styles" rule. New project components use Tailwind and theme tokens, matching the approved red, cyan and amber style.
- Pausing in a hidden tab relies on `requestAnimationFrame`, which browsers stop for hidden tabs, so no `visibilitychange` code is added. The `min(delta, 0.1)` clamp in step 2 stops the blob jumping when the tab returns.
- Keep pulses to scale changes well below 3Hz, with no brightness flashing.
- The low-power core cutoff was revised from `<= 4` to `<= 2` during verification: headless Chrome reported 4 cores on an 8-CPU Mac, which dropped a capable desktop to `lite`. Phones are already caught by the pointer and width checks.

## Open questions

- **Desktop layout:** the overview contradicts itself, with the flow docking the chat beside Agent and the avatar section placing Agent centred above it. This spec uses **centred above the chat**, between the title bar and the `SECURE_LINK` label, at 96px on mobile, 160px from `sm` up, and 64px when the viewport is under 640px tall (for example with a mobile keyboard open). It fits the existing single `max-w-4xl` column and backdrop band, and needs no layout rework. Confirm or change this at spec review.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9216,"specSha256":"2ba3c031592e90fc9b143d368293d5de3e897783774ba0b5b4b7ce0fca6cb7cd","branch":"refs/heads/feature/agent-blob-avatar","head":"12e15539ea4327d8385166a8d1d8810220defbc9","baseRef":"refs/heads/main","baseCommit":"12e15539ea4327d8385166a8d1d8810220defbc9","sourceTree":"c471b652191b64de5f4ea4edeab293889686a34d","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

With `npm run dev` running, open http://localhost:3000 and ask any suggested question.

Expected:

A blob sits centred above the chat with a base ring under it. It speeds up and gets more complex while "AGENT IS THINKING…" shows, pulses gently while the answer types out, then settles to a slow idle, with no jump between states and no dark box around it.

This proves:

On a real GPU, the blob follows the live thinking, speaking and idle states and transitions look smooth.
