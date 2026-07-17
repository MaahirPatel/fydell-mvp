export default function HomeReportMock() {
  return (
    <div
      className="overflow-hidden bg-[#090B10]"
      style={{ fontFamily: "var(--font-geist-sans), var(--font-inter), system-ui, sans-serif" }}
      aria-hidden
    >
      <div className="grid min-h-[440px] grid-cols-[0.85fr_1.25fr_0.95fr]">
        {/* Summary */}
        <div className="border-r border-[var(--border-subtle)] bg-[#080A0F] p-5">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Hiring evidence
          </p>
          <div className="mt-5 space-y-4">
            {[
              { label: "Recommendation", value: "Advance", accent: true },
              { label: "Confidence", value: "Medium-high" },
              { label: "Role", value: "Forward Deployed Engineer" },
              { label: "Simulation", value: "Project Relay" },
            ].map((row) => (
              <div key={row.label} className="border-b border-white/[0.04] pb-3">
                <p className="text-[11px] text-[rgba(244,245,247,0.4)]">{row.label}</p>
                <p
                  className={`mt-1 text-[14px] ${
                    row.accent ? "text-[#67D9A0]" : "text-[#F4F5F7]"
                  }`}
                  style={{ fontWeight: 560 }}
                >
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Central evidence */}
        <div className="border-r border-[var(--border-subtle)] bg-[#0B0F16] p-5">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Observed strengths
          </p>
          <ol className="mt-3 space-y-2.5">
            {[
              "Re-ran tests after every meaningful edit",
              "Adapted the approach after the mid-session curveball",
              "Told the customer what changed and why",
              "Reviewed AI-suggested code before shipping it",
            ].map((s, i) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-[1.45] text-[rgba(244,245,247,0.72)]">
                <span className="w-4 shrink-0 tabular-nums text-[rgba(244,245,247,0.4)]">
                  {i + 1}.
                </span>
                {s}
              </li>
            ))}
          </ol>

          <p
            className="mt-6 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Needs review
          </p>
          <ol className="mt-3 space-y-2.5">
            {[
              "Ran the preview command only once before submitting",
              "Did not run the eval suite without being prompted",
            ].map((s, i) => (
              <li key={s} className="flex gap-2.5 text-[13px] leading-[1.45] text-[rgba(244,245,247,0.62)]">
                <span className="w-4 shrink-0 tabular-nums text-[rgba(244,245,247,0.4)]">
                  {i + 1}.
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        {/* Trace + questions */}
        <div className="bg-[#080A0F] p-5">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Evidence trace
          </p>
          <ol className="mt-3 space-y-0">
            {[
              "Mid-session curveball revealed",
              "Approach revised after the change",
              "Final submission frozen",
            ].map((m, i, arr) => (
              <li key={m} className="flex gap-3">
                <div className="flex w-4 flex-col items-center">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#5662FF]" />
                  {i < arr.length - 1 && (
                    <span className="mt-1 h-7 w-px bg-[var(--border-default)]" aria-hidden />
                  )}
                </div>
                <div className="pb-3">
                  <p className="text-[10px] text-[rgba(244,245,247,0.4)]">
                    Critical moment 0{i + 1}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[rgba(244,245,247,0.72)]">{m}</p>
                </div>
              </li>
            ))}
          </ol>

          <p
            className="mt-4 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Interview questions
          </p>
          <ul className="mt-3 space-y-3">
            {[
              "What additional evidence would make you reverse your recommendation?",
              "How would you have handled the curveball with half the time left?",
            ].map((q) => (
              <li
                key={q}
                className="rounded-[8px] border border-[var(--border-subtle)] bg-white/[0.02] px-3 py-2.5 text-[12px] leading-[1.45] text-[rgba(244,245,247,0.72)]"
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
