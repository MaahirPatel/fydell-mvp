"use client";

/**
 * The single published evaluation, as a screen rather than a row.
 *
 * With one released evaluation, a list is nine tenths empty canvas and forces
 * a dialog to see anything useful. So the candidate-facing detail is the page,
 * and the workspace's own usage of it sits alongside. When a second evaluation
 * is published this becomes a list again; see EvaluationList.
 */
import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
import { useInviteModal } from "./InviteCandidateModal";
import type { CatalogSim } from "./catalog-types";

const RESOURCE_KIND_LABEL: Record<string, string> = {
  table: "Data table",
  markdown: "Document",
};

const QUESTION_KIND_LABEL: Record<string, string> = {
  single_select: "Single choice",
  multi_select: "Multiple choice",
  number: "Number",
  text: "Written answer",
};

export interface EvaluationUsage {
  invited: number;
  inProgress: number;
  completed: number;
  reportsReady: number;
}

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <h2 className="text-[13px] font-medium text-[var(--text-primary)]">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function EvaluationDetail({
  sim,
  roleKey,
  roleTitle,
  usage,
  unpublished,
}: {
  sim: CatalogSim;
  roleKey: string;
  roleTitle: string;
  usage: EvaluationUsage;
  /** Titles of evaluations in the catalogue that are not released yet. */
  unpublished: string[];
}) {
  const { open } = useInviteModal();
  const canInvite = Boolean(sim.templateId);

  const counts: [string, number][] = [
    ["Invited", usage.invited],
    ["In progress", usage.inProgress],
    ["Completed", usage.completed],
    ["Reports ready", usage.reportsReady],
  ];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-5">
        <Panel
          title="What the candidate is asked to do"
          aside={
            <span className="text-[12px] tabular-nums text-[var(--text-tertiary)]">
              {sim.preview.companyName}
            </span>
          }
        >
          <p className="px-4 py-3.5 text-[13.5px] leading-[1.7] text-[var(--text-secondary)]">
            {sim.preview.brief}
          </p>
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Working materials">
            <ul className="divide-y divide-[var(--border-subtle)]">
              {sim.preview.resources.map((r) => (
                <li
                  key={r.title}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-[13px] text-[var(--text-primary)]">
                    {r.title}
                  </span>
                  <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">
                    {RESOURCE_KIND_LABEL[r.kind] || "Document"}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 truncate text-[13px] text-[var(--text-primary)]">
                  Conversation with {sim.preview.stakeholder.name}
                </span>
                <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">
                  {sim.preview.stakeholder.role}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="What it measures">
            <ul className="divide-y divide-[var(--border-subtle)]">
              {sim.competencies.map((c) => (
                <li key={c} className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">
                  {c}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title="The questions candidates answer"
          aside={
            <span className="text-[12px] text-[var(--text-tertiary)]">
              Answer keys are hidden here and from candidates
            </span>
          }
        >
          <ol className="divide-y divide-[var(--border-subtle)]">
            {sim.preview.questions.map((q, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="mt-[1px] shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    {q.prompt}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                    {QUESTION_KIND_LABEL[q.kind] || q.kind}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel title="In this workspace">
          {/* Four zeros is not a status, it is a shrug. Say the one true thing
              instead and put the action right under it. */}
          {counts.every(([, v]) => v === 0) ? (
            <p className="px-4 py-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
              Nobody has been invited to this yet. Send one invitation and this
              becomes a live count.
            </p>
          ) : (
          <dl className="divide-y divide-[var(--border-subtle)]">
            {counts.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <dt className="text-[13px] text-[var(--text-secondary)]">
                  {label}
                </dt>
                <dd className="text-[13px] tabular-nums text-[var(--text-primary)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          )}
          <div className="border-t border-[var(--border-subtle)] p-3">
            <Button
              variant="primary"
              className="w-full"
              disabled={!canInvite}
              onClick={() => open({ roleKey, slug: sim.slug })}
            >
              Invite a candidate
            </Button>
          </div>
        </Panel>

        <Panel title="Details">
          <dl className="divide-y divide-[var(--border-subtle)]">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-[13px] text-[var(--text-secondary)]">Role</dt>
              <dd className="text-[13px] text-[var(--text-primary)]">
                {roleTitle}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-[13px] text-[var(--text-secondary)]">
                Working time
              </dt>
              <dd className="text-[13px] tabular-nums text-[var(--text-primary)]">
                {sim.durationMinutes} min
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <dt className="text-[13px] text-[var(--text-secondary)]">
                Maintained by
              </dt>
              <dd className="text-[13px] text-[var(--text-primary)]">Fydell</dd>
            </div>
          </dl>
          <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
            The scenario is synthetic and the evaluation is read-only. It cannot
            be edited from a workspace, so every candidate sees the same version.
          </p>
        </Panel>

        {unpublished.length > 0 ? (
          <Panel title="Not available yet">
            <ul className="divide-y divide-[var(--border-subtle)]">
              {unpublished.map((title) => (
                <li
                  key={title}
                  className="px-4 py-2.5 text-[13px] text-[var(--text-tertiary)]"
                >
                  {title}
                </li>
              ))}
            </ul>
            <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
              These are in development. They cannot be invited to until they are
              released.
            </p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
