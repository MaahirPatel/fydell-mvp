import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MicroResultView } from "@/components/sim/MicroResultView";
import { EvidenceReportV2 } from "@/components/sim/EvidenceReportV2";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { Surface } from "@/components/ui/Surface";
import type { MicroResult } from "@/lib/simulations/micro-scoring";
import { isV2PersistedResult, type V2PersistedResult } from "@/lib/simulations/v2/scoring";

export const metadata = { title: "Shared result | Fydell" };
export const dynamic = "force-dynamic";

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminSupabaseClient();

  const { data: session } = await admin
    .from("sim_sessions")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();

  let result: MicroResult | V2PersistedResult | null = null;
  if (session) {
    const { data: run } = await admin
      .from("sim_analysis_runs")
      .select("result")
      .eq("session_id", session.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    result = (run?.result as MicroResult | V2PersistedResult) || null;
  }

  const v2 = result ? isV2PersistedResult(result) : false;

  if (!result) {
    return (
      <CandidateShell width="narrow">
        <h1 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
          This link does not work
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
          It may be incomplete, or it may have pointed to a result that no longer
          exists. Ask whoever sent it to you to check.
        </p>
      </CandidateShell>
    );
  }

  return (
    <CandidateShell width="wide">
      {/* Links of this shape are no longer issued. They are unscoped and cannot
          be withdrawn, which is why the Work Receipt replaced them. Ones handed
          out before that change keep working rather than breaking silently. */}
      <Surface tone="panel" className="mb-5 px-5 py-4">
        <p className="text-[13px] leading-[1.65] text-[var(--text-secondary)]">
          Someone shared this result with you using an older kind of link. It
          shows the full result and cannot be withdrawn by the person who did the
          work. Fydell no longer creates links like this; a Work Receipt now lets
          the candidate choose what is included and turn access off.
        </p>
      </Surface>
      {v2 ? (
        <EvidenceReportV2 result={result as V2PersistedResult} />
      ) : (
        <MicroResultView result={result as MicroResult} />
      )}
    </CandidateShell>
  );
}
