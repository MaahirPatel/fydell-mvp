import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/simulations/db";
import { MicroResultView } from "@/components/sim/MicroResultView";
import { EvidenceReportV2 } from "@/components/sim/EvidenceReportV2";
import type { MicroResult } from "@/lib/simulations/micro-scoring";
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

export default async function WorkReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminSupabaseClient();
  const tokenHash = hashToken(token);

  const { data: credential } = await admin
    .from("sim_credentials")
    .select("id, session_id, credential_number, visibility, status")
    .eq("share_token_hash", tokenHash)
    .eq("visibility", "link")
    .eq("status", "active")
    .maybeSingle();

  let result: MicroResult | V2PersistedResult | null = null;
  let roleKey: string | null = null;
  let simTitle: string | null = null;

  if (credential) {
    const { data: run } = await admin
      .from("sim_analysis_runs")
      .select("result")
      .eq("session_id", credential.session_id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    result = (run?.result as MicroResult | V2PersistedResult) || null;
    if (result) {
      roleKey = result.roleKey;
      simTitle = result.simulationTitle;
    }
  }

  const roleTitle = roleKey ? ROLE_TITLES[roleKey] || roleKey : null;
  const v2 = result ? isV2PersistedResult(result) : false;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#101a33] text-white">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4">
          <Link href="/" className="text-[15px] font-bold tracking-tight">
            Fydell
          </Link>
          <Link
            href="/simulations"
            className="rounded-lg border border-white/25 px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-white/10"
          >
            Try a simulation
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        {result && credential ? (
          <>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-violet-600">
                Work receipt
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900">
                {simTitle || "Simulation result"}
              </h1>
              <p className="mt-1 text-[14px] text-slate-500">
                {roleTitle ? `${roleTitle} · ` : ""}
                Credential {credential.credential_number}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
                This page is a shareable record of work completed on Fydell. It shows evidence
                scores and citations from the attempt. It does not include private employer notes
                or personally identifying contact details beyond what the candidate chose to share.
              </p>
            </div>

            {v2 ? (
              <EvidenceReportV2 result={result as V2PersistedResult} />
            ) : (
              <MicroResultView result={result as MicroResult} variant="light" />
            )}
          </>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-lg font-semibold text-slate-900">Receipt not found</h1>
            <p className="mt-2 text-[13.5px] text-slate-600">
              This link is invalid, revoked, or the result hasn&apos;t been published yet.
            </p>
            <Link
              href="/simulations"
              className="mt-5 inline-block rounded-xl bg-violet-600 px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-violet-700"
            >
              Explore simulations
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
