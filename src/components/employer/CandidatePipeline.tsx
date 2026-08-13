import Link from "next/link";
import type { InvitationRecord } from "@/app/app/employer/_lib/data";

/**
 * Where every invited candidate currently stands.
 *
 * The stages are the real `sim_invitations.status` and `sim_sessions.status`
 * values collapsed into the six a hiring team actually acts on. Nothing is
 * inferred: a candidate appears in a stage because a row says so.
 *
 * Stages with no one in them still render, at low emphasis, because an empty
 * stage is information. Hiding them would make the pipeline change shape every
 * time somebody progresses.
 */

type Stage = {
  key: string;
  label: string;
  /** What has to be true of the invitation to count here. */
  match: (r: InvitationRecord) => boolean;
  /** Where the team goes to act on this stage. */
  href: string;
};

const STAGES: Stage[] = [
  {
    key: "invited",
    label: "Invited",
    match: (r) => r.status === "sent",
    href: "/app/employer/candidates",
  },
  {
    key: "opened",
    label: "Opened the invitation",
    match: (r) => r.status === "opened",
    href: "/app/employer/candidates",
  },
  {
    key: "consented",
    label: "Consented, not started",
    match: (r) => r.status === "accepted" && r.progress === "Not started",
    href: "/app/employer/candidates",
  },
  {
    key: "working",
    label: "Working on it",
    match: (r) => r.progress === "In progress",
    href: "/app/employer/candidates",
  },
  {
    key: "scoring",
    label: "Submitted, scoring",
    match: (r) => r.progress === "Scoring",
    href: "/app/employer/candidates",
  },
  {
    key: "ready",
    label: "Report ready",
    match: (r) => r.reportReady,
    href: "/app/employer/reports",
  },
];

export default function CandidatePipeline({
  invitations,
}: {
  invitations: InvitationRecord[];
}) {
  const counts = STAGES.map((stage) => ({
    ...stage,
    count: invitations.filter(stage.match).length,
  }));

  const stalled = invitations.filter(
    (r) => r.status === "expired" || r.emailDelivery === "bounced"
  );

  return (
    <div className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <ol>
        {counts.map((stage) => {
          const empty = stage.count === 0;
          return (
            <li key={stage.key}>
              <Link
                href={stage.href}
                className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
              >
                <span
                  className={`text-[13px] ${
                    empty
                      ? "text-[var(--text-tertiary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {stage.label}
                </span>
                <span
                  className={`text-[14px] tabular-nums ${
                    empty
                      ? "text-[var(--text-tertiary)]"
                      : "font-medium text-[var(--text-primary)]"
                  }`}
                >
                  {stage.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {stalled.length > 0 ? (
        <div className="px-4 py-2.5">
          <p className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
            <span
              aria-hidden
              className="h-[7px] w-[7px] shrink-0 rounded-full border border-[rgba(233,185,73,0.6)] bg-[rgba(233,185,73,0.25)]"
            />
            {stalled.length === 1
              ? "1 invitation needs attention"
              : `${stalled.length} invitations need attention`}
          </p>
          <ul className="mt-1.5 space-y-1">
            {stalled.slice(0, 3).map((r) => (
              <li
                key={r.invitationId}
                className="flex items-baseline justify-between gap-3 text-[12px]"
              >
                <span className="truncate text-[var(--text-secondary)]">
                  {r.name || r.email}
                </span>
                <span className="shrink-0 text-[var(--text-tertiary)]">
                  {r.emailDelivery === "bounced" ? "Email bounced" : "Expired"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
