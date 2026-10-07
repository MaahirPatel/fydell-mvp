import { NextResponse } from "next/server";
import { checkSandboxHealth } from "@/lib/sim-engine/proof/sandbox/kill-switch";
import { readCapability } from "@/lib/sim-engine/proof/sandbox/capability";
import { loadOwnedSandbox } from "@/lib/sim-engine/proof/sandbox/lifecycle";
import { applySandboxAction, buildSandboxView, type SandboxActionInput } from "@/lib/sim-engine/proof/sandbox/service";
import type { ArtifactContent } from "@/lib/sim-engine/proof/types";
import type { AppliedAiConfig, AppliedAiEvalCase } from "@/lib/sim-engine/proof/sandbox/applied-ai-workspace";
import { publicErrorMessage } from "@/lib/security/public-error";

export const maxDuration = 60;

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
    return NextResponse.json({ error: publicErrorMessage(error, "session invalid") }, { status: 403 });
  }
  let parsed: unknown;
  try { parsed = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!parsed || typeof parsed !== "object") return NextResponse.json({ error: "Action object required" }, { status: 400 });
  const body = parsed as {
    type?: SandboxActionInput["type"];
    artifact?: ArtifactContent;
    answer?: string;
    decision?: "approve" | "limit" | "follow_up" | "reject";
    finding?: "confirmed" | "contradicted" | "still_unclear" | "not_asked";
    outcome?: "advance" | "hold" | "close" | "hired";
    scripted?: boolean;
    idempotencyKey?: string;
    resourceId?: string;
    config?: AppliedAiConfig;
    evalCase?: AppliedAiEvalCase;
    proposalCode?: string;
    source?: string;
    recommendation?: string;
    architectureDecision?: string;
  };
  if (!body.type) return NextResponse.json({ error: "type required" }, { status: 400 });
  if (
    body.type === "record_outcome" &&
    (!body.finding ||
      !["confirmed", "contradicted", "still_unclear", "not_asked"].includes(body.finding) ||
      !body.outcome ||
      !["advance", "hold", "close", "hired"].includes(body.outcome))
  ) {
    return NextResponse.json({ error: "valid finding and outcome required" }, { status: 400 });
  }
  try {
    const action = body as SandboxActionInput;
    const next = await applySandboxAction(run, action);
    return NextResponse.json({ ok: true, session: await buildSandboxView(next) });
  } catch (error) {
    const message = publicErrorMessage(error, "action failed");
    const status = /conflict|Illegal|cannot|requires|not ready|not pending/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
