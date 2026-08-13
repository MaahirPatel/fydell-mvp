import { ProductStage, StageDescription } from "@/components/fydell/ProductStage";
import { CitationLink } from "@/components/fydell/CitationLink";
import {
  CITATIONS,
  NORTHLINE_CLAIMS,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

/**
 * What sits beside the signup and login forms.
 *
 * The steps are the same three the employer Home shows a brand-new workspace,
 * so the promise made here is the screen the buyer actually lands on rather
 * than a marketing paraphrase of it.
 */

const STEPS = [
  {
    n: 1,
    title: "Create your workspace",
    detail: "Name the company. You are the owner.",
  },
  {
    n: 2,
    title: "Invite a candidate",
    detail: "One email. They get a private link to the evaluation.",
  },
  {
    n: 3,
    title: "Review the evidence",
    detail: "Open the conclusion, then open the claims behind it.",
  },
];

export default function WorkspacePreviewScene({
  /** Someone signing in already has a workspace, so the setup steps would be
      stale advice. They see the evaluation on its own. */
  variant = "signup",
}: {
  variant?: "signup" | "login";
}) {
  const claim = NORTHLINE_CLAIMS[0];

  return (
    <div className="space-y-4">
      {variant === "signup" ? (
        <ProductStage
          title="Your workspace, once you finish"
          label="The three steps a new Fydell workspace guides you through"
        >
          <ol className="divide-y divide-[var(--border-subtle)]">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="mt-[1px] inline-flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px] border border-[var(--border-default)] text-[11px] tabular-nums text-[var(--text-tertiary)]"
                >
                  {step.n}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </ProductStage>
      ) : null}

      <ProductStage
        title={NORTHLINE_SCENARIO.evaluation}
        source="Released"
        label="The released Data Analyst evaluation and a sample of the report it produces"
        meta={<span className="tabular-nums">{NORTHLINE_SCENARIO.duration}</span>}
      >
        <div className="px-4 py-3">
          <p className="text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">
            {NORTHLINE_SCENARIO.question}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
            <div className="flex gap-1.5">
              <dt className="text-[var(--text-tertiary)]">Role</dt>
              <dd className="text-[var(--text-primary)]">
                {NORTHLINE_SCENARIO.role}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-[var(--text-tertiary)]">Scenario</dt>
              <dd className="text-[var(--text-primary)]">
                {NORTHLINE_SCENARIO.company}, synthetic
              </dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
            A claim from the report it produces
          </p>
          <p className="mt-1.5 border-l-2 border-[var(--fydell-evidence)] pl-2.5 text-[12.5px] leading-[1.5] text-[var(--text-primary)]">
            {claim.text}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <CitationLink citation={CITATIONS.reclassEvents} />
            <CitationLink citation={CITATIONS.dictionary} />
          </div>
        </div>
        <StageDescription>
          The released Operations performance investigation for a Data Analyst,
          using a synthetic Northline Components scenario, with one example claim
          and the two sources it cites.
        </StageDescription>
      </ProductStage>

      {variant === "signup" ? (
        <p className="text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
          No candidate data exists until you invite someone.
        </p>
      ) : null}
    </div>
  );
}
