import FydellMark from "@/components/brand/FydellMark";

const FILES = [
  { name: "router.py", ext: "PY", state: "Reviewed" },
  { name: "service.py", ext: "PY", state: "Flagged", highlight: true },
  { name: "test_router.py", ext: "PY", state: "Reviewed" },
  { name: "policy.json", ext: "JSON", state: "Unread" },
  { name: "customer_brief.md", ext: "MD", state: "Referenced" },
  { name: "evals.py", ext: "PY", state: "Reviewed" },
];

export default function WorkroomDetailMock() {
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
          <span className="text-[12px] text-[rgba(244,245,247,0.4)]">· Repo</span>
        </div>
        <span className="text-[11px] text-[rgba(244,245,247,0.4)]">6 files · 1 flagged</span>
      </div>

      <div className="grid min-h-[400px] grid-cols-[0.85fr_1.2fr_0.95fr]">
        {/* Repo */}
        <div className="border-r border-[var(--border-subtle)] bg-[#080A0F] p-3">
          <p
            className="mb-2 px-1 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Repo
          </p>
          <div className="space-y-1">
            {FILES.map((f) => (
              <div
                key={f.name}
                className={[
                  "flex items-center justify-between rounded-[7px] px-2.5 py-2",
                  f.highlight
                    ? "border border-[rgba(242,107,130,0.22)] bg-[rgba(242,107,130,0.06)]"
                    : "border border-transparent bg-white/[0.015]",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={[
                      "shrink-0 rounded px-1.5 py-0.5 text-[9px]",
                      f.ext === "PY"
                        ? "bg-[rgba(103,217,160,0.14)] text-[#8EE4B8]"
                        : "bg-white/[0.06] text-[rgba(244,245,247,0.4)]",
                    ].join(" ")}
                    style={{ fontWeight: 560 }}
                  >
                    {f.ext}
                  </span>
                  <span
                    className={`truncate text-[12px] ${
                      f.highlight ? "text-[#F7B0BC]" : "text-[rgba(244,245,247,0.72)]"
                    }`}
                  >
                    {f.name}
                  </span>
                </div>
                <span className="ml-2 shrink-0 text-[10px] text-[rgba(244,245,247,0.4)]">
                  {f.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal + editor */}
        <div className="border-r border-[var(--border-subtle)] bg-[#0B0F16] p-4">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Selected file
          </p>
          <p className="mt-2 text-[14px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
            service.py
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[8px] border border-[var(--border-subtle)] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[10px] text-[rgba(244,245,247,0.4)]">Last test run</p>
              <p className="mt-1 text-[15px] tabular-nums text-[rgba(244,245,247,0.62)]">exit 1</p>
            </div>
            <div className="rounded-[8px] border border-[rgba(86,98,255,0.28)] bg-[rgba(86,98,255,0.08)] px-3 py-2.5">
              <p className="text-[10px] text-[rgba(244,245,247,0.4)]">Current run</p>
              <p className="mt-1 text-[15px] tabular-nums text-[#5662FF]" style={{ fontWeight: 600 }}>
                exit 0
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-[8px] border border-[var(--border-subtle)] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]">
              Referenced file
            </p>
            <p className="mt-1.5 text-[12px] text-[rgba(244,245,247,0.72)]">
              customer_brief.md · refund policy, lines 4–6
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]">
              FDE note
            </p>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-[rgba(244,245,247,0.62)]">
              Refund routing was silently failing above the new threshold. Fixed and added a
              regression test before touching anything else.
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[8px] border border-[var(--border-subtle)] px-3 py-2.5">
            <span className="text-[11px] text-[rgba(244,245,247,0.4)]">Test coverage</span>
            <span className="text-[12px] tabular-nums text-[#8EE4B8]" style={{ fontWeight: 550 }}>
              +1 regression test
            </span>
          </div>
        </div>

        {/* Change log */}
        <div className="bg-[#080A0F] p-4">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Change log
          </p>
          <div className="mt-3 space-y-2">
            {[
              { label: "router.py", value: "edited", state: "Reviewed" },
              { label: "service.py", value: "edited", state: "Active" },
              { label: "test_router.py", value: "passing", state: "Revised" },
              { label: "evals.py", value: "run", state: "Pending" },
            ].map((a) => (
              <div
                key={a.label}
                className="flex items-center justify-between border-b border-white/[0.04] py-2.5"
              >
                <div>
                  <p className="text-[12px] text-[rgba(244,245,247,0.72)]">{a.label}</p>
                  <p className="mt-0.5 text-[10px] text-[rgba(244,245,247,0.4)]">{a.state}</p>
                </div>
                <span className="text-[12px] tabular-nums text-[#5662FF]" style={{ fontWeight: 560 }}>
                  {a.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
