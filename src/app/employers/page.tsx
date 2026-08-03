import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import EvidenceRail from "@/components/marketing/EvidenceRail";
import {
  CONTACT_SALES_HREF,
  CREATE_SIMULATION_HREF,
} from "@/lib/marketing/ctas";

export const metadata = {
  title: "Employers | Fydell",
  description:
    "Evaluate the work your role actually requires. Create simulations, invite candidates, and review evidence consistently.",
};

const STEPS = [
  {
    title: "Role outcomes become a simulation",
    body: "Start from a role template or define the outcomes, constraints, and skills that matter for the open role.",
  },
  {
    title: "Skills and rubric anchors",
    body: "Each simulation maps to job-related competencies with clear evidence anchors reviewers can inspect.",
  },
  {
    title: "Invitations and candidate status",
    body: "Send private invite links, track who is in progress, and open reports as candidates complete.",
  },
  {
    title: "Consistent evidence review",
    body: "Compare attempts against the same rubric. Suggested interview questions come from evidence gaps, not generic scripts.",
  },
];

const WORKSPACE = [
  {
    label: "Simulation builder",
    detail: "Pick a role flagship, preview the candidate brief, then invite.",
  },
  {
    label: "Candidate table",
    detail: "Invitation state, progress, and report readiness in one list.",
  },
  {
    label: "Evidence report",
    detail: "Competencies, cited actions, AI-use summary, and follow-ups.",
  },
];

export default function EmployersPage() {
  return (
    <MarketingShell>
      <section className="pb-16 lg:pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <h1 className="flat-type max-w-3xl text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0B1020] sm:text-[48px]">
            Evaluate the work your role actually requires.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#586273] sm:text-[17px]">
            Hiring teams create role-relevant simulations, invite candidates, and review
            inspectable evidence. The hiring decision stays with your team.
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

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content">
          <h2 className="max-w-2xl text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[32px]">
            From open role to reviewable evidence.
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {STEPS.map((step) => (
              <div key={step.title} className="border-t border-[#D9DEE7] pt-5">
                <h3 className="text-[16px] font-semibold text-[#0B1020]">{step.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#586273]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[32px]">
              The employer workspace.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#586273]">
              Overview, simulations, candidates, and reports share one mineral workbench. No fake
              analytics tiles. Attention goes to what needs review.
            </p>
            <ul className="mt-8 space-y-5">
              {WORKSPACE.map((item) => (
                <li key={item.label}>
                  <p className="text-[15px] font-semibold text-[#0B1020]">{item.label}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#586273]">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6 sm:p-8">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#3157D5]">
              Evidence path
            </p>
            <h3 className="mt-2 text-[18px] font-semibold text-[#0B1020]">
              How a review stays grounded
            </h3>
            <EvidenceRail
              className="mt-4"
              nodes={[
                {
                  label: "Role requirement",
                  detail: "Honest architecture fit for a Solutions Engineer prospect.",
                },
                {
                  label: "Observed work",
                  detail: "Compared requirements to capabilities, asked sales what was promised.",
                },
                {
                  label: "Report citation",
                  detail: "Gap named in the customer explanation; follow-up interview question ready.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content max-w-2xl">
          <h2 className="text-[28px] font-semibold tracking-[-0.035em] text-[#0B1020] sm:text-[32px]">
            Reports support the decision. They do not make it.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#586273]">
            Fydell does not show percentiles or hire/reject recommendations. Your team reads the
            evidence and decides.
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
