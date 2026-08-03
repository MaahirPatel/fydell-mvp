import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import RoleExplorer, { type RoleExplorerRole } from "@/components/marketing/home/RoleExplorer";
import EvidenceFlow from "@/components/marketing/home/EvidenceFlow";
import EvidenceRail from "@/components/marketing/EvidenceRail";
import { ROLES, PATHWAYS } from "@/lib/simulations/roles";
import { simTitleForSlug } from "@/lib/simulations/sim-titles";
import {
  CONTACT_SALES_HREF,
  CREATE_SIMULATION_HREF,
  TRY_CANDIDATE_HREF,
} from "@/lib/marketing/ctas";

export const metadata = {
  title: "Fydell | See how candidates work before you hire them",
  description:
    "Create realistic job simulations, invite candidates, and review evidence of how they investigate, decide, use tools, and communicate.",
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

const EVIDENCE_NODES = [
  {
    label: "Requirement",
    detail: "Explain why delayed revenue shows zero when operations knows of two delayed orders.",
  },
  {
    label: "Candidate action",
    detail: "Opened both CSV files, compared Order ID formats, asked Operations about hyphens.",
  },
  {
    label: "Citation",
    detail: "Corrected delayed revenue to $1,300 with orders A-102 and A-103 cited in the report.",
  },
];

const TRADITIONAL = [
  "Resume claims",
  "Scripted screening",
  "Generic tests",
  "A final answer without context",
  "Evidence trapped inside one application",
];

const FYDELL_PROCESS = [
  "Role-relevant work",
  "Decisions under realistic constraints",
  "Technical and communication evidence together",
  "An inspectable record of the process",
  "A portable record the candidate can carry forward",
];

const TRUST_POINTS = [
  {
    title: "Session provenance",
    body: "Invitations and attempts are tied to real sessions with timestamps you can inspect.",
  },
  {
    title: "Recorded AI use",
    body: "In-product AI use is observed and summarized, not banned or guessed at outside the product.",
  },
  {
    title: "Job-related rubrics",
    body: "Scoring anchors to competencies for the role. Scores are labeled as evidence, not hire advice.",
  },
  {
    title: "Human-readable review",
    body: "Every judgment points at actions, answers, and resources from the attempt.",
  },
];

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
      <section className="relative overflow-hidden pb-16 lg:pb-24">
        <div className="mkt-content relative z-10 grid items-center gap-12 pt-[130px] sm:pt-[150px] lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-[150px]">
          <div>
            <p
              className="text-[28px] leading-none text-[#0B1020] sm:text-[32px]"
              style={{ fontWeight: 600, letterSpacing: "-0.045em" }}
            >
              fydell
            </p>
            <h1 className="flat-type mt-4 max-w-[560px] text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0B1020] sm:text-[48px] lg:text-[56px]">
              See how candidates work before you hire them.
            </h1>
            <p className="mt-5 max-w-[480px] text-[16px] leading-relaxed text-[#586273] sm:text-[17px]">
              Create realistic job simulations, invite candidates, and review evidence of how they
              investigate, decide, use tools, and communicate.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={CREATE_SIMULATION_HREF}
                className="inline-flex h-[44px] items-center rounded-[10px] bg-[#3157D5] px-6 text-[14px] font-semibold text-white transition hover:bg-[#2342A2]"
              >
                Create a simulation
              </Link>
              <Link
                href={TRY_CANDIDATE_HREF}
                className="inline-flex h-[44px] items-center rounded-[10px] border border-[#D9DEE7] bg-[#FCFCFA] px-6 text-[14px] font-semibold text-[#0B1020] transition hover:border-[#3157D5]/40"
              >
                Try the candidate experience
              </Link>
            </div>
            <p className="mt-4 text-[13.5px] text-[#586273]">
              Built for applied technical roles where a resume cannot show the work.
            </p>
          </div>
          <HeroSimPreview />
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-2xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            Replace claims with demonstrated work.
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <p className="text-[13px] font-semibold text-[#586273]">Traditional process</p>
              <ul className="mt-4 space-y-3">
                {TRADITIONAL.map((item) => (
                  <li key={item} className="border-b border-[#D9DEE7] pb-3 text-[15px] text-[#586273]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#3157D5]">Fydell process</p>
              <ul className="mt-4 space-y-3">
                {FYDELL_PROCESS.map((item) => (
                  <li key={item} className="border-b border-[#D9DEE7] pb-3 text-[15px] text-[#0B1020]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-2xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            From role requirements to hiring evidence.
          </h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#586273]">
            One continuous loop: define the work, run the simulation, review the evidence. Switch
            among the states below without leaving the page.
          </p>
          <div className="mt-8">
            <EvidenceFlow />
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-2xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            A work sample, not another questionnaire.
          </h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#586273]">
            Candidates investigate a realistic problem, inspect supplied materials, ask a
            stakeholder clarifying questions, respond to constraints, and explain tradeoffs.
          </p>
          <div className="mt-8 overflow-hidden rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA]">
            <div className="flex items-center justify-between gap-2 border-b border-[#D9DEE7] bg-[#F4F3EF] px-4 py-3 sm:px-5">
              <div>
                <p className="text-[13px] font-semibold text-[#0B1020]">The Missing Delays</p>
                <p className="text-[12px] text-[#586273]">Data Analyst · workbench</p>
              </div>
              <span className="rounded-md border border-[#D9DEE7] bg-white px-2 py-0.5 font-mono text-[11px] text-[#0B1020]">
                4:12
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div className="rounded-[10px] border border-[#D9DEE7] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#586273]">
                  orders.csv
                </p>
                <p className="mt-2 font-mono text-[12px] text-[#0B1020]">A-102 · $800</p>
                <p className="font-mono text-[12px] text-[#0B1020]">A-103 · $500</p>
              </div>
              <div className="rounded-[10px] border border-[#D9DEE7] bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#586273]">
                  Stakeholder
                </p>
                <p className="mt-2 text-[13px] text-[#0B1020]">
                  Do the hyphens in the order IDs mean anything?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="evidence" className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-2xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            Every judgment points back to evidence.
          </h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#586273]">
            A real scored attempt of the Data Analyst simulation. Requirement, action, and citation
            stay connected on one rail.
          </p>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D9DEE7] pb-5">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#3157D5]">
                    Simulation completed
                  </p>
                  <h3 className="mt-1 text-[20px] font-semibold text-[#0B1020]">The Missing Delays</h3>
                  <p className="mt-1 text-[14px] text-[#586273]">Data Analyst · 4m 47s</p>
                </div>
                <div className="text-right">
                  <p className="text-[28px] font-semibold tabular-nums text-[#0B1020]">90</p>
                  <span className="mt-1 inline-block rounded-md bg-[#EEF2FF] px-2.5 py-1 text-[12px] font-semibold text-[#3157D5]">
                    Strong evidence
                  </span>
                </div>
              </div>
              <EvidenceRail nodes={EVIDENCE_NODES} className="mt-2" />
              <p className="mt-4 text-[12.5px] leading-relaxed text-[#586273]">
                Prototype evidence from the scoring engine. Not a hire or reject recommendation.
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-[13px] font-semibold text-[#0B1020]">Employer side</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#586273]">
                  Structured evidence for the current hiring decision: competencies, cited actions,
                  and suggested interview follow-ups.
                </p>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#0B1020]">Candidate side</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#586273]">
                  A privacy-controlled portable record the candidate can choose to share, showing
                  verified simulations and demonstrated skills.
                </p>
              </div>
              <Link
                href="/trust"
                className="inline-flex text-[14px] font-semibold text-[#3157D5] hover:text-[#2342A2]"
              >
                How evaluation and privacy work →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-3xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            Built first for work that mixes technical judgment and communication.
          </h2>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#586273]">
            Six applied technical roles share one evidence architecture. Each role has distinct
            work, resources, decisions, and rubrics.
          </p>
          <div className="mt-8">
            <RoleExplorer roles={explorerRoles} />
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-2xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            Trust the evidence because you can inspect it.
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {TRUST_POINTS.map((item) => (
              <div key={item.title} className="border-t border-[#D9DEE7] pt-4">
                <h3 className="text-[15px] font-semibold text-[#0B1020]">{item.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#586273]">{item.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="/trust"
            className="mt-8 inline-flex text-[14px] font-semibold text-[#3157D5] hover:text-[#2342A2]"
          >
            Read the Trust page →
          </Link>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content max-w-2xl">
          <h2 className="text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[36px]">
            Create the first simulation for your role.
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[#586273]">
            Define the work, invite candidates, and review a complete evidence report in one
            workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={CREATE_SIMULATION_HREF}
              className="inline-flex h-[44px] items-center rounded-[10px] bg-[#3157D5] px-6 text-[14px] font-semibold text-white transition hover:bg-[#2342A2]"
            >
              Create a simulation
            </Link>
            <Link
              href={CONTACT_SALES_HREF}
              className="inline-flex h-[44px] items-center rounded-[10px] border border-[#D9DEE7] bg-[#FCFCFA] px-6 text-[14px] font-semibold text-[#0B1020] transition hover:border-[#3157D5]/40"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
