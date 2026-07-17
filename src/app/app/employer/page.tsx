import Link from "next/link";

export default function EmployerOverviewPage() {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Overview
      </p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Your missions
      </h1>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/55">
        Post a mission, invite a real FDE, and review evidence from how they actually worked.
        Nothing here is populated until you create it.
      </p>

      <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
        <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
          No missions yet
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
          Draft a mission describing the real problem you need an FDE to solve, then submit it
          for review before inviting anyone.
        </p>
        <Link
          href="/app/employer/missions/new"
          className="mt-6 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Create a mission
        </Link>
      </section>
    </div>
  );
}
