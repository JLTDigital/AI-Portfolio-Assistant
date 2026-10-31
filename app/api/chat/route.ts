import { google } from "@ai-sdk/google";
import { APICallError, RetryError, streamText } from "ai";

import { getKnowledgeContext } from "@/lib/knowledge";

const MODEL = "gemini-3.5-flash-lite";
const RECENT_MESSAGES = 10;
const CHAT_TIMEOUT_MS = 30_000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatError {
  error: "invalid_request" | "not_configured" | "provider_error";
}

type StreamParts = AsyncIterator<
  ReturnType<typeof streamText>["stream"] extends AsyncIterable<infer Part>
    ? Part
    : never
>;

function errorResponse(status: number, error: ChatError["error"]) {
  return Response.json({ error } satisfies ChatError, { status });
}

/** Rebuilds the messages from an untrusted body, or returns null if invalid. */
function parseMessages(body: unknown): ChatMessage[] | null {
  if (typeof body !== "object" || body === null) return null;

  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const parsed: ChatMessage[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) return null;

    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim() === "") return null;

    parsed.push({ role, content });
  }

  return parsed[parsed.length - 1].role === "user" ? parsed : null;
}

function recentMessages(messages: ChatMessage[]) {
  const recent = messages.slice(-RECENT_MESSAGES);
  return recent[0].role === "assistant" ? recent.slice(1) : recent;
}

/** Returns the next text chunk, or null at the end of the stream. */
async function nextText(parts: StreamParts): Promise<string | null> {
  while (true) {
    const { done, value } = await parts.next();
    if (done) return null;

    if (value.type === "text-delta" && value.text) return value.text;
    if (value.type === "error") throw value.error;
    if (value.type === "abort") {
      throw new DOMException("Stream aborted", "AbortError");
    }
    // Any other finish, such as a safety stop, means the answer was cut short.
    if (value.type === "finish" && value.finishReason !== "stop") {
      throw new DOMException("Answer incomplete", "IncompleteAnswer");
    }
  }
}

// SDK errors can hold the full request, including visitor text and the system
// prompt, so only these two fields are ever logged.
function logFailure(error: unknown) {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  console.error("Chat stream failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    statusCode: APICallError.isInstance(cause) ? cause.statusCode : undefined,
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const messages = parseMessages(body);
  if (!messages) return errorResponse(400, "invalid_request");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return errorResponse(503, "not_configured");
  }

  const result = streamText({
    model: google(MODEL),
    instructions: getKnowledgeContext().systemPrompt,
    messages: recentMessages(messages),
    abortSignal: AbortSignal.any([
      request.signal,
      AbortSignal.timeout(CHAT_TIMEOUT_MS),
    ]),
    // Replaces the SDK default, which logs the whole error. Failures are
    // logged once, where the stream is read.
    onError: () => {},
  });
  const parts: StreamParts = result.stream[Symbol.asyncIterator]();

  // Nothing has reached the visitor until the first text arrives, so failures
  // up to this point can still return a JSON error.
  let firstText: string | null;
  try {
    firstText = await nextText(parts);
  } catch (error) {
    if (!request.signal.aborted) logFailure(error);
    return errorResponse(502, "provider_error");
  }
  if (firstText === null) {
    logFailure(new DOMException("Answer empty", "EmptyAnswer"));
    return errorResponse(502, "provider_error");
  }

  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(firstText));
    },
    async pull(controller) {
      try {
        const text = await nextText(parts);
        if (text === null) controller.close();
        else controller.enqueue(encoder.encode(text));
      } catch (error) {
        // A chunk can still arrive after the visitor disconnects.
        if (cancelled || request.signal.aborted) return;
        logFailure(error);
        // Rejects the client's read, so a cut-off answer can't look complete.
        // A new error keeps the SDK object out of Next's own failure log.
        controller.error(new DOMException("Chat stream failed", "AbortError"));
      }
    },
    async cancel() {
      cancelled = true;
      await parts.return?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
