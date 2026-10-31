import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { APICallError, RetryError, streamText } from "ai";

import { MAX_USER_CHARS } from "@/lib/chat/limits";
import { getKnowledgeContext } from "@/lib/knowledge";
import { checkRateLimit } from "@/lib/rate-limit";

const GOOGLE_MODEL = "gemini-3.5-flash-lite";
const GROQ_MODEL = "openai/gpt-oss-120b";
const OPENROUTER_MODEL = "nvidia/nemotron-3.5-super-vl:free";
const RECENT_MESSAGES = 10;
const MAX_MESSAGES = 40;
const MAX_ASSISTANT_CHARS = 4_000;
const CHAT_TIMEOUT_MS = 30_000;
const FIRST_TEXT_TIMEOUT_MS = 10_000;

const PROVIDERS = [
  {
    name: "google",
    keyVariable: "GOOGLE_GENERATIVE_AI_API_KEY",
    model: () => google(GOOGLE_MODEL),
  },
  {
    name: "groq",
    keyVariable: "GROQ_API_KEY",
    model: () => groq(GROQ_MODEL),
  },
  {
    name: "openrouter",
    keyVariable: "OPENROUTER_API_KEY",
    model: () => openrouter(OPENROUTER_MODEL),
  },
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatError {
  error:
    | "invalid_request"
    | "input_too_long"
    | "conversation_too_long"
    | "rate_limited"
    | "not_configured"
    | "provider_error";
}

type StreamParts = AsyncIterator<
  ReturnType<typeof streamText>["stream"] extends AsyncIterable<infer Part>
    ? Part
    : never
>;

function errorResponse(
  status: number,
  error: ChatError["error"],
  headers?: HeadersInit,
) {
  return Response.json({ error } satisfies ChatError, { status, headers });
}

/** Rebuilds the messages from an untrusted body, or returns why it can't. */
function parseMessages(body: unknown): ChatMessage[] | ChatError["error"] {
  if (typeof body !== "object" || body === null) return "invalid_request";

  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) {
    return "invalid_request";
  }
  if (messages.length > MAX_MESSAGES) return "conversation_too_long";

  const parsed: ChatMessage[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) {
      return "invalid_request";
    }

    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return "invalid_request";
    if (typeof content !== "string" || content.trim() === "") {
      return "invalid_request";
    }
    if (role === "user" && content.length > MAX_USER_CHARS) {
      return "input_too_long";
    }

    // Past answers have no fixed length, so rejecting one could end an honest
    // conversation.
    parsed.push({ role, content: content.slice(0, MAX_ASSISTANT_CHARS) });
  }

  return parsed[parsed.length - 1].role === "user"
    ? parsed
    : "invalid_request";
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
// prompt, so only these fields are ever logged.
function logFailure(provider: string, error: unknown) {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  console.error("Chat stream failed", {
    provider,
    name: error instanceof Error ? error.name : "UnknownError",
    statusCode: APICallError.isInstance(cause) ? cause.statusCode : undefined,
  });
}

/**
 * Tries each provider in order until one sends text. Nothing has reached the
 * visitor until then, so a failure can still move on without them seeing it.
 */
async function startAnswer(
  providers: typeof PROVIDERS,
  messages: ChatMessage[],
  signal: AbortSignal,
) {
  for (const provider of providers) {
    // The SDK's firstChunkMs only starts once the response opens, so it can't
    // catch a provider that never answers.
    const firstTextLimit = new AbortController();
    const firstTextTimer = setTimeout(
      () => firstTextLimit.abort(),
      FIRST_TEXT_TIMEOUT_MS,
    );

    const result = streamText({
      model: provider.model(),
      instructions: getKnowledgeContext().systemPrompt,
      messages,
      abortSignal: AbortSignal.any([
        signal,
        firstTextLimit.signal,
        AbortSignal.timeout(CHAT_TIMEOUT_MS),
      ]),
      // The next provider is the retry. Backing off would only spend the
      // visitor's time and more quota.
      maxRetries: 0,
      // Replaces the SDK default, which logs the whole error. Failures are
      // logged once, where the stream is read.
      onError: () => {},
    });
    const parts: StreamParts = result.stream[Symbol.asyncIterator]();

    try {
      const firstText = await nextText(parts);
      if (firstText === null) {
        throw new DOMException("Answer empty", "EmptyAnswer");
      }
      return { provider: provider.name, parts, firstText };
    } catch (error) {
      await parts.return?.();
      // The visitor has gone, so another provider would only spend quota.
      if (signal.aborted) return null;
      logFailure(provider.name, error);
    } finally {
      clearTimeout(firstTextTimer);
    }
  }

  return null;
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const messages = parseMessages(body);
  if (typeof messages === "string") return errorResponse(400, messages);

  const providers = PROVIDERS.filter(
    ({ keyVariable }) => process.env[keyVariable],
  );
  if (providers.length === 0) return errorResponse(503, "not_configured");

  const rateLimit = await checkRateLimit(request.headers);
  if (!rateLimit.allowed) {
    return errorResponse(429, "rate_limited", {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  const answer = await startAnswer(
    providers,
    recentMessages(messages),
    request.signal,
  );
  if (!answer) return errorResponse(502, "provider_error");
  const { provider, parts, firstText } = answer;

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
        logFailure(provider, error);
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
