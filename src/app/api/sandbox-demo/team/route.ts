import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { checkThrottle, createMemoryThrottleStore, THROTTLE_POLICIES, throttleIdentity } from "@/lib/security/throttles";
import type { TeamResponse } from "@/lib/sandbox-demo/team";
import { parseTeamRequest } from "@/lib/sandbox-demo/team-core";
import { composeTeammateTurn } from "@/lib/sandbox-demo/team-server";

export const runtime = "nodejs";

const throttleStore = createMemoryThrottleStore();
const MAX_BODY_BYTES = 24_000;

/**
 * Simulated teammates for the employer demo workspace's sample task. Signed-in
 * only, throttled per address and globally, accepts only the demo scenario,
 * stores nothing, and never returns a fallback reply in place of the model's.
 */
export async function POST(req: Request) {
  if (!(await getAuthenticatedUser())) {
    const body: TeamResponse = { status: "unavailable", reason: "rejected", retryAfterSeconds: null, message: "Sign in to the demo workspace to message simulated teammates." };
    return NextResponse.json(body, { status: 401 });
  }
  if (process.env.SANDBOX_DEMO_TEAM_DISABLED === "1") {
    const body: TeamResponse = { status: "unavailable", reason: "not_configured", retryAfterSeconds: null, message: "Simulated teammates are switched off for the demo right now." };
    return NextResponse.json(body);
  }

  const text = await req.text().catch(() => "");
  if (text.length === 0 || text.length > MAX_BODY_BYTES) return NextResponse.json({ error: "The message could not be read." }, { status: 400 });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "The message could not be read." }, { status: 400 });
  }
  const parsed = parseTeamRequest(raw);
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });

  for (const route of ["demo_teammate", "demo_teammate_global"] as const) {
    const throttle = checkThrottle(route, throttleIdentity(req, THROTTLE_POLICIES[route]), throttleStore);
    if (!throttle.ok) {
      const body: TeamResponse = {
        status: "unavailable",
        reason: "rate_limited",
        retryAfterSeconds: throttle.retryAfterSeconds,
        message: "The demo has hit its teammate message limit for now. Your message is kept; try again later.",
      };
      return NextResponse.json(body, { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } });
    }
  }

  return NextResponse.json(await composeTeammateTurn(parsed.request));
}
