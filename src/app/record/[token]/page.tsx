import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/simulations/db";
import { resolveReceiptShare } from "@/lib/pilot/receipt-share";
import type { ReceiptField } from "@/lib/pilot/receipt-fields";
import { EvidenceReportV2 } from "@/components/sim/EvidenceReportV2";
import { isV2PersistedResult, type V2PersistedResult } from "@/lib/simulations/v2/scoring";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { Surface } from "@/components/ui/Surface";

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
        ? "This link has expired"
        : blocked === "revoked"
          ? "This link was turned off"
          : "This link does not work";
    const body =
      blocked === "expired"
        ? "The person who shared this receipt set a date for it to stop working, and that date has passed. Only they can issue a new one."
        : blocked === "revoked"
          ? "The person who shared this receipt withdrew access to it. Only they can issue a new link."
          : "The link may be incomplete, or the receipt it pointed to no longer exists. Ask whoever sent it to you to check.";
    return (
      <CandidateShell width="narrow">
        <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-3 max-w-[54ch] text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
          {body}
        </p>
      </CandidateShell>
    );
  }

  const roleTitle = ROLE_TITLES[result.roleKey] || result.roleKey;
  const showsWork =
    fieldAllowed(allowed, "scenario_score") ||
    fieldAllowed(allowed, "coverage_confidence") ||
    fieldAllowed(allowed, "evidence_summaries");

  return (
    <CandidateShell width="wide">
      <Surface tone="panel" className="mb-5 px-5 py-4">
        <p className="text-[12.5px] font-medium text-[var(--text-tertiary)]">
          Work Receipt, shared with you
        </p>
        {fieldAllowed(allowed, "evaluation_title") ? (
          <h1 className="mt-1.5 text-[19px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {result.simulationTitle}
          </h1>
        ) : null}
        <p className="mt-1 text-[13.5px] text-[var(--text-secondary)]">
          {fieldAllowed(allowed, "role_title") ? `${roleTitle} · ` : ""}
          {credentialNumber ? `Receipt ${credentialNumber}` : "Private receipt"}
        </p>
        <p className="mt-3 max-w-[74ch] text-[13px] leading-[1.65] text-[var(--text-tertiary)]">
          The person who did this work chose what this link contains and when it
          stops working, and can withdraw it at any time. It does not include the
          hiring company&apos;s notes or their decision. This page is not a public
          profile and is not listed anywhere.
        </p>
      </Surface>

      {showsWork ? (
        <EvidenceReportV2
          result={{
            ...result,
            performance: fieldAllowed(allowed, "scenario_score")
              ? result.performance
              : null,
            citations: fieldAllowed(allowed, "evidence_summaries")
              ? result.citations
              : [],
            strengths: fieldAllowed(allowed, "evidence_summaries")
              ? result.strengths
              : [],
            improvements: fieldAllowed(allowed, "limitations")
              ? result.improvements
              : [],
          }}
        />
      ) : (
        <Surface tone="panel" className="px-5 py-4">
          <p className="text-[14px] leading-[1.65] text-[var(--text-secondary)]">
            This link was scoped to confirm the evaluation only. It does not
            include the work itself or any assessment of it.
          </p>
        </Surface>
      )}
    </CandidateShell>
  );
}
