import { NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  const auth = await requirePlatformRoleApi(["super_admin", "admin", "operator", "reviewer"]);
  if ("error" in auth) return auth.error;
  const { runId } = await context.params;
  const body = (await request.json()) as {
    claimId?: string;
    action?: "approve" | "reject" | "publish" | "shortlist";
    reason?: string;
  };
  const admin = proofAdmin();

  if (body.action === "shortlist") {
    await admin.from("proof_runs").update({ shortlisted: true, status: "ready" }).eq("id", runId);
    await audit(auth.email, "shortlist", "proof_runs", runId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "publish") {
    const { data: claims } = await admin
      .from("proof_evidence_claims")
      .select("id, review_status, pass")
      .eq("run_id", runId)
      .eq("pass", "B");
    const pending = (claims ?? []).filter((c) => c.review_status !== "APPROVED" && c.review_status !== "PUBLISHED" && c.review_status !== "REJECTED");
    if (pending.length > 0) {
      return NextResponse.json({ error: "all pass-B claims must be reviewed first" }, { status: 409 });
    }
    await admin.from("proof_evidence_claims").update({ review_status: "PUBLISHED" }).eq("run_id", runId).eq("review_status", "APPROVED");
    await admin.from("proof_decision_briefs").update({ published: true }).eq("run_id", runId);
    await admin.from("proof_runs").update({ status: "ready" }).eq("id", runId);
    await admin.from("proof_product_events").insert({ run_id: runId, name: "report_opened", payload: { published: true } });
    await audit(auth.email, "publish_brief", "proof_runs", runId);
    return NextResponse.json({ ok: true });
  }

  if (!body.claimId || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "claimId and action required" }, { status: 400 });
  }
  const { data: before } = await admin.from("proof_evidence_claims").select("*").eq("id", body.claimId).single();
  const next = body.action === "approve" ? "APPROVED" : "REJECTED";
  await admin.from("proof_evidence_claims").update({ review_status: next }).eq("id", body.claimId);
  await admin.from("proof_claim_reviews").insert({
    claim_id: body.claimId,
    reviewer: auth.email,
    action: body.action,
    reason: body.reason ?? null,
    before,
    after: { review_status: next },
  });
  await audit(auth.email, `claim_${body.action}`, "proof_evidence_claims", body.claimId, before, { review_status: next });
  return NextResponse.json({ ok: true });
}
