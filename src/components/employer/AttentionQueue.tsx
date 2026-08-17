"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useInvitationActions } from "./useInvitationActions";

/**
 * The row shape is declared here rather than imported from the server data
 * module, matching `CandidatesTable`. It keeps the client bundle free of a
 * `server-only` import and states exactly what this component renders.
 */
export interface AttentionAction {
  label: string;
  href?: string;
  invitationAction?: "resend" | "copy";
}

export type AttentionSeverity = "blocking" | "action" | "waiting";

export interface AttentionRow {
  key: string;
  invitationId: string;
  candidate: string;
  email: string;
  state: string;
  reason: string;
  severity: AttentionSeverity;
  primary: AttentionAction;
  secondary?: AttentionAction;
  /** Time in state, formatted on the server so the instant is authoritative. */
  elapsed: string;
  elapsedTitle: string;
}

/**
 * Severity is a heading, not a badge on every row.
 *
 * Three groups of two rows each are read at a glance; six rows wearing six
 * coloured pills have to be sorted by the reader before they mean anything. The
 * copy states whose turn it is, which is the only thing the reader is deciding.
 */
const GROUPS: {
  severity: AttentionSeverity;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    severity: "blocking",
    label: "Blocking",
    description: "No candidate can move past these without you.",
    color: "var(--color-risk)",
  },
  {
    severity: "action",
    label: "Needs your action",
    description: "Waiting on someone in this workspace.",
    color: "var(--color-changed)",
  },
  {
    severity: "waiting",
    label: "Waiting on Fydell",
    description: "Listed so the delay is accounted for. No action needed.",
    color: "var(--text-tertiary)",
  },
];

function ActionControl({
  action,
  invitationId,
  variant,
  busy,
  onAct,
}: {
  action: AttentionAction;
  invitationId: string;
  variant: "primary" | "secondary";
  busy: boolean;
  onAct: (id: string, action: "resend" | "copy") => void;
}) {
  if (action.href) {
    return (
      <Link
        href={action.href}
        className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-2.5 text-app-body font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
      >
        {action.label}
      </Link>
    );
  }
  if (!action.invitationAction) return null;
  const invitationAction = action.invitationAction;
  return (
    <Button
      size="sm"
      variant={variant}
      disabled={busy}
      onClick={() => onAct(invitationId, invitationAction)}
    >
      {busy ? "Working…" : action.label}
    </Button>
  );
}

export default function AttentionQueue({ rows }: { rows: AttentionRow[] }) {
  const { act, busyId, notice } = useInvitationActions();

  if (rows.length === 0) return null;

  return (
    <div>
      {notice ? (
        <p
          role="status"
          className="mb-3 break-all rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-app-body text-[var(--text-secondary)]"
        >
          {notice}
        </p>
      ) : null}

      <div className="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5">
        {GROUPS.map((group) => {
          const groupRows = rows.filter((r) => r.severity === group.severity);
          if (groupRows.length === 0) return null;

          return (
            <section key={group.severity}>
              <div className="flex items-baseline gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-panel)] px-5 py-2 lg:px-6">
                <span
                  aria-hidden
                  className="h-[6px] w-[6px] shrink-0 rounded-full"
                  style={{ background: group.color }}
                />
                <h3 className="text-app-meta font-medium text-[var(--text-primary)]">
                  {group.label}
                </h3>
                <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
                  {groupRows.length}
                </span>
                <span className="truncate text-app-meta text-[var(--text-tertiary)]">
                  {group.description}
                </span>
              </div>

              <ul>
                {groupRows.map((row) => {
                  const busy = busyId === row.invitationId;
                  return (
                    <li
                      key={row.key}
                      className="flex items-start gap-4 border-t border-[var(--border-subtle)] px-5 py-3 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] lg:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-app-body font-medium text-[var(--text-primary)]">
                            {row.candidate}
                          </span>
                          <span className="shrink-0 text-app-meta text-[var(--text-tertiary)]">
                            {row.state}
                          </span>
                        </div>
                        <p className="mt-0.5 max-w-[74ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
                          {row.reason}
                        </p>
                      </div>

                      <span
                        title={row.elapsedTitle}
                        className="w-9 shrink-0 pt-[2px] text-right font-mono text-app-meta tabular-nums text-[var(--text-tertiary)]"
                      >
                        {row.elapsed}
                      </span>

                      {/* Fixed width so time-in-state reads as a column rather
                          than drifting with each row's button widths. */}
                      <div className="flex w-[176px] shrink-0 items-center justify-end gap-1.5">
                        {row.secondary ? (
                          <ActionControl
                            action={row.secondary}
                            invitationId={row.invitationId}
                            variant="secondary"
                            busy={busy}
                            onAct={act}
                          />
                        ) : null}
                        <ActionControl
                          action={row.primary}
                          invitationId={row.invitationId}
                          variant="primary"
                          busy={busy}
                          onAct={act}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
