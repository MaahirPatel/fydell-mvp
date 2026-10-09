import { NextResponse } from "next/server";
import { demoRoute } from "@/lib/employer-demo/route";
import { resetDemoWorkspace } from "@/lib/employer-demo/store";
import { checkThrottle, createMemoryThrottleStore, THROTTLE_POLICIES, throttleIdentity } from "@/lib/security/throttles";

export const runtime = "nodejs";

const throttleStore = createMemoryThrottleStore();

/** Deletes the caller's demo decisions, questions and sample submission and seeds the fictional applicants again. */
export async function POST(req: Request) {
  const throttle = checkThrottle("demo_reset", throttleIdentity(req, THROTTLE_POLICIES.demo_reset), throttleStore);
  if (!throttle.ok) {
    return NextResponse.json(
      { error: "The demo was reset several times in the last hour. Try again later." },
      { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } },
    );
  }
  return demoRoute(req, async (userId) => {
    await resetDemoWorkspace(userId);
    return { reset: true };
  });
}
