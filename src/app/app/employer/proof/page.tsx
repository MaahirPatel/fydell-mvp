"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/proof/shortlist")
      .then((r) => r.json())
      .then((json: { organizationName?: string; runs?: RunRow[] }) => {
        setOrgName(json.organizationName || "");
        setRuns(json.runs || []);
        setEmpty(!(json.runs && json.runs.length));
      })
      .finally(() => setLoading(false));
  }, []);

  const ready = runs.filter((r) => r.shortlisted || first(r.proof_decision_briefs)?.published);

  return (
    <div>
      <PageHeader
        className="border-b border-[var(--border-subtle)] pb-6"
        title="Shortlist"
        description="Solutions Engineer candidates whose work is ready for a hiring decision."
        meta={
          <>
            <span className="text-app-meta font-medium text-[var(--text-secondary)]">
              {orgName || "Workspace"}
            </span>
            <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
              {ready.length} ready for interview
            </span>
          </>
        }
      />

      <Panel className="mt-7">
        <PanelSection
          title="Invite to verified work"
          description="Create a private Solutions Engineer work link for one candidate."
        >
          <form
            className="flex max-w-[680px] flex-wrap items-end gap-2"
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
            <label className="min-w-[260px] flex-1">
              <span className="mb-1.5 block text-app-meta font-medium text-[var(--text-secondary)]">
                Candidate email
              </span>
              <input
                type="email"
                required
                className="h-9 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-app-body text-[var(--text-primary)] outline-none transition-shadow focus:border-[var(--action-ink)] focus:ring-2 focus:ring-[var(--action-ink-ring)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <Button type="submit" variant="primary" size="sm">
              Create work link
            </Button>
          </form>
          {inviteUrl ? (
            <p className="mt-3 break-all text-app-meta text-[var(--text-secondary)]">
              {inviteUrl}
            </p>
          ) : null}
        </PanelSection>
      </Panel>

      <Panel className="mt-6">
        <PanelSection
          title="Candidate work"
          action={
            <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
              {runs.length} {runs.length === 1 ? "candidate" : "candidates"}
            </span>
          }
          bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
        >
          {loading ? (
            <p className="border-t border-[var(--border-subtle)] px-5 py-5 text-app-body text-[var(--text-secondary)] lg:px-6">
              Loading candidate work…
            </p>
          ) : empty ? (
            <p className="border-t border-[var(--border-subtle)] px-5 py-5 text-app-body text-[var(--text-secondary)] lg:px-6">
              No candidate has completed verification yet.
            </p>
          ) : (
            <ul>
              {runs.map((run) => {
                const brief = first(run.proof_decision_briefs);
                const invite = first(run.proof_invitations);
                const readyForReview = Boolean(brief?.published || run.shortlisted);
                const row = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-app-body font-medium text-[var(--text-primary)]">
                        {invite?.email || "Candidate"}
                      </span>
                      {brief?.why ? (
                        <span className="mt-0.5 block truncate text-app-meta text-[var(--text-secondary)]">
                          {brief.why}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-app-meta capitalize text-[var(--text-tertiary)]">
                      {readyForReview
                        ? brief?.recommendation?.replaceAll("_", " ") || "Ready for review"
                        : run.status.replaceAll("_", " ")}
                    </span>
                    <span className="w-[92px] shrink-0 text-right text-app-meta font-medium text-[var(--action-ink)]">
                      {readyForReview ? "View evidence" : "In progress"}
                    </span>
                  </>
                );

                return (
                  <li key={run.id} className="border-t border-[var(--border-subtle)]">
                    {readyForReview ? (
                      <Link
                        href={`/app/employer/proof/${run.id}`}
                        className="flex items-center gap-4 px-5 py-3 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] lg:px-6"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 px-5 py-3 lg:px-6">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </PanelSection>
      </Panel>
    </div>
  );
}
