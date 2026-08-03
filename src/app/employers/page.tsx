import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import EvidenceRail from "@/components/marketing/EvidenceRail";

export const metadata = {
  title: "Employers | Fydell",
  description:
    "Create role simulations, invite candidates, and review inspectable evidence before you hire.",
};

const STEPS = [
  {
    title: "Start from a role template",
    body: "Pick a curated simulation for the open role. Preview the brief candidates see.",
  },
  {
    title: "Invite candidates",
    body: "Send private links, track progress, and open reports as attempts complete.",
  },
  {
    title: "Review evidence",
    body: "Competencies, cited actions, and follow-up questions. Your team makes the hiring call.",
  },
];

export default function EmployersPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-16 lg:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 40% at 40% 30%, rgba(124,93,250,0.12), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="mkt-content relative z-10 pt-[130px] sm:pt-[150px]">
          <p
            className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 560 }}
          >
            For hiring teams
          </p>
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-[1.08] text-[#F4F5F7] sm:text-5xl">
            Evaluate the work the role actually requires.
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-[rgba(244,245,247,0.62)]">
            Create role-relevant simulations, invite candidates, and review evidence. Fydell does
            not auto-hire or reject.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup?next=/app/employer/simulations/new"
              className="inline-flex h-[44px] items-center rounded-[10px] bg-violet-500 px-6 text-[14px] font-semibold text-white transition hover:bg-violet-400"
            >
              Create a simulation
            </Link>
            <Link
              href="/request-pilot"
              className="inline-flex h-[44px] items-center rounded-[10px] border border-white/20 px-6 text-[14px] font-semibold text-[#F4F5F7] transition hover:bg-white/[0.06]"
            >
              Contact sales
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="mkt-content grid gap-10 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title}>
              <h2 className="text-[17px] font-semibold text-[#F4F5F7]">{step.title}</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[rgba(244,245,247,0.55)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-[#F4F5F7]">How a review stays grounded</h2>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-[rgba(244,245,247,0.55)]">
              Every claim on the report points back to something the candidate did in the session.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <EvidenceRail
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
    </MarketingShell>
  );
}
