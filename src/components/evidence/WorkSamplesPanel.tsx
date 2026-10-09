"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { IncludableReport, WorkSampleEntry } from "@/lib/profile-evidence/work-samples";
import { SimulationReport } from "./EvidenceSnapshotView";
import { request } from "./request";

const SHOWN_REPORTS = 2;

export default function WorkSamplesPanel({ included, includable }: { included: WorkSampleEntry[]; includable: IncludableReport[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function include(attemptId: string) {
    setBusy(attemptId);
    setError(null);
    const result = await request<{ workSample: WorkSampleEntry }>("/api/passport/work-samples", "POST", { attemptId });
    setBusy(null);
    if (result.ok === false) return setError(result.error);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    const result = await request<{ ok: true }>("/api/passport/work-samples", "DELETE", { id });
    setBusy(null);
    if (result.ok === false) return setError(result.error);
    router.refresh();
  }

  if (included.length === 0 && includable.length === 0) {
    return <p className="text-[13px] leading-[1.55] text-[var(--text-secondary)]">When a work sample report is released to you, you can add it here and attach it to applications.</p>;
  }

  const renderIncluded = (w: WorkSampleEntry) => (
    <div key={w.id} className="grid gap-2">
      <SimulationReport report={w.summary} />
      <button type="button" onClick={() => remove(w.id)} disabled={busy !== null} className="btn btn-ghost h-7 w-fit px-2.5 text-app-meta">
        {busy === w.id ? "Removing" : "Remove from my profile"}
      </button>
    </div>
  );
  const hidden = included.slice(SHOWN_REPORTS);

  return (
    <div className="grid gap-4">
      {included.slice(0, SHOWN_REPORTS).map(renderIncluded)}
      {hidden.length > 0 ? (
        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-app-control font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
            {hidden.length} more work sample report{hidden.length === 1 ? "" : "s"} on your profile
          </summary>
          <div className="mt-4 grid gap-4">{hidden.map(renderIncluded)}</div>
        </details>
      ) : null}
      {includable.length > 0 ? (
        <ul className="grid gap-2">
          {includable.map((r) => (
            <li key={r.attemptId} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
              <span>
                <span className="font-medium text-[var(--text-primary)]">{r.title}</span>
                {r.releasedAt ? <span className="text-[var(--text-tertiary)]">, released {new Date(r.releasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span> : null}
              </span>
              <button type="button" onClick={() => include(r.attemptId)} disabled={busy !== null} className="btn btn-secondary h-7 px-2.5 text-app-meta">
                {busy === r.attemptId ? "Adding" : "Add to my profile"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-app-meta text-[var(--text-tertiary)]">Only the part of the report written for you is added. Levels and hidden checks are left out.</p>
      {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
    </div>
  );
}
