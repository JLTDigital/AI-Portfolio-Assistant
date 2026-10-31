import { connection } from "next/server";

import { getHealth } from "@/lib/chat/health";

export async function GET() {
  // Keeps the route out of prerendering, which would probe once at build time.
  await connection();

  const health = await getHealth();

  return Response.json(health, {
    status: health.status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
