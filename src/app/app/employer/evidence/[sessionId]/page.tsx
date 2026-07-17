"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Finding = {
  id: string;
  dimension: string;
  observation: string;
  interpretation: string | null;
  confidence: string;
};

type Decision = {
  id: string;
  decision: string;
  structured_reason: string | null;
  evidence_gaps: string | null;
  created_at: string;
};

type EvidenceData = {
  session: { id: string; status: string; submittedAt: string | null; curveballKey: string | null };
  mission: { id: string; title: string; objective: string };
  fde: { name: string };
  findings: Finding[];
  decisions: Decision[];
};

const DECISIONS = [
  { value: "advance", label: "Advance" },
  { value: "hold", label: "Hold" },
  { value: "decline", label: "Decline" },
  { value: "hired", label: "Hired" },
  { value: "withdrawn", label: "Withdrawn" },
];

export default function EmployerEvidenceDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<EvidenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState("advance");
  const [structuredReason, setStructuredReason] = useState("");
  const [evidenceGaps, setEvidenceGaps] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/employer/evidence/${sessionId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load evidence");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load evidence");
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function recordDecision(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/employer/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, decision, structuredReason, evidenceGaps }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not record decision");
      setStructuredReason("");
      setEvidenceGaps("");
      load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not record decision");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-[14px] text-[#fda4b0]">{error}</p>;
  if (!data) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-32 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Evidence</p>
      <h1 className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[30px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
        {data.mission.title}
      </h1>
      <p className="mt-2 text-[14px] text-white/60">{data.fde.name}</p>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Findings</h2>
        {data.findings.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-white/50">
            Evidence is still being generated for this session — check back shortly.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {data.findings.map((f) => (
              <li key={f.id} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13.5px] font-semibold capitalize text-white">
                    {f.dimension.replace(/_/g, " ")}
                  </h3>
                  <span className="text-[11px] text-white/40">{f.confidence} confidence</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.observation}</p>
                {f.interpretation && <p className="mt-1 text-[13px] leading-relaxed text-white/55">{f.interpretation}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Record a decision</h2>
        <form onSubmit={recordDecision} className="mt-4 grid gap-3">
          <select className="platform-input" value={decision} onChange={(e) => setDecision(e.target.value)}>
            {DECISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <textarea
            className="platform-input"
            placeholder="Structured reason"
            rows={3}
            value={structuredReason}
            onChange={(e) => setStructuredReason(e.target.value)}
          />
          <textarea
            className="platform-input"
            placeholder="Evidence gaps (optional)"
            rows={2}
            value={evidenceGaps}
            onChange={(e) => setEvidenceGaps(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 w-fit items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save decision"}
          </button>
          {submitError && <p className="text-[13px] text-[#fda4b0]">{submitError}</p>}
        </form>

        {data.decisions.length > 0 && (
          <ul className="mt-6 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {data.decisions.map((d) => (
              <li key={d.id} className="py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-white">{d.decision}</span>
                  <span className="text-white/40">{new Date(d.created_at).toLocaleString()}</span>
                </div>
                {d.structured_reason && <p className="mt-1 text-white/60">{d.structured_reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
