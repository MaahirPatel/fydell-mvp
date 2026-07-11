"use client";

import FydellMark from "@/components/brand/FydellMark";

const FILES = [
  { name: "Management Deck", ext: "PDF", state: "Reviewed" },
  { name: "Forecast Export", ext: "XLSX", state: "Open" },
  { name: "Customer Renewal Note", ext: "PDF", state: "Flagged", highlight: true },
  { name: "Hiring Plan", ext: "XLSX", state: "Reviewed" },
];

const UPDATE = {
  title: "Manager update",
  body: "Renewal risk increased for the SMB segment. Revisit churn and runway before submitting.",
};

export default function WorkroomDetailMock() {
  return (
    <div
      className="overflow-hidden bg-[#090C12]"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
      aria-hidden
    >
      <div className="flex h-[48px] items-center justify-between border-b border-[var(--border-subtle)] px-4">
        <div className="flex items-center gap-2.5">
          <FydellMark width={18} />
          <div>
            <p className="text-[13px] text-[var(--text-primary)]" style={{ fontWeight: 580 }}>
              Data Room
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">Project Meridian</p>
          </div>
        </div>
        <span className="text-[11px] text-[var(--text-tertiary)]">4 sources · 1 flagged</span>
      </div>

      <div className="grid min-h-[360px] grid-cols-[1fr_0.92fr]">
        <div className="border-r border-[var(--border-subtle)] p-3">
          <p
            className="mb-2 px-1 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
            style={{ fontWeight: 550 }}
          >
            Source materials
          </p>
          <div className="space-y-1">
            {FILES.map((f) => (
              <div
                key={f.name}
                className={[
                  "flex items-center justify-between rounded-[8px] px-3 py-2.5",
                  f.highlight
                    ? "border border-[rgba(242,107,130,0.22)] bg-[rgba(242,107,130,0.06)]"
                    : "border border-transparent bg-white/[0.02]",
                ].join(" ")}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={[
                      "rounded px-1.5 py-0.5 text-[9px]",
                      f.ext === "XLSX"
                        ? "bg-[rgba(103,217,160,0.14)] text-[#8EE4B8]"
                        : "bg-white/[0.06] text-[var(--text-tertiary)]",
                    ].join(" ")}
                    style={{ fontWeight: 600 }}
                  >
                    {f.ext}
                  </span>
                  <span
                    className={
                      f.highlight ? "text-[13px] text-[#F7B0BC]" : "text-[13px] text-[var(--text-primary)]"
                    }
                    style={{ fontWeight: 520 }}
                  >
                    {f.name}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)]">{f.state}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col p-4">
          <p
            className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
            style={{ fontWeight: 550 }}
          >
            Manager Update
          </p>
          <div className="mt-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-1)] px-3.5 py-3.5">
            <p className="text-[13px] text-[var(--text-primary)]" style={{ fontWeight: 580 }}>
              {UPDATE.title}
            </p>
            <p className="mt-2 text-[13px] leading-[1.55] text-[var(--text-secondary)]">{UPDATE.body}</p>
          </div>
          <div className="mt-4 flex-1 rounded-[10px] border border-dashed border-[var(--border-default)] bg-white/[0.015] px-3.5 py-3">
            <p
              className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
              style={{ fontWeight: 550 }}
            >
              Write Memo
            </p>
            <p className="mt-3 text-[13px] leading-[1.55] text-[var(--text-tertiary)] italic">
              Draft recommendation with sources…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
