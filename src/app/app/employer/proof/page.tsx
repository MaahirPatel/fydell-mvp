"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RunRow = {
  id: string;
  status: string;
  shortlisted: boolean;
  proof_invitations: { email: string } | { email: string }[] | null;
  proof_decision_briefs:
    | {
        recommendation: string;
        why: string;
        published: boolean;
        strengths: string[];
        concerns: string[];
      }
    | Array<{
        recommendation: string;
        why: string;
        published: boolean;
        strengths: string[];
        concerns: string[];
      }>
    | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function EmployerProofHome() {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [orgName, setOrgName] = useState("");
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    void fetch("/api/proof/shortlist")
      .then((r) => r.json())
      .then((json: { organizationName?: string; runs?: RunRow[] }) => {
        setOrgName(json.organizationName || "");
        setRuns(json.runs || []);
        setEmpty(!(json.runs && json.runs.length));
      });
  }, []);

  const ready = runs.filter((r) => r.shortlisted || first(r.proof_decision_briefs)?.published);

  return (
    <div className="mx-auto max-w-[920px] px-6 py-8">
      <p className="text-app-meta text-[var(--text-tertiary)]">{orgName || "Workspace"}</p>
      <h1 className="mt-1 text-app-page text-[var(--text-primary)]">Solutions Engineer</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        {ready.length} candidate{ready.length === 1 ? "" : "s"} ready for interview
      </p>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void fetch("/api/proof/invitations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          })
            .then((r) => r.json())
            .then((json: { url?: string }) => setInviteUrl(json.url || ""));
        }}
      >
        <input
          className="flex-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-[14px]"
          placeholder="Candidate email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]">
          Invite
        </button>
      </form>
      {inviteUrl ? <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{inviteUrl}</p> : null}

      {empty ? (
        <p className="mt-10 text-[14px] text-[var(--text-secondary)]">No candidates have completed verification yet.</p>
      ) : (
        <ul className="mt-10 space-y-4">
          {runs.map((run) => {
            const brief = first(run.proof_decision_briefs);
            const invite = first(run.proof_invitations);
            if (!brief?.published && !run.shortlisted) {
              return (
                <li key={run.id} className="border-b border-[var(--border-subtle)] py-4 text-[14px] text-[var(--text-tertiary)]">
                  {invite?.email || "Candidate"} · {run.status.replace("_", " ")}
                </li>
              );
            }
            return (
              <li key={run.id} className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
                <p className="text-[16px] font-medium">{invite?.email || "Candidate"}</p>
                <p className="mt-1 text-[13px] text-[var(--fydell-evidence)]">{brief?.recommendation?.replace("_", " ")}</p>
                <p className="mt-3 text-[14px] text-[var(--text-secondary)]">{brief?.why}</p>
                <Link href={`/app/employer/proof/${run.id}`} className="mt-3 inline-block text-[13px] text-[var(--action-ink)]">
                  View evidence
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
