import Link from "next/link";
import { cn } from "@/lib/cn";
import type { InvitationRecord } from "@/app/app/employer/_lib/data";

/**
 * Where every invited candidate currently stands, as a distribution across the
 * pipeline rather than a list of counts.
 *
 * The stages are the real `sim_invitations.status` and `sim_sessions.status`
 * values collapsed into the six a hiring team acts on. Nothing is inferred: a
 * candidate appears in a stage because a row says so.
 *
 * This is deliberately not a chart. A single pilot cohort has no time series,
 * so plotting it over time would draw a shape out of noise. The question a
 * hiring team actually has is "where is everyone right now", and that is a
 * distribution.
 */

type Tone = "waiting" | "active" | "done";

type Stage = {
  key: string;
  label: string;
  /** What has to be true of the invitation to count here. */
  match: (r: InvitationRecord) => boolean;
  /** Where the team goes to act on this stage. */
  href: string;
  /**
   * Waiting means the ball is in the candidate's court, active means work is
   * underway, done means there is something to read. Three meanings, three
   * colours, matching the token layer.
   */
  tone: Tone;
};

const STAGES: Stage[] = [
  {
    key: "invited",
    label: "Invited",
    match: (r) => r.status === "sent",
    href: "/app/employer/candidates",
    tone: "waiting",
  },
  {
    key: "opened",
    label: "Opened",
    match: (r) => r.status === "opened",
    href: "/app/employer/candidates",
    tone: "waiting",
  },
  {
    key: "consented",
    label: "Consented",
    match: (r) => r.status === "accepted" && r.progress === "Not started",
    href: "/app/employer/candidates",
    tone: "waiting",
  },
  {
    key: "working",
    label: "Working",
    match: (r) => r.progress === "In progress",
    href: "/app/employer/candidates",
    tone: "active",
  },
  {
    key: "scoring",
    label: "Scoring",
    match: (r) => r.progress === "Scoring",
    href: "/app/employer/candidates",
    tone: "active",
  },
  {
    key: "ready",
    label: "Report ready",
    match: (r) => r.reportReady,
    href: "/app/employer/reports",
    tone: "done",
  },
];

const FILL: Record<Tone, string> = {
  waiting: "var(--viz-idle)",
  active: "var(--viz-active)",
  done: "var(--viz-done)",
};

export default function CandidatePipeline({
  invitations,
}: {
  invitations: InvitationRecord[];
}) {
  const stages = STAGES.map((stage) => ({
    ...stage,
    count: invitations.filter(stage.match).length,
  }));
  const total = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div>
      {total > 0 ? (
        <div
          className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-[var(--viz-track)]"
          role="img"
          aria-label={stages
            .filter((s) => s.count > 0)
            .map((s) => `${s.label}: ${s.count}`)
            .join(", ")}
        >
          {stages
            .filter((stage) => stage.count > 0)
            .map((stage) => (
              <span
                key={stage.key}
                className="h-full rounded-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(stage.count / total) * 100}%`,
                  background: FILL[stage.tone],
                }}
              />
            ))}
        </div>
      ) : null}

      {/* Empty stages still render, at low emphasis, because an empty stage is
          information. Hiding them would make the pipeline change shape every
          time somebody progresses. */}
      <ol
        className={cn(
          "grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6",
          total > 0 && "mt-4",
        )}
      >
        {stages.map((stage) => {
          const empty = stage.count === 0;
          return (
            <li key={stage.key} className="min-w-0">
              <Link
                href={stage.href}
                className="group block min-w-0 rounded-[var(--radius-control)] py-0.5"
              >
                <span className="flex items-center">
                  <span
                    className={cn(
                      "truncate text-app-meta",
                      empty
                        ? "text-[var(--text-tertiary)]"
                        : "text-[var(--text-secondary)]",
                      "transition-colors duration-[var(--motion-fast)] group-hover:text-[var(--text-primary)]",
                    )}
                  >
                    {stage.label}
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-1 block text-[20px] leading-none tabular-nums tracking-[-0.02em]",
                    empty
                      ? "font-normal text-[var(--text-tertiary)]"
                      : "font-medium text-[var(--text-primary)]",
                  )}
                >
                  {stage.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
