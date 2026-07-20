"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type PreviewPayload = {
  mission: {
    id: string;
    title: string;
    objective: string;
    status: string;
  };
  overlay: {
    companyName: string;
    templateLabel: string;
    durationMinutes: number;
    curveballNarrative: string | null;
    usedValidatedTemplate: boolean;
    blueprintId: string;
    materialDiffSignature?: string;
    briefExcerpt: string;
    shipmentsCsvHead?: string;
    inboxJsonHead?: string;
    fileCount: number;
    fileNames: string[];
  };
  attemptKindNote?: string;
  message: string;
};

export default function MissionPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/fde/missions/${id}/preview`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load preview");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load preview");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function launchWalkthrough() {
    setLaunchBusy(true);
    setLaunchError(null);
    try {
      const res = await fetch(`/api/fde/missions/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not start walkthrough");
      router.push(json.launchUrl);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Could not start walkthrough");
      setLaunchBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[720px]">
        <p className="text-[14px] text-[#fda4b0]">{error}</p>
        <button type="button" onClick={load} className="mt-3 text-[13px] underline text-white/70">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[720px] animate-pulse space-y-3" aria-busy="true">
        <div className="h-8 w-72 rounded bg-white/5" />
        <div className="h-40 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Candidate preview
          </p>
          <h1
            className="mt-1 text-[24px] text-[#F4F5F7]"
            style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
          >
            {data.mission.title}
          </h1>
          <p className="mt-2 text-[13px] text-white/55">{data.message}</p>
        </div>
        <Link
          href={`/app/employer/missions/${id}`}
          className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3 text-[12px] text-white/80"
        >
          Back to simulation
        </Link>
      </div>

      <div className="mt-5 rounded-[10px] border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[12.5px] text-amber-100/90">
        Preview only — not a scored candidate attempt. Walkthrough sessions use{" "}
        <code className="text-[11px]">attempt_kind=preview</code> and are excluded from hiring
        analytics and candidate lists. Invite a real candidate from the simulation page to collect
        evidence.
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">Client</p>
          <p className="mt-1 text-[15px] text-white/90">{data.overlay.companyName}</p>
        </div>
        <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">Duration</p>
          <p className="mt-1 text-[15px] text-white/90">{data.overlay.durationMinutes} minutes</p>
        </div>
        <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">Runtime</p>
          <p className="mt-1 text-[13px] text-white/80">{data.overlay.templateLabel}</p>
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Candidate brief (excerpt)
        </h2>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-white/75">
          {data.overlay.briefExcerpt}
        </pre>
      </section>

      {data.overlay.shipmentsCsvHead && (
        <section className="mt-4 rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
            Material data preview — data/shipments.csv
          </h2>
          <pre className="mt-3 overflow-auto font-mono text-[11.5px] leading-relaxed text-white/70">
            {data.overlay.shipmentsCsvHead}
          </pre>
          {data.overlay.materialDiffSignature && (
            <p className="mt-2 text-[11px] text-white/40">
              Signature: {data.overlay.materialDiffSignature.slice(0, 120)}
            </p>
          )}
        </section>
      )}

      {data.overlay.curveballNarrative && (
        <section className="mt-4 rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
            Planned curveball (employer-only)
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/75">
            {data.overlay.curveballNarrative}
          </p>
          <p className="mt-2 text-[12px] text-white/40">
            Candidates do not see this until the curveball triggers mid-session.
          </p>
        </section>
      )}

      <section className="mt-4 rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Workspace artifacts ({data.overlay.fileCount})
        </h2>
        <ul className="mt-3 columns-1 gap-x-6 text-[12.5px] text-white/65 sm:columns-2">
          {data.overlay.fileNames.map((name) => (
            <li key={name} className="truncate py-0.5 font-mono text-[11.5px]">
              {name}
            </li>
          ))}
        </ul>
      </section>

      {launchError && <p className="mt-4 text-[13px] text-[#fda4b0]">{launchError}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={launchWalkthrough}
          disabled={launchBusy}
          className="inline-flex h-10 items-center rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-60"
        >
          {launchBusy ? "Starting walkthrough…" : "Launch walkthrough attempt"}
        </button>
        <Link
          href={`/app/employer/missions/${id}`}
          className="inline-flex h-10 items-center rounded-[10px] border border-white/15 px-4 text-[13px] text-white/80"
        >
          Publish & invite candidates
        </Link>
        <Link
          href="/app/employer/simulations/generate"
          className="inline-flex h-10 items-center rounded-[10px] border border-white/15 px-4 text-[13px] text-white/80"
        >
          Edit in studio
        </Link>
      </div>
    </div>
  );
}
