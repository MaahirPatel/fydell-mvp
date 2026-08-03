import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import EvidenceRail from "@/components/marketing/EvidenceRail";
import {
  CREATE_SIMULATION_HREF,
  TRY_CANDIDATE_HREF,
} from "@/lib/marketing/ctas";

export const metadata = {
  title: "Product | Fydell",
  description:
    "Create a role simulation, invite candidates, review evidence, and let candidates keep a portable record.",
};

const FLOW = [
  {
    title: "Create a Solutions Engineer role",
    body: "A hiring manager starts from a role template and sets the outcomes that matter for the open role.",
  },
  {
    title: "Structure the scenario and rubric",
    body: "Fydell turns role requirements into a scenario with materials, stakeholder paths, and evidence anchors.",
  },
  {
    title: "Preview and publish",
    body: "Review the candidate brief, edit what you need, then publish the simulation to your workspace.",
  },
  {
    title: "Candidate completes the work",
    body: "The candidate receives a private invitation, investigates with real materials, and submits a decision.",
  },
  {
    title: "Employer inspects evidence",
    body: "Competencies, cited actions, AI-use summary, and interview follow-ups appear in one report.",
  },
  {
    title: "Candidate controls the record",
    body: "The candidate chooses whether to add the verified result to a privacy-controlled portable record.",
  },
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="pb-16 lg:pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <h1 className="flat-type max-w-3xl text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0B1020] sm:text-[48px]">
            One continuous loop from role to evidence.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#586273] sm:text-[17px]">
            Follow a single Solutions Engineer example through creation, invitation, work, review,
            and the candidate-owned record.
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
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <ol className="space-y-0">
            {FLOW.map((step, i) => (
              <li
                key={step.title}
                className="grid gap-3 border-b border-[#D9DEE7] py-6 sm:grid-cols-[56px_1fr] sm:gap-6"
              >
                <span className="text-[13px] font-semibold tabular-nums text-[#3157D5]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="text-[17px] font-semibold text-[#0B1020]">{step.title}</h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#586273]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6 sm:p-8 lg:sticky lg:top-24">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#3157D5]">
              Product signature
            </p>
            <h3 className="mt-2 text-[18px] font-semibold text-[#0B1020]">
              Requirement to citation
            </h3>
            <EvidenceRail
              className="mt-4"
              nodes={[
                {
                  label: "Requirement",
                  detail: "Can we support real-time CRM write-back for this prospect?",
                },
                {
                  label: "Action",
                  detail: "Compared capability docs to the request; asked sales what was promised.",
                },
                {
                  label: "Citation",
                  detail: "Write-back gap named in the explanation with a workable alternative.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] py-16 lg:py-24">
        <div className="mkt-content max-w-2xl">
          <h2 className="text-[24px] font-semibold text-[#0B1020] sm:text-[28px]">
            What we do not claim
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#586273]">
            Scores are labeled as prototype evidence. We do not show percentiles, we do not make
            hire or reject recommendations, and we do not claim to detect AI use outside the
            product. The evidence is real; the judgment is yours.
          </p>
          <Link
            href={CREATE_SIMULATION_HREF}
            className="mt-8 inline-flex h-[44px] items-center rounded-[10px] bg-[#3157D5] px-6 text-[14px] font-semibold text-white transition hover:bg-[#2342A2]"
          >
            Create a simulation
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
