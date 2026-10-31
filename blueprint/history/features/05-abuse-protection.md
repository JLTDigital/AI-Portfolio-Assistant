# Feature: Abuse Protection

**From build-plan:** feature 5
**Build attempt:** 1
**Branch:** feature/abuse-protection
**Status:** verified

## Goal

Stop scripted or oversized requests from burning free LLM quota by adding a
per-IP rate limit and limits on input length and conversation length to
`/api/chat`. Rejected requests return stable error codes and never reach a
provider. Feature 6 turns those codes into the in-call experience.

## In scope

- Per-IP sliding-window limit: 20 requests per 10 minutes, backed by Upstash
  Redis and `@upstash/ratelimit`.
- Max 500 characters for each visitor (`user`) message.
- Max 40 messages in a request (20 exchanges). The browser will send the whole
  transcript; the model still receives only the last 10 messages.
- A bound on client-supplied `assistant` text, which is also untrusted.
- Fail-open behaviour with a redacted log when Upstash is unconfigured, down or
  slow.
- `Retry-After` on rate-limited responses.
- Overview updates that record these decisions.

## Out of scope

- The signal-lost message and any other UI (feature 6 and feature 7).
- Client-side input limits, such as `maxLength` on the input box (feature 7).
- Reporting rate-limiter status in `/api/health` (feature 18).
- A global or per-provider quota cap, per-conversation server state, IPv6
  subnet grouping, CAPTCHA, or bot detection.
- Prompt-injection defences beyond the existing system prompt.

## Build loop

Work through the steps in order on the feature branch. `workflow.stepReview` is
`feature`, so review happens once for the whole feature, not after each step.
`workflow.checkpointCommits` is `disabled`, so make no checkpoint commits;
`/complete` creates the final feature commit.

## Build steps

- [x] 1. **Enforce request limits.** In `app/api/chat/route.ts`, add
      `MAX_MESSAGES = 40`, `MAX_USER_CHARS = 500` and
      `MAX_ASSISTANT_CHARS = 4_000`, and add `input_too_long` and
      `conversation_too_long` to the error codes. Extend `parseMessages` to
      report a specific failure, checking the array length before walking the
      messages. Keep the existing `RECENT_MESSAGES` trim unchanged.
      **Done when:** with no provider spend, `curl` shows 41 messages returning
      400 `conversation_too_long`, a 501-character `user` message returning 400
      `input_too_long`, a 500-character question being answered, and a 4,001+
      character `assistant` message being accepted but cut to 4,000; `npm run
      lint` and `npm run build` pass.

- [x] 2. **Add the rate limiter.** Install `@upstash/ratelimit` and
      `@upstash/redis`. Confirm the APIs against the installed packages. Add
      `lib/rate-limit.ts` exposing one function that takes the request headers
      and returns whether the request may proceed, plus the seconds until
      retry. It fails open as defined in Data / contracts.
      **Done when:** the module builds, and with no Upstash env vars it reports
      "allowed" and logs one redacted warning per failed check; `npm run lint`
      and `npm run build` pass.

- [x] 3. **Wire the limiter into the route.** In `POST`, check the limit after
      validation and the `not_configured` check, and before `startAnswer`.
      Return 429 `rate_limited` with `Retry-After` when denied.
      **Done when:** with Upstash credentials, the 21st valid request within 10
      minutes returns 429 with `Retry-After` and no provider call, while
      malformed or over-limit requests do not consume the allowance; without
      credentials, chat still streams. If credentials are unavailable, record
      the 429 path as not exercised rather than claiming it.

- [x] 4. **Update the project docs.** In `blueprint/context/project-overview.md`,
      change the ChatMessage note so the browser sends the transcript up to 40
      messages and the model receives the last 10, and delete the now-resolved
      "Unset limits" open question.
      **Done when:** the overview matches this spec and stays under 20,000
      bytes.

## Files / areas

- `app/api/chat/route.ts` - limits, error codes, limiter call.
- `lib/rate-limit.ts` - new; IP lookup, limiter, fail-open handling.
- `package.json`, `package-lock.json` - two new dependencies, both named in the
  project plan's stack.
- `blueprint/context/project-overview.md` - decisions from this spec.
- `.env` (local, ignored) and Vercel project settings - Upstash credentials,
  added by Jonathan.

## Data / contracts

**Request handling order:** parse and validate, `not_configured` check, rate
limit, providers. Invalid requests cost no allowance because they cost no quota.

**Validation:**

- More than 40 messages is rejected, checked before walking the array.
- `user` content over 500 characters is rejected. Length is `content.length`,
  and the rule applies to every `user` message in the array, not only the
  latest.
- `assistant` content over 4,000 characters is truncated to 4,000, not rejected.
  The model's real answers have no fixed length, so rejecting them could end an
  honest conversation.
- Exactly 40 messages and exactly 500 characters are allowed.
- If a body breaks more than one rule, any matching 400 code is acceptable.

**Error responses** extend the existing `{ "error": <code> }` shape:

| Status | Code                    | Meaning                              |
| ------ | ----------------------- | ------------------------------------ |
| 400    | `invalid_request`       | Malformed body (unchanged)           |
| 400    | `input_too_long`        | A visitor message exceeds 500 chars  |
| 400    | `conversation_too_long` | More than 40 messages                |
| 429    | `rate_limited`          | Per-IP allowance used                |
| 503    | `not_configured`        | No LLM provider (unchanged)          |
| 502    | `provider_error`        | Every provider failed (unchanged)    |

A 429 includes `Retry-After` in whole seconds: time until the limiter's `reset`,
rounded up, minimum 1.

**Trusted IP source:** the `x-real-ip` header, which Vercel sets itself and
clients cannot spoof there. If it is absent, as in local dev, all requests share
one `unknown` key. Do not parse a client-controlled forwarding chain.

**Limiter:** `Ratelimit.slidingWindow(20, "10 m")` with a dedicated key prefix,
analytics off, and a timeout of about 1 second so a slow Redis cannot stall a
chat. Create the Redis client only when both `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are set. Counters expire on their own, matching the
overview's RateLimitCounter model.

**Fail open:** missing configuration, a thrown error or a limiter timeout allows
the request. Input and conversation limits still apply. The warning logs only a
fixed message and the error name, never the IP, visitor text, or credentials.

## Testing

No test runner or Verify command is configured, so no automated tests are added.
Verify with `npm run lint`, `npm run build` and the `curl` checks in each step.
Report any path not exercised live, especially the real 429 if Upstash
credentials are not yet available.

## Notes for the AI

- Read `node_modules/next/dist/docs/` for anything route-handler specific before
  coding. There is no `request.ip`; use the header above.
- Match the route's existing style: hand-written validation, `satisfies
  ChatError`, and redacted logging.
- Keep limit constants in the route for now. Feature 7 can move them if the
  client needs to share them.
- Do not add a limiter abstraction, a storage interface, or an env schema.
- `.env` does not yet have the Upstash variables. Jonathan needs a free Upstash
  Redis database and must add the credentials locally and in Vercel. Check the
  current free-tier terms when doing so.
- Never read or print `.env` values.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7749,"specSha256":"b8ef60d9b72f5422d8c925b3c27245f4b9e41da23d861605e6a776df1a46134d","branch":"refs/heads/feature/abuse-protection","head":"35b1daacc94782adaa75056513d982f0684e4b55","baseRef":"refs/heads/main","baseCommit":"78e3a9e3a47d67441801cf0701f014c9f1521e49","sourceTree":"4b6b65f03935bdca85019c9c9f278e57a4b45887","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 35b1daacc94782adaa75056513d982f0684e4b55
**Base commit:** 78e3a9e3a47d67441801cf0701f014c9f1521e49
**Base ref:** main
**Spec hash:** b8ef60d9b72f5422d8c925b3c27245f4b9e41da23d861605e6a776df1a46134d
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-31T11:20:55Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-31T11:25:30Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run lint`: pass
- `npm run build`: pass
- test command: unavailable (none configured)
- typecheck command: unavailable (none declared; the TypeScript phase of `npm run build` passed)
- Verify command: unavailable (none configured)

## Evidence

- Preconditions confirmed: `HEAD`, the `main` merge base and the spec hash match the request, and only `blueprint/context/review.md` differed from the target.
- Reviewed the complete `78e3a9e..35b1daa` delta: `app/api/chat/route.ts`, `lib/rate-limit.ts`, `package.json`, `package-lock.json`, `blueprint/context/project-overview.md` and the active spec, plus the installed `@upstash/ratelimit` 2.2.0 and `@upstash/redis` 1.40.0 sources.
- Ran the real route and limiter in-process with a stubbed `fetch`, fake credentials, no server and no network. Limits: 41 messages gave 400 `conversation_too_long`, a 501-character `user` message at any position gave 400 `input_too_long`, 500 characters and 40 messages gave 200, a 4,001-character `assistant` message reached the provider as 4,000, and a 39-message history reached the provider as 9 messages starting with `user`.
- Limiter against a fake Redis following the installed sliding-window script: the 21st and 22nd requests gave 429 with `Retry-After` and no provider call, invalid requests made no Redis call, `x-forwarded-for` did not change the key, a missing `x-real-ip` used the shared `unknown` key, and a retry one second after `reset` succeeded.
- Fail open: hung Redis returned 200 in about 1.1 seconds with a `Timeout` warning, a 401 logged `UpstashError`, a network failure logged `Timeout`, and missing configuration logged `NotConfigured`. Warnings held only a fixed message and a reason, and no unhandled rejection appeared.
- Malformed URL: the route module threw `UrlError` at load, and `next build` exited 1 with the variable in scope. See F-09. A clean build followed, leaving no tracked change.

## Findings

- New: F-09 [P3] open, F-10 [P3] open.
- Carried forward, re-examined, code unchanged by this delta: F-03 [P3] open, F-05 [P3] fixed, F-06 [P3] open, F-07 [P2] open, F-08 [P3] open.
- No P0 or P1 finding is open or fixed.

## Remaining risk

- No test, typecheck or Verify command is configured, so these checks are unavailable and nothing here is a regression test.
- Real Upstash was never exercised: the local `.env` has no Upstash variables, and the 429 evidence comes from a fake Redis that reimplements the installed script (F-10).
- The limiter stays off in production until the Upstash variables are set in Vercel. Fail-open then allows every request, with only a log warning.
- The `x-real-ip` trust assumption comes from the spec and was not confirmed on a Vercel deployment. On any other host a client could set that header.
- `next start`, real providers and `curl` were not run, because this review could start no server and make no external calls. No dependency vulnerability scan was run.
- `request.json()` parses the whole body before any limit applies, so parsing is bounded only by the platform's body limit. No provider quota is spent on that path, and no quota cap across IPs exists, by the spec's own scope.

## Try it now

Run or do:

In one terminal, run `npm run dev`. In a second terminal, run:

```bash
curl -i localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"$(printf 'x%.0s' {1..501})\"}]}"
```

Expected:

`HTTP/1.1 400 Bad Request` with the body `{"error":"input_too_long"}`.

This proves:

`/api/chat` rejects a 501-character question before it reaches the rate limiter or any provider.
