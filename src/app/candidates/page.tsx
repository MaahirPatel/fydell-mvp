import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import EvidenceRail from "@/components/marketing/EvidenceRail";
import { TRY_CANDIDATE_HREF } from "@/lib/marketing/ctas";

export const metadata = {
  title: "Candidates | Fydell",
  description:
    "Show your work, not just your work history. Complete realistic simulations and control what you share.",
};

const POINTS = [
  {
    title: "What the simulation contains",
    body: "A clear mission, real materials (data, docs, tickets), a stakeholder you can question, and a short timer. Work autosaves.",
  },
  {
    title: "What is recorded",
    body: "Your answers, resources you open, stakeholder questions, revisions, and timing. Enough to show how you worked, not a personality profile.",
  },
  {
    title: "AI use",
    body: "If the simulation permits in-product AI, its use is recorded and summarized for the employer. Outside tools are not inferred or claimed.",
  },
  {
    title: "What the employer receives",
    body: "An evidence report with competency bands, cited actions, and suggested follow-up questions. Not a hire/reject label.",
  },
  {
    title: "Your portable record",
    body: "You choose whether a verified result is added to a privacy-controlled record you can share later.",
  },
  {
    title: "Sharing and privacy",
    body: "Employers only see attempts for simulations they ran. You control portable-record visibility. See Trust and Privacy for details.",
  },
];

export default function CandidatesPage() {
  return (
    <MarketingShell>
      <section className="pb-16 lg:pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <h1 className="flat-type max-w-3xl text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0B1020] sm:text-[48px]">
            Show your work, not just your work history.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#586273] sm:text-[17px]">
            Fydell simulations are short, realistic work samples for applied technical roles. You
            investigate, decide, and explain - then keep control of what you share.
          </p>
          <div className="mt-8">
            <Link
              href={TRY_CANDIDATE_HREF}
              className="inline-flex h-[44px] items-center rounded-[10px] bg-[#3157D5] px-6 text-[14px] font-semibold text-white transition hover:bg-[#2342A2]"
            >
              Try the candidate experience
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="space-y-8">
            {POINTS.map((point) => (
              <div key={point.title} className="border-t border-[#D9DEE7] pt-5">
                <h2 className="text-[16px] font-semibold text-[#0B1020]">{point.title}</h2>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#586273]">{point.body}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6 sm:p-8 lg:sticky lg:top-24">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#3157D5]">
              Your path through a session
            </p>
            <EvidenceRail
              className="mt-4"
              nodes={[
                {
                  label: "Invitation",
                  detail: "Open a private link for a specific role simulation.",
                },
                {
                  label: "Work sample",
                  detail: "Use the materials, ask clarifying questions, submit your decision.",
                },
                {
                  label: "Your record",
                  detail: "Review the result and choose what, if anything, to share later.",
                },
              ]}
            />
            <Link
              href={TRY_CANDIDATE_HREF}
              className="mt-6 inline-flex h-[40px] items-center rounded-[9px] bg-[#3157D5] px-5 text-[13px] font-semibold text-white transition hover:bg-[#2342A2]"
            >
              Try the candidate experience
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
