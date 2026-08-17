"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Panel } from "@/components/ui/Panel";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import { RowMenu } from "@/components/ui/RowMenu";
import { useInviteModal } from "./InviteCandidateModal";
import { useInvitationActions } from "./useInvitationActions";

export interface CandidateRow {
  invitationId: string;
  name: string;
  email: string;
  roleTitle: string;
  simulation: string;
  status: string;
  statusLabel: string;
  progress: string;
  result: string | null;
  sessionId: string | null;
  reportReady: boolean;
  canResend: boolean;
  canRevoke: boolean;
  emailDelivery?: string | null;
}

/**
 * One stage, not two columns.
 *
 * "Invitation: Opened" beside "Progress: Not started" describes a single fact
 * twice and forces the reader to reconcile them. The stage below is the
 * furthest point the candidate has actually reached.
 *
 * Tone is meaning, not decoration: green only where the candidate genuinely
 * finished, amber where the workspace needs to act, red where the invitation
 * is dead. Everything in flight is neutral.
 */
function stageOf(r: CandidateRow): { label: string; tone: StatusTone } {
  if (r.status === "revoked") return { label: "Revoked", tone: "risk" };
  if (r.status === "expired") return { label: "Expired", tone: "changed" };
  if (r.reportReady) return { label: "Report ready", tone: "good" };
  if (r.progress === "Scoring") return { label: "Scoring", tone: "neutral" };
  if (r.progress === "In progress") return { label: "Working on it", tone: "neutral" };
  if (r.status === "accepted") return { label: "Consented, not started", tone: "neutral" };
  if (r.status === "opened") return { label: "Opened the invitation", tone: "neutral" };
  return { label: "Invited", tone: "neutral" };
}

export default function CandidatesTable({
  rows,
  initialQuery = "",
}: {
  rows: CandidateRow[];
  /** Prefilled when another surface linked here about one candidate. */
  initialQuery?: string;
}) {
  const { open } = useInviteModal();
  const { act, busyId, notice } = useInvitationActions();
  const [query, setQuery] = useState(initialQuery);

  // A column where every cell says the same thing is width spent on nothing.
  // With one published evaluation that is exactly what the role column was.
  const showEvaluation = useMemo(
    () => new Set(rows.map((r) => r.simulation)).size > 1,
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.roleTitle.toLowerCase().includes(q),
    );
  }, [rows, query]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No candidates yet"
        description="Send an invitation and the candidate appears here with their status, progress and result as they move through the evaluation."
        action={
          <Button variant="primary" onClick={() => open()}>
            Invite a candidate
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Search appears once the list is long enough to need it, and whenever a
          filter is actually applied, so an incoming link can always be cleared. */}
      {rows.length > 8 || query ? (
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search candidates"
          className="max-w-[300px]"
        />
      ) : null}

      {notice ? (
        <p
          role="status"
          className="break-all rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-app-body text-[var(--text-secondary)]"
        >
          {notice}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="No matches"
          description={`No candidate matches "${query}".`}
          action={
            <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
      <>
      {/* A five-column grid on a phone is a sideways scroll with the actions
          hidden off the right edge, so below the table's usable width the same
          rows are stacked instead. */}
      <Panel className="lg:hidden">
        <ul>
          {visible.map((r) => {
            const stage = stageOf(r);
            const busy = busyId === r.invitationId;
            return (
              <li
                key={r.invitationId}
                className="border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-app-body font-medium text-[var(--text-primary)]">
                      {r.name || r.email}
                    </p>
                    {r.name ? (
                      <p className="mt-0.5 truncate text-app-meta text-[var(--text-tertiary)]">
                        {r.email}
                      </p>
                    ) : null}
                  </div>
                  <RowMenu
                    label={r.name || r.email}
                    items={[
                      {
                        label: "Resend invitation",
                        disabled: !r.canResend || busy,
                        onSelect: () => void act(r.invitationId, "resend"),
                      },
                      {
                        label: "Copy invitation link",
                        disabled: !r.canResend || busy,
                        onSelect: () => void act(r.invitationId, "copy"),
                      },
                      {
                        label: "Revoke invitation",
                        disabled: !r.canRevoke || busy,
                        destructive: true,
                        onSelect: () => void act(r.invitationId, "revoke"),
                      },
                    ]}
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <StatusTag tone={stage.tone}>{stage.label}</StatusTag>
                  {r.result ? (
                    <span className="text-app-body text-[var(--text-primary)]">
                      {r.result}
                    </span>
                  ) : null}
                  {showEvaluation ? (
                    <span className="text-app-meta text-[var(--text-tertiary)]">
                      {r.simulation}
                    </span>
                  ) : null}
                </div>

                {r.emailDelivery === "failed" ? (
                  <p className="mt-1.5 text-app-meta text-[var(--fydell-risk)]">
                    Email failed to send
                  </p>
                ) : null}
                {r.emailDelivery === "not_configured" ? (
                  <p className="mt-1.5 text-app-meta text-[var(--text-tertiary)]">
                    Not emailed. Copy the link instead.
                  </p>
                ) : null}

                {r.reportReady && r.sessionId ? (
                  <Link
                    href={`/app/employer/assessments/report/${r.sessionId}`}
                    className="mt-2.5 inline-flex h-8 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-2.5 text-app-body font-medium text-[var(--text-primary)]"
                  >
                    View report
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel className="hidden lg:block">
        <Table className={showEvaluation ? "min-w-[840px]" : "min-w-[640px]"}>
          <THead>
            <TH>Candidate</TH>
            {showEvaluation ? <TH>Evaluation</TH> : null}
            <TH>Stage</TH>
            <TH>Result</TH>
            <TH align="right">Actions</TH>
          </THead>
          <TBody>
            {visible.map((r) => {
              const stage = stageOf(r);
              const busy = busyId === r.invitationId;
              return (
                <TR key={r.invitationId}>
                  <TDPrimary>
                    <span className="block truncate">{r.name || r.email}</span>
                    {r.name ? (
                      <span className="mt-0.5 block truncate text-app-meta font-normal text-[var(--text-tertiary)]">
                        {r.email}
                      </span>
                    ) : null}
                  </TDPrimary>
                  {showEvaluation ? (
                    <TD>
                      <span className="block truncate">{r.simulation}</span>
                      <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">
                        {r.roleTitle}
                      </span>
                    </TD>
                  ) : null}
                  <TD>
                    <StatusTag tone={stage.tone}>{stage.label}</StatusTag>
                    {r.emailDelivery === "failed" ? (
                      <span className="mt-1 block text-app-meta text-[var(--fydell-risk)]">
                        Email failed to send
                      </span>
                    ) : null}
                    {r.emailDelivery === "not_configured" ? (
                      <span className="mt-1 block text-app-meta text-[var(--text-tertiary)]">
                        Not emailed. Copy the link instead.
                      </span>
                    ) : null}
                  </TD>
                  <TD>
                    {r.result ? (
                      <span className="text-[var(--text-primary)]">{r.result}</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">Pending</span>
                    )}
                  </TD>
                  <TD align="right">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                      {r.reportReady && r.sessionId ? (
                        <Link
                          href={`/app/employer/assessments/report/${r.sessionId}`}
                          className="inline-flex h-8 items-center rounded-[var(--radius-control)] px-2.5 text-app-body font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                        >
                          View report
                        </Link>
                      ) : null}
                      <RowMenu
                        label={r.name || r.email}
                        items={[
                          {
                            label: "Resend invitation",
                            disabled: !r.canResend || busy,
                            onSelect: () => void act(r.invitationId, "resend"),
                          },
                          {
                            label: "Copy invitation link",
                            disabled: !r.canResend || busy,
                            onSelect: () => void act(r.invitationId, "copy"),
                          },
                          {
                            label: "Revoke invitation",
                            disabled: !r.canRevoke || busy,
                            destructive: true,
                            onSelect: () => void act(r.invitationId, "revoke"),
                          },
                        ]}
                      />
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Panel>
      </>
      )}
    </div>
  );
}
