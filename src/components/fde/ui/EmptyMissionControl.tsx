import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS: [string, string, string][] = [
  ["1", "Define", "Write the real objective, context, and constraints."],
  ["2", "Invite", "Send one FDE a one-time link — no marketplace noise."],
  ["3", "Decide", "Review evidence from how they actually worked, then decide."],
];

/** Beautiful empty state for an org with zero missions. No counters, no fake activity. */
export default function EmptyMissionControl({ orgName }: { orgName: string }) {
  return (
    <section className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-b from-[#0E1118] to-[#0A0C11] px-6 py-16 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,91,255,0.14),transparent_55%)]" />
      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">{orgName}</p>
        <h2
          className="mx-auto mt-3 max-w-[38ch] text-[26px] text-white sm:text-[32px]"
          style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
        >
          Mission control starts with one real mission.
        </h2>
        <p className="mx-auto mt-3 max-w-[50ch] text-[14px] leading-relaxed text-white/55">
          Describe the real work, invite one FDE, then review exactly how they worked. Nothing on
          this page is populated until you create it — no demo data, ever.
        </p>

        <div className="mx-auto mt-9 grid max-w-[600px] gap-3 sm:grid-cols-3">
          {STEPS.map(([n, title, desc]) => (
            <div
              key={n}
              className="rounded-[14px] border border-white/[0.08] bg-white/[0.02] px-4 py-5 text-left"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3B5BFF]/15 text-[11px] font-semibold text-[#B8C4FF] ring-1 ring-inset ring-[#3B5BFF]/40">
                {n}
              </span>
              <p className="mt-3 text-[13.5px] font-semibold text-white">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">{desc}</p>
            </div>
          ))}
        </div>

        <Link
          href="/app/employer/missions/new"
          className="group mt-9 inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-white px-6 text-[15px] font-semibold text-[#08090C] transition-[filter,transform] hover:-translate-y-px hover:brightness-95"
        >
          Create your first mission
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
