# Fix: Malformed Upstash URL throws instead of failing open

**Type:** Fix
**Status:** verified
**Branch:** fix/malformed-upstash-url-throws-instead-of-failing-open
**Fixes:** F-09

## The problem

A limiter problem should let the request through, so a Redis outage costs quota protection rather than the whole chat. That rule only covers `limiter.limit()`, inside the `try` in `checkRateLimit`.

`lib/rate-limit.ts` builds the limiter at module load, outside that `try`. `new Redis` throws `UrlError` for a URL with no scheme or a trailing space, which is a common paste mistake. The route module then fails to load, so no chat request can be served.

`next build` with the bad value in scope exits 1, so a normal deploy stops. The gap is a build where the variable is absent, and `next dev`.

## The fix

Build the limiter inside a `try` in `lib/rate-limit.ts`. On a throw, log `error.name` through `logSkipped` and leave `limiter` as `null`. Requests then take the existing `NotConfigured` path.

Jonathan chose this over keeping the build failure. The trade-off is that a bad URL no longer stops a deploy: the site ships with rate limiting off, and the only sign is the log lines.

This must not break:

- **Valid configuration:** limits, window, prefix and timeout are unchanged, and the 21st request still returns `429` with `Retry-After`.
- **Missing configuration:** absent variables still skip the limiter and log `NotConfigured`.
- **Log privacy:** log the error name only, never the error object or message, which can hold the URL.
- **Wrong but well-formed URLs:** these still fail open through the existing `catch` in `checkRateLimit`.

## Build steps

- [x] **1. Catch limiter construction failures.** Move the construction in `lib/rate-limit.ts` into a small function with a `try`, and keep the change inside that file.
  **Done when:** with a malformed URL, the chat route loads and answers, and `npm run lint` and `npm run build` pass, including a build with the malformed URL in scope.

## Verify

No test command is configured, so evidence comes from running the real route under `next start` with a local fake `fetch` and no real provider calls. Keep the harness outside the repo.

| `UPSTASH_REDIS_REST_URL` | Expected result |
|---|---|
| No scheme, such as `example.upstash.io` | `200`, `UrlError` logged once, `NotConfigured` logged per request |
| Trailing space | `200`, same logs as above |
| `https://x y.io` | `200`, a skip reason logged. Observed `Timeout` under `next start`, because the request never reached the fake `fetch`. The audit's in-process run logged `UpstashJSONParseError`. |
| Unset | `200`, `NotConfigured` logged per request |
| Fake Redis at a valid URL | Requests 1-20 return `200`, the 21st returns `429` with `Retry-After` and makes no provider call |

Check that no log line contains the URL or the token.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2858,"specSha256":"641bd43c2e8d0755d983016cbe815a3d53ef3d4b356ff42c2a20a36714f67812","branch":"refs/heads/fix/malformed-upstash-url-throws-instead-of-failing-open","head":"dc413429fc454184dacf51958e25bfa5f8872aa8","baseRef":"refs/heads/main","baseCommit":"daa8ad0a8bdc30d83dbb24944f6378bd75c8b0a2","sourceTree":"cf5a3e945ea48f246ace04b3410704f77fcb935e","landing":"local-merge","absentOptional":[]} -->

## Findings

### malformed-upstash-url-throws-instead-of-failing-open/F-09 [P3] closed - A malformed Upstash URL throws instead of failing open

**File:** lib/rate-limit.ts:22
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality, security)
**Why it matters:** The spec says a thrown error allows the request, but `new Redis` runs at module load, outside the `try` in `checkRateLimit`, and throws `UrlError` for a URL with no scheme or with a trailing space, a common paste mistake. Running the real route in-process with a stubbed `fetch`, the route module failed to load for both values, so no chat request could be served. `next build` with the no-scheme value and the variable in scope exits 1 ("Failed to collect configuration for /api/chat"), so a normal deploy stops rather than shipping the fault. That is why this is P3. The gap remains where the variable is absent at build time, and in `next dev`. A URL that passes the check but is wrong does fail open: `https://x y.io` logged `UpstashJSONParseError` and returned 200.
**Suggested fix:** Decide which behaviour is wanted. Either build the limiter inside a `try` that logs `error.name` and leaves `limiter` null, or keep the build failure and record it in the spec as the accepted exception. The second removes no code but changes the spec, so it needs Jonathan's decision.
**Resolution:** Repaired 2026-10-31 on fix/malformed-upstash-url-throws-instead-of-failing-open: `createLimiter` builds the limiter inside a `try`, logs `error.name`, and leaves `limiter` null. Jonathan chose this over keeping the build failure, so a bad URL no longer stops a deploy and the site ships with rate limiting off. Under `next start` with a fake fetch, a no-scheme URL and a trailing-space URL each returned `200`, logged `UrlError` once and `NotConfigured` per request. `https://x y.io` returned `200` and logged `Timeout`, because the request never reached the fake fetch. An empty URL returned `200` and logged `NotConfigured`. Against a fake Redis, requests 1-20 returned `200`, 21 and 22 returned `429`, the last with `Retry-After`, and provider calls were 20. `next build` with a no-scheme URL exits 0 and logs `UrlError`. No URL or token appeared in the logs. Real providers and real Upstash not exercised. Re-review 2026-10-31 (independent, target dc41342): closed. The original defect is gone and the repair introduced no new one. `new Redis` now runs inside the `try` in `createLimiter`, and the catch logs only `error.name`, while `UrlError` carries the URL in its message. In an export of the target with no `.env`, under `next start` with all outbound traffic stubbed: no-scheme, trailing-space and quoted URLs each returned `200` with `UrlError` once and `NotConfigured` per request, and `https://x y.io` returned `200` with `Timeout`. Unset URL, unset token and both unset returned `200` with `NotConfigured`. Redis `500`, non-JSON, network failure and a hang each failed open through the existing path. Against a fake Redis, requests 1-20 returned `200`, 21 and 22 returned `429` with `Retry-After`, and provider calls were 20. `npm run build` exits 0 with a no-scheme URL and with the variables unset. Sentinel URL and token values appeared in no log or build artifact. Real providers and real Upstash not exercised.

## Independent review

**Status:** passed
**Target commit:** dc413429fc454184dacf51958e25bfa5f8872aa8
**Base commit:** daa8ad0a8bdc30d83dbb24944f6378bd75c8b0a2
**Base ref:** main
**Spec hash:** 641bd43c2e8d0755d983016cbe815a3d53ef3d4b356ff42c2a20a36714f67812
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-31T21:37:12Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-31T21:42:03Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `daa8ad0a8bdc30d83dbb24944f6378bd75c8b0a2..dc413429fc454184dacf51958e25bfa5f8872aa8` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `npm run lint`: pass (exit 0, in the checkout)
- `npx tsc --noEmit -p .`: pass (exit 0, in the checkout; extra signal, not a declared command)
- `npm run build` with a no-scheme URL in scope: pass (exit 0, in a temp export of the target)
- `npm run build` with the Upstash variables unset: pass (exit 0, in a temp export of the target)
- `next start` route matrix, 14 cases with all outbound traffic stubbed: pass (temp export and harness outside the repo, no `.env`)
- Test command: unavailable, none declared
- Typecheck command: unavailable, none declared
- Verify command: unavailable, none declared
- Browser tests: unavailable, none declared
- `/check`: not run, not required by this request

## Evidence

- Preconditions matched: `HEAD`, merge base from `main`, spec hash, reviewer adapter and model. Only `blueprint/context/review.md` differed from the target.
- Product delta is `lib/rate-limit.ts` only, as step 1 requires. Limits, window, prefix, timeout and `analytics: false` are unchanged, and `new Redis` is now inside the `try`.
- Log privacy: the catch logs `error.name` only. `UrlError` holds the URL in its message, and the message is never logged. Sentinel URL and token values appeared in no server log, build log or build artifact. Upstash's own constructor warnings hold no value.
- No-scheme, trailing-space and quoted URLs: `200`, `UrlError` once, `NotConfigured` per request.
- `https://x y.io`: `200`, `Timeout` per request, 1 to 1.5 seconds added, no fetch reached. A multi-character host with a space, `https://sentinel y.io`, takes the `UrlError` path instead.
- Unset URL, unset token, both unset: `200`, `NotConfigured` per request.
- Redis `500`, non-JSON response, network failure and hang: `200`, each with a fixed skip reason.
- Fake Redis at a valid URL: requests 1-20 `200`, 21 and 22 `429` with `Retry-After`, 20 provider calls.

## Findings

- None new. F-09 closed. No P0 or P1 finding is `open` or `fixed`.
- Left unchanged, outside this delta: F-03, F-05, F-06, F-07, F-08 (`fixed`) and F-10, F-11, F-12 (`open`).

## Remaining risk

- Accepted trade-off in the spec: a malformed URL no longer stops a deploy, so the site can ship with rate limiting off, and the only sign is the log lines. Check the logs for `UrlError` or `NotConfigured` after the first deploy.
- Real Upstash and real providers were not exercised. The Redis responses, provider stream and harness were fakes.
- The fake `fetch` does not validate headers, so a token with a newline was not proved against real `fetch`. Any such throw would land in the existing `catch`.
- `next dev` was not run, by instruction. The module-load path it shares with `next start` was exercised.
- No test, typecheck, Verify or Browser tests command is declared, so there is no automated regression test for this fix.

## Try it now

Run or do:

```bash
npm run build
UPSTASH_REDIS_REST_URL=example.upstash.io UPSTASH_REDIS_REST_TOKEN=x npm run start -- -p 3100
```

Then, in a second terminal:

```bash
curl -i -X POST localhost:3100/api/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"What does Jonathan do?"}]}'
```

This sends one real question to your first configured provider.

Expected:

`HTTP/1.1 200 OK` with a streamed answer. The server terminal shows `Rate limit skipped { reason: 'UrlError' }` once, then `Rate limit skipped { reason: 'NotConfigured' }`, but never the URL.

This proves:

The chat route still loads and answers when the Upstash URL is malformed.
