import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/simulations/db";
import { resolveReceiptShare } from "@/lib/pilot/receipt-share";
import type { ReceiptField } from "@/lib/pilot/receipt-fields";
import { EvidenceReportV2 } from "@/components/sim/EvidenceReportV2";
import { isV2PersistedResult, type V2PersistedResult } from "@/lib/simulations/v2/scoring";

export const metadata = { title: "Work Receipt | Fydell" };
export const dynamic = "force-dynamic";

const ROLE_TITLES: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "Business Intelligence Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

function fieldAllowed(allowed: ReceiptField[], field: ReceiptField) {
  return allowed.includes(field);
}

export default async function WorkReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminSupabaseClient();

  // Prefer field-scoped receipt shares (021+). Fall back to legacy credential hash.
  const resolved = await resolveReceiptShare(token);
  let sessionId: string | null = null;
  let allowed: ReceiptField[] = [];
  let credentialNumber: string | null = null;
  let blocked: "not_found" | "expired" | "revoked" | null = null;

  if (resolved.ok) {
    sessionId = String(resolved.share.session_id);
    allowed = (resolved.share.allowed_fields as ReceiptField[]) || [];
    const { data: cred } = await admin
      .from("sim_credentials")
      .select("credential_number")
      .eq("id", resolved.share.credential_id as string)
      .maybeSingle();
    credentialNumber = cred?.credential_number || null;
  } else {
    const fail = resolved as { ok: false; reason: "not_found" | "expired" | "revoked" };
    if (fail.reason !== "not_found") {
      blocked = fail.reason;
    } else {
      const { data: credential } = await admin
        .from("sim_credentials")
        .select("id, session_id, credential_number, visibility, status")
        .eq("share_token_hash", hashToken(token))
        .eq("visibility", "link")
        .eq("status", "active")
        .maybeSingle();
      if (credential) {
        sessionId = credential.session_id;
        credentialNumber = credential.credential_number;
        allowed = [
          "role_title",
          "evaluation_title",
          "completion_date",
          "duration",
          "evidence_summaries",
          "coverage_confidence",
          "scenario_score",
          "limitations",
        ];
      } else {
        blocked = "not_found";
      }
    }
  }

  let result: V2PersistedResult | null = null;
  if (sessionId) {
    const { data: run } = await admin
      .from("sim_analysis_runs")
      .select("result")
      .eq("session_id", sessionId)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (run?.result && isV2PersistedResult(run.result)) {
      result = run.result;
    }
  }

  if (blocked || !result) {
    const title =
      blocked === "expired"
        ? "Share expired"
        : blocked === "revoked"
          ? "Share revoked"
          : "Receipt not found";
    const body =
      blocked === "expired"
        ? "This share link has expired. Ask the candidate for a new authorized share."
        : blocked === "revoked"
          ? "This share was revoked by the candidate. The previous URL no longer works."
          : "This link is invalid or the receipt has not been published.";
    return (
      <div className="min-h-screen bg-slate-100">
        <main className="mx-auto max-w-md px-4 py-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 text-[13.5px] text-slate-600">{body}</p>
          </div>
        </main>
      </div>
    );
  }

  const roleTitle = ROLE_TITLES[result.roleKey] || result.roleKey;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#101a33] text-white">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4">
          <Link href="/" className="text-[15px] font-bold tracking-tight">
            Fydell
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#3157D5]">
            Work receipt (authorized share)
          </p>
          {fieldAllowed(allowed, "evaluation_title") && (
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{result.simulationTitle}</h1>
          )}
          <p className="mt-1 text-[14px] text-slate-500">
            {fieldAllowed(allowed, "role_title") ? `${roleTitle} · ` : ""}
            {credentialNumber ? `Credential ${credentialNumber}` : "Private receipt projection"}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
            This view shows only fields the candidate authorized. It excludes employer-private
            notes, decisions, hidden rubrics, and raw surveillance streams.
          </p>
        </div>

        {fieldAllowed(allowed, "scenario_score") ||
        fieldAllowed(allowed, "coverage_confidence") ||
        fieldAllowed(allowed, "evidence_summaries") ? (
          <EvidenceReportV2
            result={{
              ...result,
              performance: fieldAllowed(allowed, "scenario_score") ? result.performance : null,
              citations: fieldAllowed(allowed, "evidence_summaries") ? result.citations : [],
              strengths: fieldAllowed(allowed, "evidence_summaries") ? result.strengths : [],
              improvements: fieldAllowed(allowed, "limitations") ? result.improvements : [],
            }}
          />
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-[14px] text-slate-600">
            No additional fields were authorized for this share.
          </p>
        )}
      </main>
    </div>
  );
}
