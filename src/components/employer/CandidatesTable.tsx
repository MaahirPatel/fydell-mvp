"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Surface } from "@/components/ui/Surface";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
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

const STATUS_TONE: Record<string, StatusTone> = {
  sent: "neutral",
  opened: "active",
  accepted: "active",
  started: "active",
  completed: "good",
  expired: "changed",
  revoked: "risk",
};

export default function CandidatesTable({ rows }: { rows: CandidateRow[] }) {
  const { open } = useInviteModal();
  const { act, busyId, notice } = useInvitationActions();
  const [query, setQuery] = useState("");

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
      {/* Search only appears once the list is long enough to need it. */}
      {rows.length > 8 ? (
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or role"
          aria-label="Search candidates"
          className="max-w-[300px]"
        />
      ) : null}

      {notice ? (
        <p
          role="status"
          className="break-all rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[13px] text-[var(--text-secondary)]"
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
      <Surface tone="panel" className="overflow-hidden">
        <Table className="min-w-[900px]">
          <THead>
            <TH>Candidate</TH>
            <TH>Role</TH>
            <TH>Invitation</TH>
            <TH>Progress</TH>
            <TH>Result</TH>
            <TH align="right">Actions</TH>
          </THead>
          <TBody>
            {visible.map((r) => (
              <TR key={r.invitationId}>
                <TDPrimary>
                  <span className="block truncate">{r.name || r.email}</span>
                  {r.name ? (
                    <span className="mt-0.5 block truncate text-[12.5px] font-normal text-[var(--text-tertiary)]">
                      {r.email}
                    </span>
                  ) : null}
                </TDPrimary>
                <TD>
                  <span className="block truncate">{r.roleTitle}</span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-[var(--text-tertiary)]">
                    {r.simulation}
                  </span>
                </TD>
                <TD>
                  <StatusTag tone={STATUS_TONE[r.status] ?? "neutral"}>
                    {r.statusLabel}
                  </StatusTag>
                  {r.emailDelivery === "failed" ? (
                    <span className="mt-1 block text-[12px] text-[var(--fydell-risk)]">
                      Email failed to send
                    </span>
                  ) : null}
                </TD>
                <TD>{r.progress}</TD>
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
                        className="inline-flex h-8 items-center rounded-[8px] px-2.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                      >
                        View report
                      </Link>
                    ) : null}
                    {r.canResend ? (
                      <>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => void act(r.invitationId, "resend")}
                          disabled={busyId === r.invitationId}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => void act(r.invitationId, "copy")}
                          disabled={busyId === r.invitationId}
                        >
                          Copy link
                        </Button>
                      </>
                    ) : null}
                    {r.canRevoke ? (
                      <Button
                        variant="quiet"
                        size="sm"
                        className="text-[var(--fydell-risk)] hover:text-[var(--fydell-risk)]"
                        onClick={() => void act(r.invitationId, "revoke")}
                        disabled={busyId === r.invitationId}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Surface>
      )}
    </div>
  );
}
