# Feature: Contact links bar

**From build-plan:** feature 14
**Build attempt:** 1
**Branch:** feature/contact-links-bar
**Status:** verified

## Goal

Give every visitor a way to find Jonathan at any point in the visit. A slim bar stays on screen through the whole call flow with links to his portfolio and LinkedIn.

## In scope

- A bar containing the existing PORTFOLIO and LINKEDIN links.
- A page layout that gives the bar its own space, so it never covers the chat input.

## Out of scope

- A CV download or email link. Both were removed from this feature at the user's request.
- Changing the links in `CallEnded` or `SignalPanel`. Features 6 and 13 define those, and they stay as they are, including the `DETAILS` copy.
- Sounds, the wider accessibility and mobile pass (feature 16), and the privacy note (feature 17).
- Target-size changes. The bar uses the same link height as the existing controls, and feature 16 reviews sizing across the app.

## Build loop

Step review is at feature level, so complete the step and then stop for `/check`. Checkpoint commits are disabled. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Place the bar in the call layout.** In `CallSequence`, wrap the output in `flex h-dvh flex-col` and render `<nav aria-label="Contact">` containing `<ContactLinks />` after `<Chat />`, centred with `flex-wrap`, `gap-2` and light padding. In `Chat`, replace `h-dvh` on `<main>` with `min-h-0 flex-1`, and keep the rest of its classes. The nav sits outside `<main>`, so the `inert` and collapse animation applied while ending do not touch it.
  - Done when: the bar is visible and usable in the ringing, connected, ending, ended and signal-lost states; both links open in a new tab; the chat input and `[ LINK: … ]` line sit fully above the bar; and the page does not scroll at 320px, 375px or desktop width. `npm run lint` and `npm run build` pass.

## Files / areas

- `components/call/CallSequence.tsx`
- `components/chat/Chat.tsx`

Reused without changes: `ContactLinks` from `components/call/ContactLinks.tsx`.

## Data / contracts

`NEXT_PUBLIC_PORTFOLIO_URL` and `NEXT_PUBLIC_LINKEDIN_URL` are unchanged, and each link stays hidden when its variable is unset. There is no new route, API, env var, asset or stored data, and no user-controlled text is rendered.

## Testing

No test or Browser tests command is configured, so no automated tests are added. `npm run lint` and `npm run build` are the available checks. Visual and interaction checks are manual and should be reported as such, using the states and widths in step 1.

Evidence, 2026-10-31: `npm run lint` exited 0 and `npm run build` completed. The app was not run during implementation, so the step 1 visual and interaction checks have not been observed.

## Notes for the AI

- Visual style follows the approved design, which `ContactLinks` already applies through `CONTROL`.
- `Connecting` is a `fixed inset-0` overlay, so it covers the bar for its roughly 1.2 seconds. That is intended, because the overlay is a full-screen transition. Do not raise the bar above it.
- The fixed `IncomingCall` and `CallEnded` cards paint above the bar if a very short viewport makes them overlap. Do not add a stacking rule for this. Feature 16 covers short viewports.
- `SceneBackdrop` is at `-z-10`, so the bar needs no z-index to show above it.
- The bar is not animated, so it needs no reduced-motion handling.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3432,"specSha256":"eea08eef51e0759a7ad9915d9e776fd1d9e454c71c1726776b49d80a1a4b9fc2","branch":"refs/heads/feature/contact-links-bar","head":"049ee8530aff3dca971f16b8f7c62dcc8aa30a34","baseRef":"refs/heads/main","baseCommit":"049ee8530aff3dca971f16b8f7c62dcc8aa30a34","sourceTree":"05a9c074c1cff96e8b83d37ab61131f95711773a","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

Run `npm run dev`, open http://localhost:3000 and click ACCEPT. Then click END CALL.

Expected:

PORTFOLIO and LINKEDIN stay at the bottom centre on the call screen, in the chat and on the CALL ENDED card, apart from a brief cover during the connecting effect. In the chat, the input and the `[ LINK: STABLE ]` line sit fully above the bar. The page doesn't scroll, and each link opens in a new tab.

This proves:

The bar stays on screen through the call flow without covering the chat. It doesn't cover the signal-lost state or the 320px and 375px widths, so check those separately.
