import { NextResponse } from "next/server";
import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { readCapability } from "@/lib/sim-engine/proof/sandbox/capability";
import { loadOwnedSandbox } from "@/lib/sim-engine/proof/sandbox/lifecycle";
import { applySandboxAction, buildSandboxView, type SandboxAction } from "@/lib/sim-engine/proof/sandbox/service";
import type { ArtifactContent } from "@/lib/sim-engine/proof/types";

export async function POST(request: Request) {
  const health = await checkSandboxHealth();
  if (!health.enabled) {
    return NextResponse.json({ error: "Interactive demo temporarily unavailable" }, { status: 503 });
  }
  const cap = await readCapability();
  if (!cap) return NextResponse.json({ error: "No sandbox session" }, { status: 401 });
  let run;
  try {
    run = await loadOwnedSandbox(cap.runId, cap.secret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "session invalid" }, { status: 403 });
  }
  const body = (await request.json()) as {
    type?: SandboxAction["type"];
    artifact?: ArtifactContent;
    answer?: string;
    decision?: "approve" | "limit" | "follow_up" | "reject";
    scripted?: boolean;
    idempotencyKey?: string;
  };
  if (!body.type) return NextResponse.json({ error: "type required" }, { status: 400 });
  try {
    const action = body as SandboxAction;
    const next = await applySandboxAction(run, action);
    return NextResponse.json({ ok: true, session: await buildSandboxView(next) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "action failed";
    const status = /conflict|Illegal|cannot|requires|not ready|not pending/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
