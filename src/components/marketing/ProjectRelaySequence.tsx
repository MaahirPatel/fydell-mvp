"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import FydellMark from "@/components/brand/FydellMark";

type Status = "pending" | "triaged" | "flagged";

interface TicketRow {
  id: string;
  subject: string;
  category: string;
  action: string;
  status: Status;
}

const BASE_ROWS: TicketRow[] = [
  {
    id: "T-4821",
    subject: "Production API is down",
    category: "incident_p0",
    action: "assign_queue",
    status: "triaged",
  },
  {
    id: "T-4822",
    subject: "Please refund this charge",
    category: "billing",
    action: "—",
    status: "pending",
  },
  {
    id: "T-4823",
    subject: "How do I reset my password?",
    category: "general",
    action: "reply_template",
    status: "triaged",
  },
];

const REFUND_FINAL: Pick<TicketRow, "action" | "status"> = {
  action: "abstain",
  status: "flagged",
};

const EVIDENCE_METRICS = [
  { label: "Tickets triaged", value: 3 },
  { label: "Router calls inspected", value: 5 },
  { label: "Unsafe actions blocked", value: 1 },
  { label: "Golden-set cases run", value: 12 },
];

const INITIAL_LOG = [
  { time: "14:02", text: "Routed P0 outage to incident queue" },
  { time: "13:41", text: "Replied to a general password question" },
];

function StatusPill({ status }: { status: Status }) {
  if (status === "pending") {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-white/[0.06] px-2 text-[10.5px] text-[rgba(244,245,247,0.4)]">
        pending
      </span>
    );
  }
  if (status === "flagged") {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-full border border-[rgba(242,107,130,0.28)] bg-[rgba(242,107,130,0.10)] px-2 text-[10.5px] text-[#F26B82]">
        needs approval
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-[rgba(103,217,160,0.22)] bg-[rgba(103,217,160,0.10)] px-2 text-[10.5px] text-[#8EE4B8]">
      triaged
    </span>
  );
}

function TicketPanel({ rows }: { rows: TicketRow[] }) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
        <p
          className="text-[10.5px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
          style={{ fontWeight: 500 }}
        >
          Ticket Router
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className="grid h-[42px] items-center border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
          style={{
            gridTemplateColumns: "0.7fr 1.6fr 0.9fr 0.95fr 0.85fr",
            fontWeight: 500,
            paddingInline: 16,
          }}
        >
          <span>Ticket</span>
          <span>Subject</span>
          <span>Category</span>
          <span>Action</span>
          <span>Status</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.id}
            className={[
              "grid h-[52px] items-center border-b border-white/[0.035] text-[12px] transition-[background-color,color] duration-300",
              row.status === "flagged" ? "bg-[rgba(242,107,130,0.045)]" : "",
            ].join(" ")}
            style={{
              gridTemplateColumns: "0.7fr 1.6fr 0.9fr 0.95fr 0.85fr",
              paddingInline: 16,
            }}
          >
            <span className="tabular-nums text-[rgba(244,245,247,0.4)]">{row.id}</span>
            <span className="truncate text-[12.5px] text-[#F4F5F7]" style={{ fontWeight: 550 }}>
              {row.subject}
            </span>
            <span className="text-[11.5px] text-[rgba(244,245,247,0.62)]">{row.category}</span>
            <span className="tabular-nums text-[#5662FF]" style={{ fontWeight: 600 }}>
              {row.action}
            </span>
            <StatusPill status={row.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectRelaySequence({
  showToast = true,
}: {
  showToast?: boolean;
}) {
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<TicketRow[]>(() =>
    reduce
      ? BASE_ROWS.map((r) => (r.id === "T-4822" ? { ...r, ...REFUND_FINAL } : r))
      : BASE_ROWS
  );
  const [log, setLog] = useState(() =>
    reduce
      ? [{ time: "13:55", text: "Flagged a refund for human approval" }, ...INITIAL_LOG]
      : INITIAL_LOG
  );
  const [toastVisible, setToastVisible] = useState(Boolean(reduce && showToast));

  useEffect(() => {
    if (reduce) return;

    const t1 = window.setTimeout(() => {
      setRows((prev) =>
        prev.map((r) => (r.id === "T-4822" ? { ...r, ...REFUND_FINAL } : r))
      );
    }, 1200);

    const t2 = window.setTimeout(() => {
      setLog((prev) => [{ time: "13:55", text: "Flagged a refund for human approval" }, ...prev]);
    }, 1800);

    const t3 = window.setTimeout(() => {
      if (showToast) setToastVisible(true);
    }, 2600);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reduce, showToast]);

  return (
    <div
      className="fydell-product-frame relative w-full overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[#090B10] shadow-[0_28px_90px_rgba(0,0,0,0.46)]"
      style={{
        fontFamily: "var(--font-geist-sans), var(--font-inter), system-ui, sans-serif",
        minHeight: 620,
        borderRadius: 15,
        boxShadow: "0 28px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.025)",
      }}
      aria-hidden
    >
      <div className="relative z-[1] flex h-[51px] items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[#0A0D14] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <FydellMark width={19} />
          <p className="truncate text-[12.5px] text-[#F4F5F7]" style={{ fontWeight: 580 }}>
            Project Relay
          </p>
          <span className="hidden text-[rgba(244,245,247,0.28)] sm:inline" aria-hidden>
            ·
          </span>
          <span className="hidden text-[12px] text-[rgba(244,245,247,0.4)] sm:inline">
            AI Operations Deployment
          </span>
          <span
            className="ml-1 inline-flex h-6 items-center gap-1.5 rounded-full border border-[rgba(103,217,160,0.22)] bg-[rgba(103,217,160,0.10)] px-2.5 text-[11px] text-[#8EE4B8]"
            style={{ fontWeight: 550 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#67D9A0]" />
            Session Active
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-[10px] text-[rgba(244,245,247,0.4)]">Time remaining</p>
            <p className="text-[12px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 560 }}>
              41:37
            </p>
          </div>
          <span
            className="inline-flex h-[34px] items-center rounded-[8px] bg-[#5662FF] px-[13px] text-[12px] text-white"
            style={{ fontWeight: 560 }}
          >
            Submit Work
          </span>
        </div>
      </div>

      <div className="relative z-[1] grid min-h-[568px] grid-cols-[152px_minmax(0,1fr)_222px]">
        <div className="flex flex-col border-r border-[var(--border-subtle)] bg-[#080A0F] py-2">
          {["Repo", "router.py", "service.py", "Tests", "Preview"].map((label, i) => (
            <div
              key={label}
              className={[
                "relative mx-2 mb-0.5 flex h-[39px] cursor-default items-center rounded-[7px] px-3.5 text-[12px] transition-colors duration-150",
                i === 1
                  ? "bg-[rgba(86,98,255,0.12)] text-[#F4F5F7]"
                  : "text-[rgba(244,245,247,0.4)]",
              ].join(" ")}
              style={{ fontWeight: i === 1 ? 550 : 450 }}
            >
              {i === 1 && (
                <span
                  className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full bg-[#5662FF]"
                  aria-hidden
                />
              )}
              {label}
            </div>
          ))}
          <div className="mt-auto border-t border-[var(--border-subtle)] px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[rgba(244,245,247,0.4)]">Session progress</span>
              <span className="text-[11.5px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                44%
              </span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full"
                style={{
                  width: "44%",
                  background: "linear-gradient(90deg, #5662FF, #8657F4)",
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative min-w-[650px] overflow-hidden border-r border-[var(--border-subtle)] bg-[#0B0F16] lg:min-w-0">
          <TicketPanel rows={rows} />

          {toastVisible && (
            <div
              className="absolute bottom-4 left-4 z-[3] w-[268px] rounded-[10px] border border-[rgba(134,87,244,0.24)] bg-[#11151D] px-3.5 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
              style={{
                animation: reduce ? undefined : "fydell-toast-in 280ms var(--ease) both",
              }}
            >
              <p className="text-[12px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                Policy check
              </p>
              <p className="mt-1 text-[12px] leading-[1.45] text-[rgba(244,245,247,0.62)]">
                Refunds require human approval. The candidate&apos;s router correctly abstained.
              </p>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col bg-[#080A0F]">
          <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
            <p
              className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
              style={{ fontWeight: 500 }}
            >
              Evidence Captured
            </p>
          </div>
          <div className="flex-1 space-y-2.5 px-4 py-3.5">
            {EVIDENCE_METRICS.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-[rgba(244,245,247,0.62)]">{item.label}</span>
                <span
                  className="text-[11.5px] tabular-nums text-[#F4F5F7]"
                  style={{ fontWeight: 550 }}
                >
                  {item.value}
                </span>
              </div>
            ))}
            <div className="pt-3">
              <p
                className="mb-2.5 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                style={{ fontWeight: 500 }}
              >
                Recent evidence
              </p>
              <div className="space-y-2.5">
                {log.map((row) => (
                  <div
                    key={`${row.time}-${row.text}`}
                    className="flex gap-2.5"
                    style={{
                      animation: reduce ? undefined : "fydell-toast-in 260ms var(--ease) both",
                    }}
                  >
                    <span className="w-9 shrink-0 text-[10px] tabular-nums text-[rgba(244,245,247,0.4)]">
                      {row.time}
                    </span>
                    <span className="text-[11px] leading-[1.4] text-[rgba(244,245,247,0.62)]">
                      {row.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
