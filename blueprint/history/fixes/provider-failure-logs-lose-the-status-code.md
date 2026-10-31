# Fix: Provider failure logs lose the status code

**Type:** Fix
**Status:** verified
**Branch:** fix/provider-failure-logs-lose-the-status-code
**Fixes:** F-03, F-08

## The problem

`logFailure` in `app/api/chat/route.ts` has two connected defects:

- **F-03:** it reads `statusCode` only from `APICallError`. `StreamProviderError` has its own `statusCode`, so an in-band `{ error: { code: 503 } }` falls through correctly but logs `AI_StreamProviderError` with `statusCode: undefined`. That loses the most useful detail about a provider failure.
- **F-08:** the route sets `maxRetries: 0`, so the SDK never creates a `RetryError`. The `RetryError` import and the `cause` line describe behaviour the route does not have.

## The fix

In `logFailure`, delete the `cause` line and the `RetryError` import, and read `statusCode` directly from the error when it is an `APICallError` or a `StreamProviderError`. `ai` exports `StreamProviderError`; use its `isInstance` check, matching the existing `APICallError` check.

This must not break:

- **What gets logged:** still only `provider`, `name` and `statusCode`. Never log a message or an error object, because SDK errors can hold the visitor's text and the system prompt.
- **Other errors:** `EmptyAnswer`, `IncompleteAnswer`, `AbortError` and unknown errors keep logging `statusCode: undefined`.
- **Everything else in the route:** `maxRetries: 0` and the fallback behaviour are unchanged. No new dependency or helper.

## Build steps

- [x] **1. Read the status from the error itself.** Change `logFailure` and the `ai` import in `app/api/chat/route.ts` as described above. Keep the change inside that file.
  **Done when:** with stubbed providers, each case in Verify gives the listed log line, and `npm run lint` and `npm run build` pass.

## Verify

No test command is configured, so evidence comes from running the real route under `next start` with a local fake `fetch`, with no real provider calls. Keep the harness outside the repo.

| Case | Expected log line for Google, then a Groq answer |
|---|---|
| HTTP `429` | `AI_APICallError`, `statusCode: 429` |
| HTTP `500` | `AI_APICallError`, `statusCode: 500` |
| In-band `{ error: { code: 503 } }` before first text | `AI_StreamProviderError`, `statusCode: 503` |
| Whitespace then `stop` | `EmptyAnswer`, `statusCode: undefined` |

Also confirm that `RetryError` no longer appears in `app/api/chat/route.ts`, and that the log output holds no visitor text or system prompt. Real provider failures stay unexercised, and the review should say so.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2555,"specSha256":"7b41592f524b3fa67e256fac93dd4130613a94a92ba23171a530126de1eef7f2","branch":"refs/heads/fix/provider-failure-logs-lose-the-status-code","head":"503bce798256d075d7de281e237c9b796e16367c","baseRef":"refs/heads/main","baseCommit":"503bce798256d075d7de281e237c9b796e16367c","sourceTree":"f46d7de2a00161e28cbd0c99c81aa233de4c1016","landing":"local-merge","absentOptional":[]} -->
