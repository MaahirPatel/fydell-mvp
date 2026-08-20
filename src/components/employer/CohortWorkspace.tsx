"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Dialog, Drawer } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, FormError, Input } from "@/components/ui/Field";
import { MetricStrip } from "@/components/ui/MetricStrip";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Surface } from "@/components/ui/Surface";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";

type CohortStatus = "draft" | "open" | "paused" | "closed";

interface CohortPayload {
  cohort: {
    id: string;
    name: string;
    status: CohortStatus;
    invitation_expires_days: number;
    template_version_id: string;
  };
  evaluationSlug: string;
  metrics: {
    invited: number;
    opened: number;
    inProgress: number;
    submitted: number;
    reportsReady: number;
    humanReview: number;
    reviewed: number;
  };
  invitations: Array<{
    id: string;
    candidate_email: string;
    candidate_name: string | null;
    status: string;
    email_delivery: string;
    expires_at: string;
    sim_sessions:
      | { id: string; status: string; report_status: string; review_status: string }
      | { id: string; status: string; report_status: string; review_status: string }[]
      | null;
  }>;
}

const COHORT_TONE: Record<CohortStatus, StatusTone> = {
  draft: "neutral",
  open: "good",
  paused: "changed",
  closed: "neutral",
};

const INVITE_TONE: Record<string, StatusTone> = {
  sent: "neutral",
  opened: "active",
  accepted: "active",
  started: "active",
  completed: "good",
  expired: "changed",
  revoked: "risk",
};

function deliveryLabel(value: string): string {
  if (value === "sent") return "Emailed";
  if (value === "failed") return "Email failed";
  return "Link created, not emailed";
}

function sessionOf(row: CohortPayload["invitations"][number]) {
  if (!row.sim_sessions) return null;
  return Array.isArray(row.sim_sessions) ? row.sim_sessions[0] : row.sim_sessions;
}

export default function CohortWorkspace({
  organizationName,
}: {
  organizationName: string;
}) {
  const [data, setData] = useState<CohortPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/pilot/cohort");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load this cohort");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this cohort");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const setStatus = async (status: CohortStatus) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot/cohort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update the cohort");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the cohort");
    } finally {
      setBusy(false);
      setConfirmClose(false);
    }
  };

  const invite = async () => {
    setBusy(true);
    setInviteError(null);
    setInviteResult(null);
    setCopied(false);
    try {
      const res = await fetch("/api/sim/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usePilotCohort: true,
          candidates: [
            { email: inviteEmail.trim(), name: inviteName.trim() || undefined },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.errors?.[0] || "Could not create the invitation");
      }
      const first = json.created?.[0] || json.invitations?.[0];
      if (first?.inviteUrl) {
        setInviteResult({
          url: first.inviteUrl,
          label: first.deliveryLabel || "Link created, not emailed",
        });
      }
      setInviteEmail("");
      setInviteName("");
      await load();
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Could not create the invitation"
      );
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) {
    return (
      <Surface tone="panel" className="p-4">
        <SkeletonTable rows={4} cols={4} />
      </Surface>
    );
  }

  if (error && !data) {
    return (
      <EmptyState
        title="This cohort is not ready yet"
        description={error}
        action={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!data) return null;

  const { cohort, metrics } = data;
  const canInvite = cohort.status === "open";

  return (
    <div className="space-y-7">
      <Surface tone="panel" className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-[var(--text-tertiary)]">{organizationName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2 className="text-[17px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                {cohort.name}
              </h2>
              <StatusTag tone={COHORT_TONE[cohort.status]}>
                {cohort.status.charAt(0).toUpperCase() + cohort.status.slice(1)}
              </StatusTag>
            </div>
            <p className="mt-1.5 text-[13px] text-[var(--text-secondary)]">
              Operations performance investigation · invitations expire after{" "}
              {cohort.invitation_expires_days} days
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setInviteResult(null);
                setInviteError(null);
                setInviteOpen(true);
              }}
              disabled={!canInvite}
              title={canInvite ? undefined : "Open the cohort before inviting candidates."}
            >
              Invite candidate
            </Button>
            {cohort.status !== "open" && cohort.status !== "closed" ? (
              <Button variant="secondary" disabled={busy} onClick={() => void setStatus("open")}>
                Open cohort
              </Button>
            ) : null}
            {cohort.status === "open" ? (
              <Button variant="secondary" disabled={busy} onClick={() => void setStatus("paused")}>
                Pause
              </Button>
            ) : null}
            {cohort.status === "paused" ? (
              <Button variant="secondary" disabled={busy} onClick={() => void setStatus("open")}>
                Resume
              </Button>
            ) : null}
            {cohort.status !== "closed" ? (
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => setConfirmClose(true)}
              >
                Close
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-[13px] text-[var(--fydell-risk)]">
            {error}
          </p>
        ) : null}
      </Surface>

      {metrics.invited > 0 ? (
        <MetricStrip
          items={[
            { label: "Invited", value: metrics.invited },
            { label: "Opened", value: metrics.opened },
            { label: "In progress", value: metrics.inProgress },
            { label: "Submitted", value: metrics.submitted },
            { label: "Reports ready", value: metrics.reportsReady },
            { label: "Needs review", value: metrics.humanReview },
          ]}
        />
      ) : null}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
            Candidates in this cohort
          </h3>
          {metrics.reportsReady >= 2 ? (
            <Link
              href="/app/employer/compare"
              className="text-[13px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
            >
              Compare completed
            </Link>
          ) : null}
        </div>

        <div className="mt-3">
          {data.invitations.length === 0 ? (
            <EmptyState
              title="No candidates yet"
              description={
                canInvite
                  ? "Send the first invitation and this becomes the queue you work from."
                  : "Open the cohort, then send the first invitation."
              }
              action={
                canInvite ? (
                  <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
                    Invite candidate
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void setStatus("open")}
                  >
                    Open cohort
                  </Button>
                )
              }
            />
          ) : (
            <Surface tone="panel" className="overflow-hidden">
              <Table className="min-w-[760px]">
                <THead>
                  <TH>Candidate</TH>
                  <TH>Invitation</TH>
                  <TH>Attempt</TH>
                  <TH>Report</TH>
                  <TH align="right">Action</TH>
                </THead>
                <TBody>
                  {data.invitations.map((row) => {
                    const session = sessionOf(row);
                    return (
                      <TR key={row.id}>
                        <TDPrimary>
                          <span className="block truncate">
                            {row.candidate_name || row.candidate_email}
                          </span>
                          {row.candidate_name ? (
                            <span className="mt-0.5 block truncate text-[12.5px] font-normal text-[var(--text-tertiary)]">
                              {row.candidate_email}
                            </span>
                          ) : null}
                        </TDPrimary>
                        <TD>
                          <StatusTag tone={INVITE_TONE[row.status] ?? "neutral"}>
                            {row.status}
                          </StatusTag>
                          <span className="mt-1 block text-[12px] text-[var(--text-tertiary)]">
                            {deliveryLabel(row.email_delivery)}
                          </span>
                        </TD>
                        <TD>{session?.status || "Not started"}</TD>
                        <TD>{session?.report_status || "Not available"}</TD>
                        <TD align="right">
                          {session?.id ? (
                            <Link
                              href={`/app/employer/assessments/report/${session.id}`}
                              className="inline-flex h-8 items-center rounded-[var(--radius-control)] px-2.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              Open report
                            </Link>
                          ) : (
                            <span className="text-[var(--text-tertiary)]">None yet</span>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Surface>
          )}
        </div>
      </section>

      <Drawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a candidate"
        description={`They receive a single-use link to ${cohort.name}.`}
        footer={
          inviteResult ? (
            <Button variant="primary" onClick={() => setInviteOpen(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="quiet" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={busy}
                disabled={!inviteEmail.trim()}
                onClick={() => void invite()}
              >
                Send invitation
              </Button>
            </>
          )
        }
      >
        {inviteResult ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-panel)] border border-[rgba(103,217,160,0.28)] bg-[rgba(103,217,160,0.07)] px-3.5 py-3">
              <p className="text-[13.5px] font-medium text-[#8fe6bb]">
                Invitation created
              </p>
              <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                {inviteResult.label}.
              </p>
            </div>
            <div>
              <p className="text-[12.5px] text-[var(--text-tertiary)]">Secure link</p>
              <p className="mt-1 break-all rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-band)] px-3 py-2 text-[12.5px] text-[var(--text-secondary)]">
                {inviteResult.url}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteResult.url);
                    setCopied(true);
                  }}
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setInviteResult(null);
                    setCopied(false);
                  }}
                >
                  Invite another
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Email" htmlFor="cohort-invite-email">
              <Input
                id="cohort-invite-email"
                type="email"
                autoComplete="off"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                invalid={Boolean(inviteError)}
              />
            </Field>
            <Field label="Name" htmlFor="cohort-invite-name" optional>
              <Input
                id="cohort-invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </Field>
            <FormError>{inviteError}</FormError>
          </div>
        )}
      </Drawer>

      <Dialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close this cohort?"
        description="New invitations will be blocked. Attempts already submitted are unchanged."
        width="sm"
        footer={
          <>
            <Button variant="quiet" onClick={() => setConfirmClose(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={busy}
              onClick={() => void setStatus("closed")}
            >
              Close cohort
            </Button>
          </>
        }
      >
        <p className="text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
          Candidates who already hold an unopened link will no longer be able to
          start. You can reopen the cohort afterwards.
        </p>
      </Dialog>
    </div>
  );
}
