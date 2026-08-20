import { NextResponse } from "next/server";
import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { readCapability, writeCapabilityCookie, clearCapabilityCookie } from "@/lib/sim-engine/proof/sandbox/capability";
import { resetSandbox } from "@/lib/sim-engine/proof/sandbox/lifecycle";
import { buildSandboxView } from "@/lib/sim-engine/proof/sandbox/service";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const health = await checkSandboxHealth();
  if (!health.enabled) {
    return NextResponse.json({ error: "Interactive demo temporarily unavailable" }, { status: 503 });
  }
  const cap = await readCapability();
  if (!cap) return NextResponse.json({ error: "No sandbox session" }, { status: 401 });
  try {
    const created = await resetSandbox(cap.runId, cap.secret, clientIp(request));
    await writeCapabilityCookie(created.run.id, created.capabilitySecret);
    return NextResponse.json({ ok: true, session: await buildSandboxView(created.run) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "reset failed";
    if (message.includes("cleanup_failed")) {
      await clearCapabilityCookie();
    }
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
