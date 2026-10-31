# Fix: Whitespace-only answers skip the fallback

**Type:** Fix
**Status:** verified
**Branch:** fix/whitespace-only-answers-skip-the-fallback
**Fixes:** F-07

## The problem

The provider fallback chain promises that an empty answer falls through to the next provider. In `app/api/chat/route.ts`, `startAnswer` treats the first non-empty delta from `nextText` as the start of the answer, so a chunk holding only whitespace counts as text and commits the request to that provider.

- A Gemini answer of `\n\n` that finishes with `stop` returns `200` with a blank body, calls only Gemini and logs nothing, even when the fallbacks are healthy.
- A single space followed by a stream error ends the client's read with a failure, and the fallbacks are not tried, although nothing useful has reached the visitor.

## The fix

Commit to a provider only once its text has non-whitespace content. In `startAnswer`, keep reading through `nextText` and accumulating until the accumulated text has non-whitespace content, then return all of it as `firstText`. If the stream ends first, throw the existing `EmptyAnswer` error.

This must not break:

- **Later chunks:** everything after `firstText` streams unchanged, including whitespace, so spacing inside an answer is preserved.
- **Leading whitespace:** it is kept in `firstText`, not trimmed. The fix only delays the commit point.
- **`FIRST_TEXT_TIMEOUT_MS`:** the timer keeps running until visible text arrives, so a provider that sends only whitespace and then stalls falls through.
- **Falling through:** an error, abort or non-`stop` finish after whitespace throws from `nextText` and reaches the existing `catch`, so it falls through and is logged by `logFailure`. Add no new error type.
- **Empty answers:** an all-whitespace answer logs the same `EmptyAnswer` name as a truly empty one. If every provider gives one, the response is the existing `502` `provider_error`.
- **Logging:** log no message text or object.

`nextText` keeps its behaviour, because the `pull` loop depends on it. No new dependency, configuration or shared helper. The failure-log findings F-03 and F-08 are separate, and this fix leaves `logFailure` alone.

## Build steps

- [x] **1. Wait for visible text before committing to a provider.** Change `startAnswer` in `app/api/chat/route.ts` as described above. Keep the change inside `app/api/chat/route.ts`.
  **Done when:** with stubbed providers, each case in Verify gives the listed result, and `npm run lint` and `npm run build` pass.

## Verify

No test command is configured, so evidence comes from running the real route with a local fake `fetch` or stubbed providers, with no real provider calls. Keep the harness outside the repo.

| Case | Expected result |
|---|---|
| Gemini sends `\n\n` and finishes with `stop`, Groq answers normally | `200` with Groq's answer; `EmptyAnswer` logged for Gemini |
| Gemini sends a single space then a stream error, Groq answers normally | `200` with Groq's answer; the failure logged for Gemini |
| Gemini sends whitespace then stalls past `FIRST_TEXT_TIMEOUT_MS`, Groq answers normally | `200` with Groq's answer |
| Every provider sends only whitespace | `502` `provider_error`; each attempt logged as `EmptyAnswer` |
| Gemini sends `\n\nHello`, then ` world` and `\n\nBye` | `200` with exactly `\n\nHello world\n\nBye`; Groq not called |
| Gemini errors after visible text | The client's read fails as it does today; Groq not called |

The first three cases also need the attempt count, to prove the fallback ran once. Real provider behaviour stays unexercised, and the review should say so.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3615,"specSha256":"a195de6b4b27a76e493aa795e0bc4ddd89109f9c68501384391f63bd075af590","branch":"refs/heads/fix/whitespace-only-answers-skip-the-fallback","head":"9b3a66433028da353f0c86299edc685dffc5f103","baseRef":"refs/heads/main","baseCommit":"9b3a66433028da353f0c86299edc685dffc5f103","sourceTree":"4a3644f7a0a6adc72d585266690eacd65e9a3227","landing":"local-merge","absentOptional":[]} -->
