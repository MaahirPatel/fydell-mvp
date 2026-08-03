import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { MicroResultView } from "@/components/sim/MicroResultView";
import { EvidenceReportV2 } from "@/components/sim/EvidenceReportV2";
import type { MicroResult } from "@/lib/simulations/micro-scoring";
import { isV2PersistedResult, type V2PersistedResult } from "@/lib/simulations/v2/scoring";

export const metadata = { title: "Simulation Result | Fydell" };
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

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-[#101a33] text-white">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-4">
          <Link href="/" className="text-[15px] font-bold tracking-tight">Fydell</Link>
          <Link
            href="/simulations"
            className="rounded-lg border border-white/25 px-3.5 py-1.5 text-[12.5px] font-medium hover:bg-white/10"
          >
            Try a simulation
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-8">
        {result ? (
          <>
            <p className="mb-4 text-[13px] text-slate-500">
              Shared simulation result · evaluated on the Fydell platform
            </p>
            {v2 ? (
              <EvidenceReportV2 result={result as V2PersistedResult} />
            ) : (
              <MicroResultView result={result as MicroResult} />
            )}
          </>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-lg font-semibold text-slate-900">Result not found</h1>
            <p className="mt-2 text-[13.5px] text-slate-600">
              This link is invalid or the result hasn&apos;t been published yet.
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
