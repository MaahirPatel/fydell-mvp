import { BASIS_LABEL, COVERAGE_LABEL, type Coverage, type EvidenceBasis } from "@/lib/passport/capability/types";

/**
 * Coverage: solid indigo for support, soft indigo for partial, neutral with a
 * hollow mark for a gap, solid red only for a contradiction. Green is kept for
 * checks that ran and passed.
 */
const COVERAGE_STYLE: Record<Coverage, { ink: string; bg: string; mark: "solid" | "half" | "hollow" | "cross" | "dash"; border?: string }> = {
  supports: { ink: "#ffffff", bg: "var(--accent)", mark: "solid" },
  partially_supports: { ink: "var(--accent-ink)", bg: "var(--accent-soft)", mark: "half", border: "var(--accent-line)" },
  insufficient_evidence: { ink: "var(--text-secondary)", bg: "var(--badge-neutral-bg)", mark: "hollow" },
  contradicted: { ink: "#ffffff", bg: "var(--badge-failed-ink)", mark: "cross" },
  not_assessed: { ink: "var(--text-tertiary)", bg: "transparent", mark: "dash", border: "var(--border-strong)" },
};

function CoverageMark({ mark }: { mark: (typeof COVERAGE_STYLE)[Coverage]["mark"] }) {
  const common = "inline-block h-2 w-2 shrink-0 rounded-full";
  if (mark === "solid") return <span aria-hidden className={`${common} bg-current`} />;
  if (mark === "half") return <span aria-hidden className={`${common} border border-current`} style={{ background: "linear-gradient(90deg, currentColor 50%, transparent 50%)" }} />;
  if (mark === "hollow") return <span aria-hidden className={`${common} border-[1.5px] border-current`} />;
  if (mark === "cross") return <span aria-hidden className="text-[11px] font-bold leading-none">×</span>;
  return <span aria-hidden className="inline-block h-[1.5px] w-2 bg-current" />;
}

export function CoverageTag({ coverage }: { coverage: Coverage }) {
  const s = COVERAGE_STYLE[coverage];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-app-meta font-semibold ${s.border ? `border ${coverage === "not_assessed" ? "border-dashed" : ""}` : ""}`}
      style={{ color: s.ink, background: s.bg, borderColor: s.border }}
    >
      <CoverageMark mark={s.mark} />
      {COVERAGE_LABEL[coverage]}
    </span>
  );
}

/** One colour per way evidence was obtained. Kept apart from coverage, which says what the evidence means. */
export const BASIS_STYLE: Record<EvidenceBasis, { ink: string; bg: string }> = {
  inspected_code: { ink: "var(--accent-ink)", bg: "var(--accent-soft)" },
  executed_test: { ink: "var(--ink-sky)", bg: "var(--field-sky)" },
  task_demonstration: { ink: "var(--ink-violet)", bg: "var(--surface-intelligence)" },
  engineer_statement: { ink: "var(--ink-warm)", bg: "var(--field-warm)" },
  reviewer_judgment: { ink: "var(--ink-coral)", bg: "var(--field-coral)" },
};

export function BasisChip({ basis }: { basis: EvidenceBasis }) {
  const s = BASIS_STYLE[basis];
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-[6px] px-2 py-0.5 text-app-meta font-semibold"
      style={{ color: s.ink, background: s.bg, boxShadow: "inset 0 0 0 1px color-mix(in oklab, currentColor 28%, transparent)" }}
    >
      {BASIS_LABEL[basis]}
    </span>
  );
}

export function BasisLegend({ bases = Object.keys(BASIS_STYLE) as EvidenceBasis[] }: { bases?: EvidenceBasis[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {bases.map((b) => (
        <BasisChip key={b} basis={b} />
      ))}
    </div>
  );
}
