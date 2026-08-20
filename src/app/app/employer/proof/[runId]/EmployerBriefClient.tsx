"use client";

import { useState } from "react";

type Brief = {
  recommendation: string;
  why: string;
  strengths: string[];
  concerns: string[];
  probes: string[];
};

type Claim = {
  id: string;
  claim: string;
  competency: string;
  direction: string;
  confidence: string;
  proof_claim_events?: Array<{ event_id: string; relation: string }>;
};

export default function EmployerBriefClient({
  runId,
  email,
  brief,
  claims,
  plan,
}: {
  runId: string;
  email: string;
  brief: Brief;
  claims: Claim[];
  plan: { confirm: string[]; investigate: string[]; challenge: string[] } | null;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState("");

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10">
      <p className="text-app-meta text-[var(--text-tertiary)]">Solutions Engineer</p>
      <h1 className="mt-1 text-app-page">{email}</h1>
      <p className="mt-4 text-[15px] text-[var(--fydell-evidence)]">{brief.recommendation.replaceAll("_", " ")}</p>
      <h2 className="mt-8 text-app-section">Why</h2>
      <p className="mt-2 text-[15px] leading-6 text-[var(--text-secondary)]">{brief.why}</p>
      <h2 className="mt-8 text-app-section">Top evidence</h2>
      <ol className="mt-2 list-decimal pl-5 text-[15px] text-[var(--text-primary)]">
        {(brief.strengths || []).map((s) => (
          <li key={s} className="mt-1">{s}</li>
        ))}
      </ol>
      <h2 className="mt-8 text-app-section">Main uncertainties</h2>
      <ul className="mt-2 list-disc pl-5 text-[15px] text-[var(--text-secondary)]">
        {(brief.concerns || []).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h2 className="mt-8 text-app-section">Interview next</h2>
      <ol className="mt-2 list-decimal pl-5 text-[15px]">
        {(brief.probes || []).map((s) => (
          <li key={s} className="mt-1">{s}</li>
        ))}
      </ol>
      {plan ? (
        <section className="mt-10">
          <h2 className="text-app-section">Interview plan</h2>
          <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">Confirm</p>
          <ul className="text-[14px]">{(plan.confirm || []).map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">Investigate</p>
          <ul className="text-[14px]">{(plan.investigate || []).map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">Challenge</p>
          <ul className="text-[14px]">{(plan.challenge || []).map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      ) : null}
      <button type="button" className="mt-8 text-[13px] text-[var(--action-ink)]" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide evidence" : "Full evidence"}
      </button>
      {open ? (
        <ul className="mt-4 space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="border-t border-[var(--border-subtle)] pt-3 text-[14px]">
              <p className="font-medium">{c.competency}</p>
              <p className="text-[var(--text-secondary)]">{c.claim}</p>
              <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                {c.direction} · {c.confidence} · events {(c.proof_claim_events || []).map((e) => e.event_id.slice(0, 8)).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="mt-12 space-y-3 border-t border-[var(--border-subtle)] pt-8"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const interviewed = (form.elements.namedItem("interviewed") as HTMLInputElement).checked;
          const probes = (form.elements.namedItem("probes") as HTMLInputElement).checked;
          const confirmed = (form.elements.namedItem("confirmed") as HTMLSelectElement).value;
          const hired = (form.elements.namedItem("hired") as HTMLInputElement).checked;
          void fetch(`/api/proof/runs/${runId}/outcomes`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              interviewed,
              probes_used: probes,
              evidence_confirmed: confirmed,
              notes,
              hired,
            }),
          }).then(() => setSaved("Recorded. This is validation data, not model training."));
        }}
      >
        <h2 className="text-app-section">Outcome</h2>
        <label className="flex gap-2 text-[14px]"><input name="interviewed" type="checkbox" /> Interviewed</label>
        <label className="flex gap-2 text-[14px]"><input name="probes" type="checkbox" /> Used Fydell probes</label>
        <label className="block text-[14px]">
          Evidence in the interview
          <select name="confirmed" className="ml-2 bg-[var(--surface-panel)]">
            <option value="confirmed">confirmed</option>
            <option value="contradicted">contradicted</option>
            <option value="unclear">unclear</option>
          </select>
        </label>
        <label className="flex gap-2 text-[14px]"><input name="hired" type="checkbox" /> Hired</label>
        <textarea className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        <button type="submit" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]">
          Save outcome
        </button>
        {saved ? <p className="text-[13px] text-[var(--text-secondary)]">{saved}</p> : null}
      </form>
    </div>
  );
}
