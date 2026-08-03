import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Candidates | Fydell",
  description:
    "Complete a realistic work simulation and control what you share. Show how you work, not just your resume.",
};

const POINTS = [
  {
    title: "What you do",
    body: "A clear mission, real materials, a stakeholder you can question, and a short timer. Work autosaves.",
  },
  {
    title: "What is recorded",
    body: "Your answers, resources you open, stakeholder questions, revisions, and timing.",
  },
  {
    title: "What employers see",
    body: "An evidence report with competency bands and cited actions. Not a hire or reject label.",
  },
  {
    title: "Your control",
    body: "You choose whether a verified result is added to a portable record you can share later.",
  },
];

export default function CandidatesPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-16 lg:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 40% at 60% 25%, rgba(86,98,255,0.12), transparent 70%)",
          }}
          aria-hidden
        />
        <div className="mkt-content relative z-10 pt-[130px] sm:pt-[150px]">
          <p
            className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 560 }}
          >
            For candidates
          </p>
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-[1.08] text-[#F4F5F7] sm:text-5xl">
            Show your work, not just your work history.
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-[rgba(244,245,247,0.62)]">
            Complete a five-minute simulation built for the role. You get a result you can inspect,
            and you control what you share.
          </p>
          <div className="mt-8">
            <Link
              href="/simulations"
              className="inline-flex h-[44px] items-center rounded-[10px] bg-violet-500 px-6 text-[14px] font-semibold text-white transition hover:bg-violet-400"
            >
              Try a simulation
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] py-16 lg:py-20">
        <div className="mkt-content grid gap-8 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <h2 className="text-[16px] font-semibold text-[#F4F5F7]">{point.title}</h2>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[rgba(244,245,247,0.55)]">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
