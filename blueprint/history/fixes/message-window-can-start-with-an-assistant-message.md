# Fix: Message window can start with an assistant message

**Type:** Fix
**Status:** verified
**Branch:** fix/message-window-can-start-with-an-assistant-message
**Fixes:** F-06

## The problem

The chat route sends the model a window of recent messages that should start with a `user` message. `recentMessages` in `app/api/chat/route.ts` drops exactly one leading `assistant` message, and validation doesn't require roles to alternate. So a body of `[assistant, assistant, user]` returns `200` and reaches Gemini as `["model", "user"]`, and Groq as `["system", "assistant", "user"]`.

Any client can send that shape, although the app's own alternating history would not. A provider that rejects it costs one failed attempt and a fallback.

## The fix

In `recentMessages`, slice the window from its first `user` message, using `recent.slice(recent.findIndex((m) => m.role === "user"))`.

`parseMessages` guarantees that the last message is `user`, so the index always exists and the window is never empty.

This must not break:

- **Normal history:** an alternating window that starts with `user` is unchanged, and one that starts with a single `assistant` still drops that one message.
- **Window size:** `RECENT_MESSAGES` and the `MAX_MESSAGES` limit are unchanged.
- **Validation:** `parseMessages` stays as it is. Roles still need not alternate later in the window, because the finding only covers how the window starts.

## Build steps

- [x] **1. Start the window at the first user message.** Change `recentMessages` in `app/api/chat/route.ts` as described above. Keep the change inside that file.
  **Done when:** with stubbed providers, each case in Verify sends the listed roles, and `npm run lint` and `npm run build` pass.

## Verify

No test command is configured, so evidence comes from running the real route under `next start` with a local fake `fetch` that records the roles in each provider request, with no real provider calls. Keep the harness outside the repo.

| Request body roles | Roles sent to Gemini |
|---|---|
| `assistant, assistant, user` | `user` |
| `assistant, user` | `user` |
| `user` | `user` |
| `user, assistant, user` | `user, model, user` |
| 12 alternating messages ending in `user` | The last 9, starting with `user` |

For the first case, also confirm the response is `200`. Real provider behaviour with these shapes stays unexercised.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2379,"specSha256":"fc94be416f9d9a57d07728ce68b11e515deff7d7a04a83f9826377e2129bcd07","branch":"refs/heads/fix/message-window-can-start-with-an-assistant-message","head":"52436fd9b3eb8cd34caad5a79518f5aea8b62447","baseRef":"refs/heads/main","baseCommit":"52436fd9b3eb8cd34caad5a79518f5aea8b62447","sourceTree":"6f4dae783e416ec30ce66f93f963c2f591f5c439","landing":"local-merge","absentOptional":[]} -->
