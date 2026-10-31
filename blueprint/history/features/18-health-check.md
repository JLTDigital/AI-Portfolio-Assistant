# Feature: Health check

**From build-plan:** feature 18
**Build attempt:** 1
**Branch:** feature/health-check
**Status:** verified

## Goal

Add a public `GET /api/health` endpoint that reports app status and whether each
LLM provider can be reached, without spending LLM tokens or exposing secrets.

## In scope

- `GET /api/health` returning the JSON contract below.
- One lightweight, authenticated, non-generating probe per configured provider.
- Moving the provider list out of the chat route so both routes share one
  definition.
- A 60-second in-process memo of the probe result, so repeated public requests
  can't fan out into provider calls.

## Out of scope

- Generating text, checking a pinned model still exists, or reporting remaining
  quota. "Reachable" means the provider answered and accepted the key, not that
  chat is guaranteed to succeed.
- Probing Upstash or reporting rate-limit status. The plan names providers only.
- Rate-limiting this route through `checkRateLimit`. It would spend visitors'
  chat allowance.
- Any UI, monitor, cron, or alerting. The overview declares no workers/cron and
  no uptime guarantee.
- Changing chat behavior, including provider order, models, and timeouts.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then stop for one review of
the whole feature. `workflow.checkpointCommits` is `disabled`, so make no
checkpoint commits. `/complete` creates the final feature commit.

## Build steps

- [x] **1. Share the provider list.** Create `lib/chat/providers.ts` and move
  `GOOGLE_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL`, and `PROVIDERS` into it
  unchanged, exporting `PROVIDERS`. Import it in `app/api/chat/route.ts`.
  Done when `npm run lint` and `npm run build` pass, and `POST /api/chat` still
  gets a streamed answer or its existing error response.
- [x] **2. Add the probe definitions.** Give each `PROVIDERS` entry a
  `probe(key)` returning the URL and headers from Data / contracts. First confirm
  each endpoint against the provider's current docs: it must require the key and
  generate nothing. If one can't meet both, stop and raise it rather than
  substituting a generation call.
  Done when each entry has a probe with the key in a header, never the URL, and
  `npm run lint` passes.
- [x] **3. Add the health logic.** Create `lib/chat/health.ts` with `getHealth()`.
  It probes configured providers in parallel with a 5-second timeout each, maps
  results to the contract, logs failures, and memoizes the in-flight or finished
  result for 60 seconds.
  Done when `npm run lint` passes and the route in step 4 can call it.
- [x] **4. Add the route.** Create `app/api/health/route.ts` exporting `GET`.
  `cacheComponents` is on, so confirm from `node_modules/next/dist/docs/` how to
  force request-time rendering, expected to be `await connection()` from
  `next/server` before any probe. Return the body with `Cache-Control: no-store`
  and the status from Data / contracts.
  Done when `npm run build` passes, lists `/api/health` as dynamic, and made no
  probe at build time, and `curl -i localhost:3000/api/health` matches the
  contract with the local keys.
- [x] **5. Check the failure paths.** Run the dev server with one key removed,
  one key invalid, then all keys removed.
  Done when these return `not_configured`, `unreachable`, and a `503` with
  `status: "down"` respectively, a second request inside 60 seconds makes no new
  provider calls, and no response or log contains a key.

## Files / areas

- `lib/chat/providers.ts` - new, shared provider list and probes
- `lib/chat/health.ts` - new, probe, status mapping, and memo
- `app/api/health/route.ts` - new, thin GET handler
- `app/api/chat/route.ts` - import `PROVIDERS` instead of defining it

## Data / contracts

**Route:** `GET /api/health`. Public, no input, no auth, consistent with the
anonymous app. Other methods get Next's default `405`.

**Response body:**

```json
{
  "status": "ok",
  "providers": {
    "google": "reachable",
    "groq": "reachable",
    "openrouter": "not_configured"
  }
}
```

**Provider values:**

| Value | Meaning |
| --- | --- |
| `reachable` | The probe returned a 2xx response |
| `unreachable` | Non-2xx (including a rejected key or 429), network error, or timeout |
| `not_configured` | The provider's key variable is unset or empty; no call is made |

**Overall status:**

| `status` | HTTP | Rule |
| --- | --- | --- |
| `ok` | 200 | At least one provider is reachable and none is `unreachable` |
| `degraded` | 200 | At least one is reachable and at least one is `unreachable` |
| `down` | 503 | None is reachable, including when none is configured |

`down` matches the chat route, which then has no provider that can answer and
shows signal lost. The body is still returned on `503`.

**Probes:** all `GET`, using the same key variables as chat.

| Provider | URL | Key header |
| --- | --- | --- |
| `google` | `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1` | `x-goog-api-key: <key>` |
| `groq` | `https://api.groq.com/openai/v1/models` | `Authorization: Bearer <key>` |
| `openrouter` | `https://openrouter.ai/api/v1/key` | `Authorization: Bearer <key>` |

OpenRouter's public `/models` list doesn't check the key, so it uses `/key`.

**Safety:** the body holds only the fixed names and values above, never keys,
upstream bodies, or error messages. Failures log only provider, error name, and
status code, matching `logFailure` in the chat route.

**Errors:** `getHealth()` catches every probe failure, so an upstream failure
always becomes `unreachable`, never a `500`.

## Testing

No test runner or Verify command is configured, so add no automated tests. Run
`npm run lint` and `npm run build`, then the manual checks in steps 4 and 5.
Calling real providers needs the local keys in `.env`; don't print their values.

**Evidence, 2026-10-31:**

- Lint and build pass, and the build lists `/api/health` as dynamic.
- Against the running dev server with real keys, all three providers were
  `reachable` with `status: "ok"`, a 200, and `Cache-Control: no-store`. The second
  request took 22ms against 1.4s. `POST` returned 405, and chat's `invalid_request`
  400 is unchanged.
- Step 5 ran in a Node harness calling the real `getHealth()` and `GET`, not a
  restarted dev server, because `/implement` doesn't start one. No keys gave
  `not_configured`, `down`, and a 503 with no provider calls. Fake keys gave
  `unreachable` from all three real providers (401, 400, 401). A second call made
  no new provider calls, and logs held only provider, error name, and status.
- Stubbed `fetch` covered `degraded` for a 429, a network error, and a timeout. No
  real provider timeout was observed.
- A full streamed chat answer was not re-run after the provider list moved.

## Notes for the AI

- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`
  and the caching guide before writing the route. With `cacheComponents`, a `GET`
  that doesn't read the request could otherwise be prerendered, which would probe
  at build time and freeze the result.
- Use `fetch` with `AbortSignal.timeout`; add no dependency. Reuse the
  `process.env[keyVariable]` check from the chat route.
- Keep the memo a module-level promise plus expiry. It is per serverless instance,
  which is enough to stop one instance fanning out, so don't add Redis. Failed
  results are memoized too.
- The endpoint URLs are from memory until step 2 confirms them.
- This feature answers the overview's "Health check scope" open question:
  reachability is reported and probing spends no LLM quota. Leave the plans alone
  here. Removing that item is a follow-up through the plans and `/overview`.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7743,"specSha256":"7a4368c5517912b806c8c658771594b847eb0ea728732ea309757257cf88c05b","branch":"refs/heads/feature/health-check","head":"d952d8b28a38c6583adc3607982a7e40f4957c1c","baseRef":"refs/heads/main","baseCommit":"6b56864295d32fad84981743e16b0cd6b2f5b88d","sourceTree":"d503512a6900015920ca1adcc80b34a48959867d","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** d952d8b28a38c6583adc3607982a7e40f4957c1c
**Base commit:** 6b56864295d32fad84981743e16b0cd6b2f5b88d
**Base ref:** main
**Spec hash:** 7a4368c5517912b806c8c658771594b847eb0ea728732ea309757257cf88c05b
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-31T19:49:36Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-31T19:55:00Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `6b56864295d32fad84981743e16b0cd6b2f5b88d..d952d8b28a38c6583adc3607982a7e40f4957c1c` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

Run in a scratchpad export of the target commit with no `.env`, so the checkout stayed unchanged and no real key was reachable.

- `npm run lint`: pass (exit 0)
- `npx tsc --noEmit`: pass (exit 0, after the build generated its inputs)
- `npm run build`: pass (`/api/health` listed as dynamic, fake keys, recording `fetch` preload)
- Stubbed harness on the real `lib/chat/health.ts`: pass
- Tests, Verify, Browser tests: unavailable, none configured
- `/check`: not run, not required by this request

## Evidence

- Freshness: `HEAD`, `main` merge base and spec SHA-256 matched the request, and only this file differed from the target. The spec is tracked, so no snapshot applies.
- Delta `6b56864..d952d8b` read in full: chat route, health route, `lib/chat/health.ts`, `lib/chat/providers.ts`, and the spec. The chat route change is imports and the moved list only, with order, models and key checks unchanged.
- Build made 0 provider calls. The recorder caught a deliberate control fetch, so 0 is meaningful. Removing `connection()` also stayed dynamic with 0 calls, so that test does not prove `connection()` is what keeps the route dynamic.
- Harness results: no or empty keys gave `not_configured`, `down` and 0 calls. One key removed gave `ok` with `not_configured`. A 429 gave `degraded`. All 401 gave `down`. A 204 counted as reachable. A hung probe resolved `unreachable` at 5007ms with `TimeoutError`.
- Memo: 50 concurrent calls made 3 provider calls and shared one result. There were no new calls at +59s and 3 more at +61s. Failed results were also memoized.
- Safety: URLs, headers and timeout signal match the contract. Keys appeared only in headers. A key planted in an upstream error message and body did not reach the logs. A key that is an invalid header value gave `unreachable`, not a throw.
- Route handler with only `connection()` stubbed: 503, `Cache-Control: no-store`, contract body, and 0 calls with no keys.
- `connection()` usage matches `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`.

## Findings

- None new. No P0 or P1 finding is `open` or `fixed`.
- Carried and re-examined, line references updated: F-03 [P3] open, F-05 [P3] fixed, F-06 [P3] open, F-07 [P2] open, F-08 [P3] open.
- Outside this delta and not re-examined: F-09 [P3] open, F-10 [P3] open.

## Remaining risk

- Tests, Verify and Browser tests are unavailable because none are configured.
- This review started no server and made no provider calls. `connection()` throws outside a request, so the real `GET` was not run end to end, and the memo was not observed under `next start`.
- Real endpoint behaviour rests on the spec's recorded evidence (200s with real keys, rejection of fake keys). This review could not confirm the current provider docs. Step 2's docs confirmation is not recorded in the spec or commit message.
- Step 5 ran in a builder harness, not the dev server the step names, as the spec discloses. No real provider timeout was observed.
- A full streamed chat answer was not re-run after the provider list moved. The diff shows a pure move, and this review also did not request an answer.
- F-10's line reference points at an earlier spec that this file has since replaced.

## Try it now

Run or do:

Run `npm run dev` if the app isn't already running, then:

```bash
curl -i localhost:3000/api/health
```

Expected:

```text
HTTP/1.1 200 OK
cache-control: no-store

{"status":"ok","providers":{"google":"reachable","groq":"reachable","openrouter":"reachable"}}
```

This proves:

The route is live and reports each provider's status with the local keys.
