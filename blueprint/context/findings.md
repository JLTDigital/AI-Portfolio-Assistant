# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-03 [P3] open - Failure logs omit the most useful provider failures

**File:** app/api/chat/route.ts:74
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** `statusCode` is read only from `APICallError`. In the harness, three `429` responses logged `AI_RetryError` with `statusCode: undefined`, the shape a quota failure takes after retries. `AI_StreamProviderError` also logged no status. The empty-answer `502` at line 110 logs nothing, so that failure leaves no server trace.
**Suggested fix:** Read the status from `RetryError.lastError` when the error is a `RetryError`, include a stream provider error's status if present, and add a fixed-name log line for the empty-answer path. Still log no message or object.
**Resolution:** `RetryError` now logs `lastError` status (harness: `429`), and an empty answer logs `EmptyAnswer`. `AI_StreamProviderError` still logs no status. Re-review 2026-10-31 (independent, target 71d386d): moved back to open, repair partial. The `RetryError` and empty-answer parts are confirmed, but the stream provider part of the suggested fix was not made and no user decision accepts leaving it. `StreamProviderError` has its own `statusCode`: a fake mid-stream `{ error: { code: 503 } }` gave `statusCode: 503` on the part, and line 79 discards it because it reads the status only from `APICallError`. Line 79 should read it from `StreamProviderError` too, which `ai` exports. Still log no message or object.

### F-05 [P3] fixed - Pinned model's free-tier status is unconfirmed

**File:** app/api/chat/route.ts:6
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** Step 1 requires a stable Gemini Flash model confirmed on the free tier. The spec's Implementation notes say `gemini-3.5-flash-lite` was chosen from runtime testing and that Google's free-tier limits for it were not read. This review made no external calls, so it could not confirm either point.
**Suggested fix:** Check Google's model list and free-tier limits, then record the result in the spec's Implementation notes or change `MODEL`.
**Resolution:** Google's pricing page lists the model as free of charge with no preview label, but doesn't state it is stable. Per-model limits are shown only in AI Studio and were not read. Recorded in the spec's Implementation notes. Re-review 2026-10-31 (independent, target 71d386d): left `fixed`, not closed. The note is in the spec, but this review made no external calls, so it could not confirm Google's page. The note also says the model is not stated to be stable, while step 1 asks for a stable Flash model and is checked. Jonathan should confirm or accept this.

### F-06 [P3] open - Window can still start with an assistant message

**File:** app/api/chat/route.ts:52
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says to drop a leading `assistant` message "so it starts with user", but `recentMessages` drops exactly one, and validation doesn't require roles to alternate. Under `next start` with a fake fetch, `[assistant, assistant, user]` returned `200` and reached the provider as `["model", "user"]`. Any client can send that shape, though feature 7's normal alternating history would not. Whether Gemini rejects it was not tested, because this review made no external calls. If it does, an invalid history would show as a `502 provider_error`, not a `400`.
**Suggested fix:** Slice from the first `user` message in the window, for example `recent.slice(recent.findIndex((m) => m.role === "user"))`. The last message is always `user`, so the index always exists.
**Resolution:**
