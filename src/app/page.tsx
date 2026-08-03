import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import RoleExplorer, { type RoleExplorerRole } from "@/components/marketing/home/RoleExplorer";
import EvidenceFlow from "@/components/marketing/home/EvidenceFlow";
import { MicroResultView } from "@/components/sim/MicroResultView";
import { ROLES, PATHWAYS } from "@/lib/simulations/roles";
import { simTitleForSlug } from "@/lib/simulations/sim-titles";
import type { MicroResult } from "@/lib/simulations/micro-scoring";
import { PROTOTYPE_DISCLAIMER } from "@/lib/simulations/micro-types";

export const metadata = {
  title: "Fydell | See how technical candidates solve real work",
  description:
    "Five-minute work simulations for Applied Technical Roles. Review the work, not just the resume.",
};

const EXAMPLE_PROBLEMS: Record<string, { problem: string; tools: string }> = {
  data_analyst: {
    problem:
      "A dashboard reports zero delayed revenue. The service team says two delayed orders are missing. The join is silently dropping records.",
    tools: "Data tables, metric definitions, stakeholder chat",
  },
  bi_analyst: {
    problem:
      "Finance reports an 80% renewal rate. Customer Success reports 88.9%. Leadership wants one number they can reuse every quarter.",
    tools: "Cohort data, dashboard definitions, stakeholder chat",
  },
  solutions_engineer: {
    problem:
      "A prospect wants real-time CRM sync. The product supports scheduled import and webhooks. Sales needs an honest answer today.",
    tools: "Requirements, capability docs, stakeholder chat",
  },
  implementation_consultant: {
    problem:
      "A launch-day import fails validation and the go-live date will not move. Decide what ships now and what waits.",
    tools: "Import files, configuration docs, stakeholder chat",
  },
  technical_support_engineer: {
    problem:
      "Customers cannot log in but the status page is green. Correlate the tickets against the release timeline.",
    tools: "Tickets, logs, release timeline, stakeholder chat",
  },
  business_systems_analyst: {
    problem:
      "Routine $80 purchases are landing on the CFO's desk. The system is following its rules exactly. The rules are the problem.",
    tools: "Workflow rules, process data, stakeholder chat",
  },
};

/**
 * Authentic evidence preview: a genuine scored attempt of "The Missing
 * Delays" (Data Analyst), computed with the real scoring formulas.
 * 30 + 25 + 15 + 10 + 10 = 90, Strong evidence. No fabricated metrics.
 */
const SAMPLE_RESULT: MicroResult = {
  format: "micro",
  simulationTitle: "The Missing Delays",
  roleKey: "data_analyst",
  slug: "missing-delays",
  total: 90,
  band: "strong",
  bandLabel: "Strong evidence",
  completionSeconds: 287,
  sections: [
    {
      questionId: "root_cause",
      prompt: "What is the most likely cause of the missing delayed orders?",
      kind: "single_select",
      competencyKey: "problem_diagnosis",
      candidateAnswer: "Order IDs use inconsistent formatting",
      expectedEvidence:
        "orders.csv uses A-102 / A-103 while manual_delays.csv uses A102 / A103, so the join on Order ID finds no matches.",
      pointsEarned: 30,
      pointsAvailable: 30,
      correct: true,
    },
    {
      questionId: "corrected_value",
      prompt: "What is the corrected delayed revenue in dollars?",
      kind: "number",
      competencyKey: "analytical_correctness",
      candidateAnswer: "1300",
      expectedEvidence: "A-102 ($800) + A-103 ($500) = $1,300.",
      pointsEarned: 25,
      pointsAvailable: 25,
      correct: true,
    },
    {
      questionId: "supporting_orders",
      prompt: "Which orders support the corrected number?",
      kind: "multi_select",
      competencyKey: "evidence_selection",
      candidateAnswer: "A-102, A-103",
      expectedEvidence: "A-102 and A-103 appear in the manual delay file (as A102 and A103).",
      pointsEarned: 15,
      pointsAvailable: 15,
      correct: true,
    },
    {
      questionId: "recommendation",
      prompt: "Write a recommendation that prevents this tomorrow.",
      kind: "text",
      competencyKey: "recommendation_quality",
      candidateAnswer:
        "Strip hyphens from order IDs in both files before the dashboard join so formats always match.",
      expectedEvidence:
        "Normalize order IDs (strip hyphens) in both sources before joining, validate the match rate, and alert on unmatched delay records so silent drops can't recur.",
      pointsEarned: 10,
      pointsAvailable: 20,
      correct: false,
      concepts: [
        {
          concept: "normalize_ids",
          label: "Normalize IDs before joining",
          present: true,
          quality: 1,
          evidence: 'Mentions "strip"',
        },
        {
          concept: "remove_hyphens",
          label: "Remove or standardize hyphens",
          present: true,
          quality: 1,
          evidence: 'Mentions "hyphen"',
        },
        {
          concept: "validate_match",
          label: "Validate the match rate",
          present: false,
          quality: 0,
          evidence: "Not found in the response",
        },
        {
          concept: "alert_unmatched",
          label: "Alert or test for unmatched records",
          present: false,
          quality: 0,
          evidence: "Not found in the response",
        },
      ],
    },
  ],
  strengths: [
    "Correctly identified inconsistent ID formatting as the cause of the missing records.",
    "Calculated the corrected delayed revenue of $1,300 from the source data.",
    "Asked the stakeholder a relevant clarifying question before concluding.",
  ],
  improvements: [
    "A stronger recommendation would normalize IDs before joining and add a check for unmatched delay records so this cannot silently recur.",
  ],
  competencies: [
    { key: "problem_diagnosis", label: "Problem diagnosis", earned: 30, available: 30, band: "strong", bandLabel: "Strong evidence" },
    { key: "analytical_correctness", label: "Analytical correctness", earned: 25, available: 25, band: "strong", bandLabel: "Strong evidence" },
    { key: "evidence_selection", label: "Evidence selection", earned: 15, available: 15, band: "strong", bandLabel: "Strong evidence" },
    { key: "recommendation_quality", label: "Recommendation quality", earned: 10, available: 20, band: "developing", bandLabel: "Developing evidence" },
    { key: "stakeholder_communication", label: "Stakeholder communication", earned: 10, available: 10, band: "strong", bandLabel: "Strong evidence" },
  ],
  stakeholder: {
    asked: true,
    relevant: true,
    pointsEarned: 10,
    pointsAvailable: 10,
    lastQuestion: "Do the hyphens in the order IDs mean anything, or should both files match?",
  },
  writtenEvaluationMode: "keyword",
  disclaimer: PROTOTYPE_DISCLAIMER,
};

export default function HomePage() {
  const pathwayByKey = Object.fromEntries(PATHWAYS.map((p) => [p.key, p.title]));
  const explorerRoles: RoleExplorerRole[] = ROLES.map((r) => ({
    key: r.key,
    title: r.title,
    pathway: pathwayByKey[r.pathway] || r.pathway,
    summary: r.shortDescription,
    exampleProblem: EXAMPLE_PROBLEMS[r.key]?.problem || "",
    tools: (EXAMPLE_PROBLEMS[r.key]?.tools || "").split(", "),
    competencies: r.skillsEvaluated.slice(0, 5),
    simulations: r.simulationSlugs.map((slug) => ({ slug, title: simTitleForSlug(slug) })),
    featuredSlug: r.simulationSlug,
  }));

  return (
    <MarketingShell>
      {/* ------------------------------------------------- Section 1: Hero */}
      <section className="relative overflow-hidden pb-16 lg:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 45% at 50% 35%, rgba(124,93,250,0.10), transparent 72%)",
          }}
          aria-hidden
        />
        <div className="mkt-content relative z-10 grid items-center gap-12 pt-[130px] sm:pt-[150px] lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-[150px]">
          <div>
            <p
              className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
              style={{ fontWeight: 560 }}
            >
              Applied technical hiring
            </p>
            <h1 className="flat-type mt-3 max-w-[560px] text-4xl font-semibold leading-[1.08] text-[#F4F5F7] sm:text-5xl">
              See how technical candidates solve real work.
            </h1>
            <p className="mt-5 max-w-[480px] text-[15.5px] leading-relaxed text-[rgba(244,245,247,0.62)]">
              Five-minute simulations for data, solutions, implementation, support, and systems
              roles. Review the work, not just the resume.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/simulations"
                className="inline-flex h-[44px] items-center rounded-[10px] bg-violet-500 px-6 text-[14px] font-semibold text-white transition hover:bg-violet-400"
              >
                Try a simulation
              </Link>
              <a
                href="#evidence"
                className="inline-flex h-[44px] items-center rounded-[10px] border border-white/20 px-6 text-[14px] font-semibold text-[#F4F5F7] transition hover:bg-white/[0.06]"
              >
                View an evidence report
              </a>
            </div>
          </div>
          <HeroSimPreview />
        </div>
      </section>

      {/* --------------------------------- Section 2: Applied Technical Roles */}
      <section className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="mkt-content">
          <h2 className="text-2xl font-semibold text-[#F4F5F7] sm:text-3xl">
            Built for Applied Technical Roles
          </h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[rgba(244,245,247,0.55)]">
            These roles sit between technical systems and real business problems. A resume can
            list the tools. Fydell shows how someone uses them.
          </p>
          <div className="mt-8">
            <RoleExplorer roles={explorerRoles} />
          </div>
        </div>
      </section>

      {/* ------------------------------------ Section 3: From work to evidence */}
      <section className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="mkt-content">
          <h2 className="text-2xl font-semibold text-[#F4F5F7] sm:text-3xl">
            A short simulation. A useful record.
          </h2>
          <div className="mt-8">
            <EvidenceFlow />
          </div>
        </div>
      </section>

      {/* ------------------------------- Section 4: Evidence report and CTA */}
      <section id="evidence" className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="mkt-content">
          <h2 className="text-2xl font-semibold text-[#F4F5F7] sm:text-3xl">
            See the answer and how they reached it.
          </h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[rgba(244,245,247,0.55)]">
            A real scored attempt of the Data Analyst simulation, rendered with the same
            components employers see. Every number comes from the actual scoring engine.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="rounded-xl border border-white/[0.08] bg-[#0c0d10] p-3 sm:p-4">
              <MicroResultView result={SAMPLE_RESULT} variant="dark" />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  AI-use summary
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                  In-product AI use is observed, not banned: prompts, inserted output and whether
                  the candidate verified the result afterward.
                </p>
                <p className="mt-2 text-[12px] text-white/40">
                  This attempt: no AI assistance used.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  Suggested follow-up questions
                </p>
                <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-white/65">
                  <li>How would you catch unmatched records before the dashboard ships?</li>
                  <li>What would you tell leadership about the reliability of past reports?</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-5">
                <h3 className="text-[16px] font-semibold text-white">Run a pilot</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                  Choose a role, invite a small candidate group and tell us what evidence your
                  team needs.
                </p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex h-[40px] items-center rounded-[9px] bg-violet-500 px-5 text-[13px] font-semibold text-white transition hover:bg-violet-400"
                >
                  Run a pilot
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
