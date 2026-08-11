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
  title: "Fydell | See how candidates work before you interview",
  description:
    "Realistic role-specific work simulations with inspectable evidence reports and candidate-controlled Work Receipts.",
}

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
 * Authentic evidence preview from The Missing Delays scoring path.
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
      prompt: "Which orders support your conclusion?",
      kind: "multi_select",
      competencyKey: "evidence_selection",
      candidateAnswer: "A-102, A-103",
      expectedEvidence: "A-102 and A-103 appear in both files once IDs are normalized.",
      pointsEarned: 15,
      pointsAvailable: 15,
      correct: true,
    },
    {
      questionId: "recommendation",
      prompt: "What should the team do next?",
      kind: "text",
      competencyKey: "recommendation_quality",
      candidateAnswer:
        "Strip hyphens from order IDs in both files before the dashboard join so formats always match.",
      expectedEvidence: "Normalize IDs before joining and add a check for unmatched delay records.",
      pointsEarned: 10,
      pointsAvailable: 20,
      correct: false,
      concepts: [
        {
          concept: "normalize_ids",
          label: "Normalize IDs",
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
    {
      key: "problem_diagnosis",
      label: "Problem diagnosis",
      earned: 30,
      available: 30,
      band: "strong",
      bandLabel: "Strong evidence",
    },
    {
      key: "analytical_correctness",
      label: "Analytical correctness",
      earned: 25,
      available: 25,
      band: "strong",
      bandLabel: "Strong evidence",
    },
    {
      key: "evidence_selection",
      label: "Evidence selection",
      earned: 15,
      available: 15,
      band: "strong",
      bandLabel: "Strong evidence",
    },
    {
      key: "recommendation_quality",
      label: "Recommendation quality",
      earned: 10,
      available: 20,
      band: "developing",
      bandLabel: "Developing evidence",
    },
    {
      key: "stakeholder_communication",
      label: "Stakeholder communication",
      earned: 10,
      available: 10,
      band: "strong",
      bandLabel: "Strong evidence",
    },
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
      {/* Hero: text on top, product visual below (Linear composition) */}
      <section className="relative overflow-hidden pb-8 pt-[120px] sm:pt-[132px] lg:pb-10">
        <div className="mkt-content relative z-10">
          <div className="mx-auto max-w-[920px] text-center">
            <h1
              className="flat-type text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[52px] lg:text-[56px]"
              style={{ textWrap: "balance" }}
            >
              See how candidates work before deciding whom to interview.
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-relaxed text-white/50 sm:text-[17px]">
              Fydell gives candidates a realistic role-specific task and turns their decisions,
              evidence, final artifact, and follow-up defense into an inspectable report for
              employers. Candidates can carry a private Work Receipt with their permission.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/request-pilot"
                className="inline-flex h-10 items-center rounded-full bg-white px-5 text-[14px] font-medium text-black transition hover:bg-white/90"
              >
                Request a pilot
              </Link>
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-[14px] font-medium text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-[980px] sm:mt-16">
            <HeroSimPreview />
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="relative z-10 border-t border-white/[0.06] py-20 lg:py-24">
        <div className="mkt-content">
          <div className="max-w-2xl">
            <h2 className="flat-type text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[34px]">
              Built for Applied Technical Roles
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/45">
              These roles sit between technical systems and real business problems. A resume can
              list the tools. Fydell shows how someone uses them.
            </p>
          </div>
          <div className="mt-10">
            <RoleExplorer roles={explorerRoles} />
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="relative z-10 border-t border-white/[0.06] py-20 lg:py-24">
        <div className="mkt-content">
          <h2 className="flat-type text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[34px]">
            A short simulation. A useful record.
          </h2>
          <div className="mt-10">
            <EvidenceFlow />
          </div>
        </div>
      </section>

      {/* Evidence */}
      <section
        id="evidence"
        className="relative z-10 border-t border-white/[0.06] py-20 lg:py-24"
      >
        <div className="mkt-content">
          <div className="max-w-2xl">
            <h2 className="flat-type text-[28px] font-semibold tracking-[-0.03em] text-white sm:text-[34px]">
              See the answer and how they reached it.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/45">
              A real scored attempt of the Data Analyst simulation, rendered with the same
              components employers see.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="rounded-[14px] border border-white/[0.08] bg-[#0C0D12] p-3 sm:p-4">
              <MicroResultView result={SAMPLE_RESULT} variant="dark" />
            </div>
            <div className="space-y-4">
              <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/35">
                  AI-use summary
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                  In-product AI use is observed, not banned: prompts, inserted output, and whether
                  the candidate verified the result afterward.
                </p>
                <p className="mt-2 text-[12px] text-white/35">This attempt: no AI assistance used.</p>
              </div>
              <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.03] p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/35">
                  Suggested follow-ups
                </p>
                <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-white/55">
                  <li>How would you catch unmatched records before the dashboard ships?</li>
                  <li>What would you tell leadership about past report reliability?</li>
                </ul>
              </div>
              <div className="rounded-[14px] border border-white/[0.1] bg-white/[0.04] p-5">
                <h3 className="text-[15px] font-semibold text-white">Run a pilot</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  Choose a role, invite a small candidate group, and review the evidence your team
                  needs.
                </p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-black transition hover:bg-white/90"
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
