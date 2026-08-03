import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Product | Fydell",
  description:
    "One loop: choose a role, solve one realistic problem, submit the work, review the evidence.",
};

const PIECES = [
  {
    title: "The simulation runner",
    body: "Candidates get a clear mission, two or three resources, a stakeholder to question and a five-minute timer. Work autosaves. A refresh loses nothing.",
    href: "/simulations",
    linkLabel: "Try one now",
  },
  {
    title: "The simulation library",
    body: "Thirty curated simulations across six Applied Technical Roles. Each one tests a single representative decision, not a whole job. No AI-generated filler.",
    href: "/simulations",
    linkLabel: "Browse the library",
  },
  {
    title: "The evidence report",
    body: "Immediate scoring with an evidence band, a competency breakdown and cited actions. Every statement points at something the candidate actually did.",
    href: "/#evidence",
    linkLabel: "See a report",
  },
  {
    title: "The employer workspace",
    body: "Invite candidates by email, track who is in progress, and read reports as they complete. The hiring decision stays with your team.",
    href: "/request-pilot",
    linkLabel: "Run a pilot",
  },
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <p
            className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 560 }}
          >
            Product
          </p>
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#F4F5F7] sm:text-5xl">
            One loop, done well.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[rgba(244,245,247,0.62)]">
            Choose a role. Solve one realistic problem. Submit the work. Review the evidence.
            Everything in Fydell exists to make that loop fast, fair and honest.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {PIECES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <h2 className="text-[16px] font-semibold text-white">{p.title}</h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">{p.body}</p>
                <Link
                  href={p.href}
                  className="mt-4 inline-block text-[13px] font-semibold text-violet-300 transition hover:text-violet-200"
                >
                  {p.linkLabel}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="text-[15px] font-semibold text-white">What we do not claim</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/60">
              Scores are labeled as prototype evidence. We do not show percentiles, we do not make
              hire or reject recommendations, and we do not claim to detect AI use outside the
              product. The evidence is real; the judgment is yours.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
