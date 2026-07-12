export default function OutcomesPage() {
  return (
    <div>
      <h1 className="text-[28px] text-white" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Outcomes
      </h1>
      <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-white/55">
        Outcome calibration is early-stage. After a hiring decision, Fydell will track 30- and
        90-day check-ins against the role&apos;s first-90-day outcomes. No predictive validity is
        claimed.
      </p>
      <div className="mt-8 rounded-[14px] border border-dashed border-white/12 px-4 py-10 text-center text-[13px] text-white/55">
        No outcome records yet.
      </div>
    </div>
  );
}
