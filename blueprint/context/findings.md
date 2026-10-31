# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-03 [P3] open - Failure logs omit the most useful provider failures

**File:** app/api/chat/route.ts:107
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** `statusCode` is read only from `APICallError`. In the harness, three `429` responses logged `AI_RetryError` with `statusCode: undefined`, the shape a quota failure takes after retries. `AI_StreamProviderError` also logged no status. The empty-answer `502` at line 110 logs nothing, so that failure leaves no server trace.
**Suggested fix:** Read the status from `RetryError.lastError` when the error is a `RetryError`, include a stream provider error's status if present, and add a fixed-name log line for the empty-answer path. Still log no message or object.
**Resolution:** `RetryError` now logs `lastError` status (harness: `429`), and an empty answer logs `EmptyAnswer`. `AI_StreamProviderError` still logs no status. Re-review 2026-10-31 (independent, target 71d386d): moved back to open, repair partial. The `RetryError` and empty-answer parts are confirmed, but the stream provider part of the suggested fix was not made and no user decision accepts leaving it. `StreamProviderError` has its own `statusCode`: a fake mid-stream `{ error: { code: 503 } }` gave `statusCode: 503` on the part, and line 79 discards it because it reads the status only from `APICallError`. Line 79 should read it from `StreamProviderError` too, which `ai` exports. Still log no message or object. Re-review 2026-10-31 (independent, target ff7a9ca): still open at line 103. Under `next start` with a fake fetch, an in-band `{ error: { code: 503 } }` before first text fell through correctly but logged `AI_StreamProviderError` with `statusCode: undefined`. Re-review 2026-10-31 (independent, target 35b1daa): still open, code unchanged by this delta, now at line 131. Re-review 2026-10-31 (independent, target d952d8b): still open. This delta moved only imports and the provider list, so the logic is unchanged, now at line 107.

### F-05 [P3] fixed - Pinned model's free-tier status is unconfirmed

**File:** lib/chat/providers.ts:5
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** Step 1 requires a stable Gemini Flash model confirmed on the free tier. The spec's Implementation notes say `gemini-3.5-flash-lite` was chosen from runtime testing and that Google's free-tier limits for it were not read. This review made no external calls, so it could not confirm either point.
**Suggested fix:** Check Google's model list and free-tier limits, then record the result in the spec's Implementation notes or change `MODEL`.
**Resolution:** Google's pricing page lists the model as free of charge with no preview label, but doesn't state it is stable. Per-model limits are shown only in AI Studio and were not read. Recorded in the spec's Implementation notes. Re-review 2026-10-31 (independent, target 71d386d): left `fixed`, not closed. The note is in the spec, but this review made no external calls, so it could not confirm Google's page. The note also says the model is not stated to be stable, while step 1 asks for a stable Flash model and is checked. Jonathan should confirm or accept this. Re-review 2026-10-31 (independent, target ff7a9ca): left `fixed`, not closed. The value is unchanged, now at line 8 as `GOOGLE_MODEL`, and this review again made no external calls. Re-review 2026-10-31 (independent, target 35b1daa): left `fixed`, not closed, for the same reason. The value is unchanged, now at line 9. Re-review 2026-10-31 (independent, target d952d8b): left `fixed`, not closed, because this review again made no external calls. The value moved unchanged to `lib/chat/providers.ts:5`.

### F-06 [P3] open - Window can still start with an assistant message

**File:** app/api/chat/route.ts:79
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says to drop a leading `assistant` message "so it starts with user", but `recentMessages` drops exactly one, and validation doesn't require roles to alternate. Under `next start` with a fake fetch, `[assistant, assistant, user]` returned `200` and reached the provider as `["model", "user"]`. Any client can send that shape, though feature 7's normal alternating history would not. Whether Gemini rejects it was not tested, because this review made no external calls. If it does, an invalid history would show as a `502 provider_error`, not a `400`.
**Suggested fix:** Slice from the first `user` message in the window, for example `recent.slice(recent.findIndex((m) => m.role === "user"))`. The last message is always `user`, so the index always exists.
**Resolution:** Re-review 2026-10-31 (independent, target ff7a9ca): still open at line 75. With a fake fetch, `[assistant, assistant, user]` reached Gemini as `["model", "user"]` and Groq as `["system", "assistant", "user"]`. With the chain, a provider that rejects this shape now costs one failed attempt and falls through instead of returning `502`. Real provider behaviour remains untested. Re-review 2026-10-31 (independent, target 35b1daa): still open, code unchanged by this delta, now at line 103. Re-review 2026-10-31 (independent, target d952d8b): still open, logic unchanged, now at line 79.

### F-07 [P2] fixed - A whitespace-only answer skips the fallback

**File:** app/api/chat/route.ts:88
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says an empty answer falls through, but `nextText` treats any non-empty delta as the first text. Under `next start` with a fake fetch, a Gemini answer of `\n\n` that finished with `stop` returned `200` with a blank body, called only Gemini and logged nothing, with healthy fallbacks available. A single space followed by a stream error ended the client read with curl exit 18 and also tried no other provider. No real provider has been seen doing this, so reachability is unconfirmed.
**Suggested fix:** In `startAnswer`, keep reading until the first text has non-whitespace content, then send the text read so far as `firstText`. Stream all later chunks unchanged, and treat an all-whitespace answer as `EmptyAnswer`.
**Resolution:** Re-review 2026-10-31 (independent, target 35b1daa): still open, code unchanged by this delta, now at line 112. Re-review 2026-10-31 (independent, target d952d8b): still open, logic unchanged, now at line 88. Repaired 2026-10-31 on fix/whitespace-only-answers-skip-the-fallback: `startAnswer` now waits for visible text through `firstVisibleText`. Under `next start` with a fake fetch, whitespace then `stop`, a stream error or a stall each fell through to Groq, all-whitespace answers returned `502`, and spacing in a normal answer was unchanged. Real providers not exercised.

### F-08 [P3] open - The `RetryError` branch in `logFailure` can no longer run

**File:** app/api/chat/route.ts:103
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** `maxRetries: 0` is the only retry setting in the route, and `retryWithExponentialBackoffInternal` rethrows the original error when `maxRetries === 0`, so `RetryError` is never created. A fake `429` and `500` both logged `AI_APICallError` with the status directly. The branch and its import now describe behaviour the route does not have.
**Suggested fix:** Delete the `RetryError` import and the `cause` line, and read `statusCode` from the error itself. The replacement is the direct check already in `logFailure`. Current requirement lost: None. Do this together with F-03.
**Resolution:** Re-review 2026-10-31 (independent, target 35b1daa): still open, code unchanged by this delta, now at line 127. Re-review 2026-10-31 (independent, target d952d8b): still open, logic unchanged, now at line 103.

### F-09 [P3] open - A malformed Upstash URL throws instead of failing open

**File:** lib/rate-limit.ts:12
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality, security)
**Why it matters:** The spec says a thrown error allows the request, but `new Redis` runs at module load, outside the `try` in `checkRateLimit`, and throws `UrlError` for a URL with no scheme or with a trailing space, a common paste mistake. Running the real route in-process with a stubbed `fetch`, the route module failed to load for both values, so no chat request could be served. `next build` with the no-scheme value and the variable in scope exits 1 ("Failed to collect configuration for /api/chat"), so a normal deploy stops rather than shipping the fault. That is why this is P3. The gap remains where the variable is absent at build time, and in `next dev`. A URL that passes the check but is wrong does fail open: `https://x y.io` logged `UpstashJSONParseError` and returned 200.
**Suggested fix:** Decide which behaviour is wanted. Either build the limiter inside a `try` that logs `error.name` and leaves `limiter` null, or keep the build failure and record it in the spec as the accepted exception. The second removes no code but changes the spec, so it needs Jonathan's decision.
**Resolution:**

### F-10 [P3] open - The real 429 path is not recorded as unexercised

**File:** blueprint/context/current-feature.md:69
**Found:** 2026-10-31 by /audit independent (scope: current; lens: tests)
**Why it matters:** Step 3 says that without credentials the 429 path must be recorded as not exercised, and the Testing section repeats it. The local `.env` has neither `UPSTASH_REDIS_REST_URL` nor `UPSTASH_REDIS_REST_TOKEN` (names checked, no values read out), yet step 3 is checked, the status is `verified`, and neither the spec nor the commit message records this. The route logic itself is sound: against a fake Redis this review saw the 21st request return 429 with `Retry-After` and no provider call. Real Upstash has still never been exercised, and the limiter stays off in production until the variables are set in Vercel.
**Suggested fix:** Add credentials and run the step 3 check, or add one line to the spec saying the 429 path was not exercised live, then confirm the limiter works in the deployed environment.
**Resolution:** Evidence added 2026-10-31: with real Upstash credentials and stubbed providers, requests 1-20 returned 200, 21 and 22 returned 429 `rate_limited` with `Retry-After`, and a later over-long request returned 400. Provider calls: 20. Status left open for a review pass.

### F-11 [P3] open - A dropped image leaves empty markdown behind

**File:** scripts/import-cv.mjs:22
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says DOCX conversion drops images, and the `dropImages` rule removes the image but not its wrapper. A throwaway `.docx` produced `[](https://jlt.digital/)` from an image inside a link, `## ` from an image in a heading, and `-` from an image in a list item. Linked social icons are common on CVs. The URL survives, but as a link with no text, and it reaches the system prompt that way unless removed. The review reminder asks Jonathan to read the draft, so this is cleanup, not data loss. No base64 or image text survived.
**Suggested fix:** After Turndown, strip empty links and then lines holding only a heading or bullet marker, for example `.replace(/\[\]\([^)]*\)/g, "").replace(/^[ \t]*(#{1,6}|-)[ \t]*$/gm, "")`.
**Resolution:**

### F-12 [P3] open - A relative path resolves from the project root, not the current folder

**File:** scripts/import-cv.mjs:103
**Found:** 2026-10-31 by /audit independent (scope: current; lens: quality)
**Why it matters:** The contract says the path resolves from the current working directory, but `npm run` changes the working directory to the project root before Node starts. From `content/`, `npm run import:cv -- sub-only-here.pdf` failed with `file not found` for a path at the project root, although the file was in the current folder. It fails safely and prints the full path, and absolute paths and runs from the root work. A same-named file at the root would be imported in its place, though the draft is still reviewed.
**Suggested fix:** Use `resolve(process.env.INIT_CWD ?? process.cwd(), args[0])`, which npm sets to the folder the command was run from.
**Resolution:**
