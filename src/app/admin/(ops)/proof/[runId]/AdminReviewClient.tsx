"use client";

import { useState } from "react";

type Claim = {
  id: string;
  pass: string;
  claim: string;
  competency: string;
  direction: string;
  confidence: string;
  review_status: string;
  proof_claim_events?: Array<{ event_id: string; relation: string }>;
};

export default function AdminReviewClient({
  runId,
  status,
  claims,
  jobs,
  brief,
}: {
  runId: string;
  status: string;
  claims: Claim[];
  jobs: Array<{ job_type: string; status: string; last_error: string | null }>;
  brief: { recommendation: string; published: boolean; why: string } | null;
}) {
  const [msg, setMsg] = useState("");
  async function act(action: string, claimId?: string) {
    const res = await fetch(`/api/proof/runs/${runId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, claimId, reason: "founder review" }),
    });
    const json = (await res.json()) as { error?: string };
    setMsg(json.error || action);
  }
  return (
    <div className="px-6 py-8">
      <h1 className="text-[20px] font-medium">Review {runId.slice(0, 8)}</h1>
      <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">{status}</p>
      <ul className="mt-4 text-[13px] text-[var(--text-secondary)]">
        {jobs.map((j) => (
          <li key={j.job_type}>{j.job_type} · {j.status}{j.last_error ? ` · ${j.last_error}` : ""}</li>
        ))}
      </ul>
      <div className="mt-8 space-y-4">
        {claims.map((c) => (
          <article key={c.id} className="border-t border-[var(--border-subtle)] pt-4">
            <p className="text-[12px] text-[var(--text-tertiary)]">Pass {c.pass} · {c.competency} · {c.review_status}</p>
            <p className="mt-1 text-[15px]">{c.claim}</p>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{c.direction} · {c.confidence}</p>
            <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
              {(c.proof_claim_events || []).map((e) => `${e.relation}:${e.event_id.slice(0, 8)}`).join(" · ")}
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="text-[13px] text-[var(--action-ink)]" onClick={() => void act("approve", c.id)}>Approve</button>
              <button type="button" className="text-[13px] text-[var(--fydell-risk)]" onClick={() => void act("reject", c.id)}>Reject</button>
            </div>
          </article>
        ))}
      </div>
      {brief ? <p className="mt-8 text-[14px]">Draft brief: {brief.recommendation.replaceAll("_", " ")}. {brief.why}</p> : null}
      <div className="mt-6 flex gap-3">
        <button type="button" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]" onClick={() => void act("publish")}>
          Publish brief
        </button>
        <button type="button" className="rounded-full border border-[var(--border-default)] px-4 py-2 text-[13px]" onClick={() => void act("shortlist")}>
          Shortlist
        </button>
      </div>
      {msg ? <p className="mt-3 text-[13px] text-[var(--text-secondary)]">{msg}</p> : null}
    </div>
  );
}
