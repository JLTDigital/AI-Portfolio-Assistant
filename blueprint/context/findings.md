# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-03 [P3] open - Failure logs omit the most useful provider failures

**File:** app/api/chat/route.ts:103
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** `statusCode` is read only from `APICallError`. In the harness, three `429` responses logged `AI_RetryError` with `statusCode: undefined`, the shape a quota failure takes after retries. `AI_StreamProviderError` also logged no status. The empty-answer `502` at line 110 logs nothing, so that failure leaves no server trace.
**Suggested fix:** Read the status from `RetryError.lastError` when the error is a `RetryError`, include a stream provider error's status if present, and add a fixed-name log line for the empty-answer path. Still log no message or object.
**Resolution:** `RetryError` now logs `lastError` status (harness: `429`), and an empty answer logs `EmptyAnswer`. `AI_StreamProviderError` still logs no status. Re-review 2026-10-31 (independent, target 71d386d): moved back to open, repair partial. The `RetryError` and empty-answer parts are confirmed, but the stream provider part of the suggested fix was not made and no user decision accepts leaving it. `StreamProviderError` has its own `statusCode`: a fake mid-stream `{ error: { code: 503 } }` gave `statusCode: 503` on the part, and line 79 discards it because it reads the status only from `APICallError`. Line 79 should read it from `StreamProviderError` too, which `ai` exports. Still log no message or object. Re-review 2026-10-31 (independent, target ff7a9ca): still open at line 103. Under `next start` with a fake fetch, an in-band `{ error: { code: 503 } }` before first text fell through correctly but logged `AI_StreamProviderError` with `statusCode: undefined`.

### F-05 [P3] fixed - Pinned model's free-tier status is unconfirmed

**File:** app/api/chat/route.ts:6
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** Step 1 requires a stable Gemini Flash model confirmed on the free tier. The spec's Implementation notes say `gemini-3.5-flash-lite` was chosen from runtime testing and that Google's free-tier limits for it were not read. This review made no external calls, so it could not confirm either point.
**Suggested fix:** Check Google's model list and free-tier limits, then record the result in the spec's Implementation notes or change `MODEL`.
**Resolution:** Google's pricing page lists the model as free of charge with no preview label, but doesn't state it is stable. Per-model limits are shown only in AI Studio and were not read. Recorded in the spec's Implementation notes. Re-review 2026-10-31 (independent, target 71d386d): left `fixed`, not closed. The note is in the spec, but this review made no external calls, so it could not confirm Google's page. The note also says the model is not stated to be stable, while step 1 asks for a stable Flash model and is checked. Jonathan should confirm or accept this. Re-review 2026-10-31 (independent, target ff7a9ca): left `fixed`, not closed. The value is unchanged, now at line 8 as `GOOGLE_MODEL`, and this review again made no external calls.

### F-06 [P3] open - Window can still start with an assistant message

**File:** app/api/chat/route.ts:75
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says to drop a leading `assistant` message "so it starts with user", but `recentMessages` drops exactly one, and validation doesn't require roles to alternate. Under `next start` with a fake fetch, `[assistant, assistant, user]` returned `200` and reached the provider as `["model", "user"]`. Any client can send that shape, though feature 7's normal alternating history would not. Whether Gemini rejects it was not tested, because this review made no external calls. If it does, an invalid history would show as a `502 provider_error`, not a `400`.
**Suggested fix:** Slice from the first `user` message in the window, for example `recent.slice(recent.findIndex((m) => m.role === "user"))`. The last message is always `user`, so the index always exists.
**Resolution:** Re-review 2026-10-31 (independent, target ff7a9ca): still open at line 75. With a fake fetch, `[assistant, assistant, user]` reached Gemini as `["model", "user"]` and Groq as `["system", "assistant", "user"]`. With the chain, a provider that rejects this shape now costs one failed attempt and falls through instead of returning `502`. Real provider behaviour remains untested.

### F-07 [P2] open - A whitespace-only answer skips the fallback

**File:** app/api/chat/route.ts:84
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says an empty answer falls through, but `nextText` treats any non-empty delta as the first text. Under `next start` with a fake fetch, a Gemini answer of `\n\n` that finished with `stop` returned `200` with a blank body, called only Gemini and logged nothing, with healthy fallbacks available. A single space followed by a stream error ended the client read with curl exit 18 and also tried no other provider. No real provider has been seen doing this, so reachability is unconfirmed.
**Suggested fix:** In `startAnswer`, keep reading until the first text has non-whitespace content, then send the text read so far as `firstText`. Stream all later chunks unchanged, and treat an all-whitespace answer as `EmptyAnswer`.
**Resolution:**

### F-08 [P3] open - The `RetryError` branch in `logFailure` can no longer run

**File:** app/api/chat/route.ts:99
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** `maxRetries: 0` is the only retry setting in the route, and `retryWithExponentialBackoffInternal` rethrows the original error when `maxRetries === 0`, so `RetryError` is never created. A fake `429` and `500` both logged `AI_APICallError` with the status directly. The branch and its import now describe behaviour the route does not have.
**Suggested fix:** Delete the `RetryError` import and the `cause` line, and read `statusCode` from the error itself. The replacement is the direct check already in `logFailure`. Current requirement lost: None. Do this together with F-03.
**Resolution:**
