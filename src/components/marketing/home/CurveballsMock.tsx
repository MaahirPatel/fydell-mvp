import FydellMark from "@/components/brand/FydellMark";

const BEHAVIORS = [
  "Re-read the customer brief",
  "Adjusted the refund threshold",
  "Added a regression test",
  "Told the customer what changed",
];

export default function CurveballsMock() {
  return (
    <div
      className="overflow-hidden bg-[#090B10]"
      style={{ fontFamily: "var(--font-geist-sans), var(--font-inter), system-ui, sans-serif" }}
      aria-hidden
    >
      <div className="flex h-[50px] items-center justify-between border-b border-[var(--border-subtle)] px-4">
        <div className="flex items-center gap-2.5">
          <FydellMark width={18} />
          <p className="text-[12.5px] text-[#F4F5F7]" style={{ fontWeight: 580 }}>
            Project Relay
          </p>
          <span className="text-[12px] text-[rgba(244,245,247,0.4)]">· Mid-session curveball</span>
        </div>
        <span className="text-[11px] tabular-nums text-[rgba(244,245,247,0.4)]">10:00 remaining</span>
      </div>

      <div className="grid min-h-[400px] grid-cols-[1.15fr_0.95fr_0.9fr]">
        {/* Live change + response */}
        <div className="border-r border-[var(--border-subtle)] bg-[#0B0F16] p-4">
          <div className="rounded-[10px] border border-[rgba(134,87,244,0.28)] bg-[rgba(134,87,244,0.08)] px-4 py-3.5">
            <p className="text-[11px] text-[#C4A8FF]" style={{ fontWeight: 560 }}>
              Mid-session curveball
            </p>
            <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(244,245,247,0.78)]">
              Policy just changed: refunds above $200 now require manager approval. The customer
              needs a fix before their next request lands.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[8px] border border-[var(--border-subtle)] px-3 py-3">
              <p className="text-[10px] text-[rgba(244,245,247,0.4)]">Prior behavior</p>
              <p className="mt-1 text-[13px] text-[rgba(244,245,247,0.62)]">Auto-approve refunds</p>
            </div>
            <div className="rounded-[8px] border border-[rgba(242,107,130,0.24)] bg-[rgba(242,107,130,0.06)] px-3 py-3">
              <p className="text-[10px] text-[rgba(244,245,247,0.4)]">New constraint</p>
              <p className="mt-1 text-[13px] text-[#F7B0BC]">Requires human approval &gt; $200</p>
            </div>
          </div>

          <div className="mt-4 rounded-[8px] border border-[var(--border-subtle)] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]">
              FDE response
            </p>
            <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(244,245,247,0.72)]">
              Added the approval gate, wrote a regression test for the new threshold, and told the
              customer in chat before shipping.
            </p>
          </div>
        </div>

        {/* Revision history */}
        <div className="border-r border-[var(--border-subtle)] bg-[#080A0F] p-4">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Revision history
          </p>
          <ol className="mt-3 space-y-0">
            {[
              { t: "09:12", label: "Curveball revealed" },
              { t: "09:28", label: "Approval gate added to service.py" },
              { t: "09:41", label: "Regression test passing" },
            ].map((step, i, arr) => (
              <li key={step.t} className="flex gap-3">
                <div className="flex w-4 flex-col items-center">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#5662FF]" />
                  {i < arr.length - 1 && (
                    <span className="mt-1 h-8 w-px bg-[var(--border-default)]" aria-hidden />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-[10px] tabular-nums text-[rgba(244,245,247,0.4)]">{step.t}</p>
                  <p className="mt-0.5 text-[12px] text-[rgba(244,245,247,0.72)]">{step.label}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Observed behavior */}
        <div className="bg-[#080A0F] p-4">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Observed behavior
          </p>
          <ul className="mt-3 space-y-2.5">
            {BEHAVIORS.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2.5 border-b border-white/[0.04] py-2.5 text-[12px] text-[rgba(244,245,247,0.72)]"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#5662FF]" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-[1.5] text-[rgba(244,245,247,0.4)]">
            Behavior observed in session — not a personality label.
          </p>
        </div>
      </div>
    </div>
  );
}
