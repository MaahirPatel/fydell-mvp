import { NextResponse } from "next/server";
import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { createSandboxRun, loadOwnedSandbox } from "@/lib/sim-engine/proof/sandbox/lifecycle";
import { writeCapabilityCookie, readCapability, clearCapabilityCookie } from "@/lib/sim-engine/proof/sandbox/capability";
import { buildSandboxView } from "@/lib/sim-engine/proof/sandbox/service";

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function GET() {
  const health = await checkSandboxHealth();
  if (!health.enabled) {
    return NextResponse.json({ ok: false, unavailable: true, reason: health.reason }, { status: 503 });
  }
  const cap = await readCapability();
  if (!cap) return NextResponse.json({ ok: true, session: null });
  try {
    const run = await loadOwnedSandbox(cap.runId, cap.secret);
    return NextResponse.json({ ok: true, session: await buildSandboxView(run) });
  } catch (error) {
    await clearCapabilityCookie();
    const message = error instanceof Error ? error.message : "session invalid";
    return NextResponse.json({ ok: true, session: null, cleared: true, message });
  }
}

export async function POST(request: Request) {
  const health = await checkSandboxHealth();
  if (!health.enabled) {
    return NextResponse.json({ error: "Interactive demo temporarily unavailable", reason: health.reason }, { status: 503 });
  }
  try {
    const created = await createSandboxRun(clientIp(request));
    await writeCapabilityCookie(created.run.id, created.capabilitySecret);
    return NextResponse.json({ ok: true, session: await buildSandboxView(created.run) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "create failed" }, { status: 409 });
  }
}
