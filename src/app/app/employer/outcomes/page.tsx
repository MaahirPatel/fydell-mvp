import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { AppliedAiDemoModule } from "@/components/employer/AppliedAiDemoModule";
import { getOutcomeRecords, type OutcomeRecord } from "../_lib/data";

export const metadata = { title: "Outcomes" };
export const dynamic = "force-dynamic";

const DECISION_PILL: Record<string, { label: string; className: string; style?: React.CSSProperties }> = {
  advance: { label: "Advance", className: "badge badge-teal" },
  hold: { label: "Hold", className: "badge badge-neutral" },
  do_not_advance: {
    label: "Decline",
    className: "badge",
    style: { background: "var(--surface-counter)", color: "var(--evidence-counter)" },
  },
  needs_further_evidence: { label: "Needs further evidence", className: "badge badge-attention" },
};

const INFLUENCE_LABEL: Record<string, string> = {
  changed: "Changed the decision",
  confirmed: "Confirmed the decision",
  no_effect: "Did not affect the decision",
};

function DecisionPill({ decision }: { decision: string }) {
  const pill = DECISION_PILL[decision] ?? { label: decision, className: "badge badge-neutral" };
  return (
    <span className={pill.className} style={pill.style}>
      {pill.label}
    </span>
  );
}

function OutcomeRow({ outcome }: { outcome: OutcomeRecord }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_170px_190px_110px] lg:px-6">
      <span className="min-w-0">
        <Link
          href={`/app/employer/candidates/${outcome.sessionId}`}
          className="block truncate text-app-body font-medium text-[var(--text-primary)] hover:underline"
        >
          {outcome.candidate}
        </Link>
        <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">
          {outcome.simulation}
          {outcome.notes ? ` · ${outcome.notes}` : ""}
        </span>
      </span>
      <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
        <DecisionPill decision={outcome.decision} />
      </span>
      <span className="hidden truncate text-app-meta text-[var(--text-secondary)] sm:block">
        {outcome.evidenceInfluence
          ? (INFLUENCE_LABEL[outcome.evidenceInfluence] ?? outcome.evidenceInfluence)
          : "Influence not recorded"}
      </span>
      <span
        className="hidden text-right font-mono text-app-meta tabular-nums text-[var(--text-tertiary)] sm:block"
        title={new Date(outcome.decidedAt).toLocaleString()}
      >
        {new Date(outcome.decidedAt).toLocaleDateString()}
      </span>
    </li>
  );
}

export default async function EmployerOutcomesPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Foutcomes");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  const outcomes = await getOutcomeRecords(org.organizationId);

  return (
    <div>
      <PageHeader
        title="Outcomes"
        description="Interview and hiring decisions your workspace has recorded, and how much the evidence mattered."
      />
      <div className="mt-7 max-w-[1080px]">
        {outcomes.length === 0 ? (
          <Panel>
            <PanelSection
              title="No outcomes yet"
              description="Outcome evidence appears after your team records an interview or hiring decision on a candidate's evidence. Fydell will not invent a chart before that data exists."
              action={
                <Link
                  href="/app/employer/evidence"
                  className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
                >
                  Review evidence
                </Link>
              }
            />
          </Panel>
        ) : (
          <Panel>
            <PanelSection
              title="Recorded decisions"
              action={
                <span className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
                  {outcomes.length} {outcomes.length === 1 ? "decision" : "decisions"}
                </span>
              }
              bodyClassName="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b border-[var(--border-subtle)] px-4 py-2.5 text-app-meta text-[var(--text-tertiary)] sm:grid-cols-[minmax(0,1fr)_170px_190px_110px] lg:px-6">
                <span>Candidate</span>
                <span className="col-start-2 sm:col-start-auto">Decision</span>
                <span className="hidden sm:block">Evidence influence</span>
                <span className="hidden text-right sm:block">Recorded</span>
              </div>
              <ul>
                {outcomes.map((outcome) => (
                  <OutcomeRow key={outcome.id} outcome={outcome} />
                ))}
              </ul>
            </PanelSection>
          </Panel>
        )}

        <p className="mt-6 max-w-[720px] text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
          Learning loop: Fydell evidence → interview finding → hiring outcome.
          Decisions are append-only; recording one does not message the candidate.
        </p>

        {outcomes.length === 0 ? (
          <AppliedAiDemoModule className="mt-6" href="/sandbox/work" />
        ) : null}
      </div>
    </div>
  );
}
