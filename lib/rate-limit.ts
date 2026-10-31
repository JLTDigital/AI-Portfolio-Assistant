import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const LIMITER_TIMEOUT_MS = 1_000;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// Never logs the IP or the error itself, which can hold the request details.
function logSkipped(reason: string) {
  console.warn("Rate limit skipped", { reason });
}

function createLimiter() {
  if (!url || !token) return null;

  // Redis rejects a malformed URL here, at module load, outside checkRateLimit.
  try {
    return new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(20, "10 m"),
      prefix: "chat-rate-limit",
      analytics: false,
      timeout: LIMITER_TIMEOUT_MS,
    });
  } catch (error) {
    logSkipped(error instanceof Error ? error.name : "UnknownError");
    return null;
  }
}

const limiter = createLimiter();

/**
 * Checks the visitor's allowance. A limiter problem lets the request through,
 * so a Redis outage costs quota protection rather than the whole chat.
 */
export async function checkRateLimit(
  headers: Headers,
): Promise<RateLimitResult> {
  if (!limiter) {
    logSkipped("NotConfigured");
    return { allowed: true };
  }

  // Vercel sets x-real-ip itself. Forwarding chains can carry client values.
  const ip = headers.get("x-real-ip") ?? "unknown";

  try {
    const { success, reset, reason } = await limiter.limit(ip);
    if (reason === "timeout") logSkipped("Timeout");
    if (success) return { allowed: true };

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    logSkipped(error instanceof Error ? error.name : "UnknownError");
    return { allowed: true };
  }
}
