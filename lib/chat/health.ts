import { PROVIDERS } from "@/lib/chat/providers";

const PROBE_TIMEOUT_MS = 5_000;
const HEALTH_TTL_MS = 60_000;

type ProviderHealth = "reachable" | "unreachable" | "not_configured";

interface Health {
  status: "ok" | "degraded" | "down";
  providers: Record<string, ProviderHealth>;
}

let latest: { health: Promise<Health>; expiresAt: number } | null = null;

// Never logs the error itself or the response body, which could echo the key.
function logFailure(provider: string, name: string, statusCode?: number) {
  console.error("Health probe failed", { provider, name, statusCode });
}

async function probeProvider({
  name,
  keyVariable,
  probe,
}: (typeof PROVIDERS)[number]): Promise<ProviderHealth> {
  const key = process.env[keyVariable];
  if (!key) return "not_configured";

  const { url, headers } = probe(key);
  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (response.ok) return "reachable";

    logFailure(name, "HttpError", response.status);
  } catch (error) {
    logFailure(name, error instanceof Error ? error.name : "UnknownError");
  }
  return "unreachable";
}

function overallStatus(results: ProviderHealth[]): Health["status"] {
  if (!results.includes("reachable")) return "down";
  return results.includes("unreachable") ? "degraded" : "ok";
}

async function checkProviders(): Promise<Health> {
  const results = await Promise.all(PROVIDERS.map(probeProvider));

  return {
    status: overallStatus(results),
    providers: Object.fromEntries(
      PROVIDERS.map(({ name }, index) => [name, results[index]]),
    ),
  };
}

/**
 * Reports each provider's status. The route is public, so one result is shared
 * for a minute to stop repeated requests fanning out into provider calls.
 */
export function getHealth(): Promise<Health> {
  if (latest && Date.now() < latest.expiresAt) return latest.health;

  const health = checkProviders();
  latest = { health, expiresAt: Date.now() + HEALTH_TTL_MS };
  return health;
}
