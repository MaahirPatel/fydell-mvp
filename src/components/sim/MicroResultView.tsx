/**
 * Renders a scored five-minute simulation result. Used by the candidate
 * result page, the public shared-result page and the employer report.
 *
 * variant="dark" matches the marketing shell (Linear-like). variant="light"
 * remains for light app surfaces until those shells are unified.
 */
import type { MicroComponentKey, MicroResult } from "@/lib/simulations/micro-scoring";

const ROLE_TITLES: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "Business Intelligence Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

const COMPONENT_ORDER: MicroComponentKey[] = ["O", "E", "R", "C", "V", "J"];

type Variant = "dark" | "light";

const THEME = {
  dark: {
    card: "rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6",
    eyebrow: "text-[13px] font-medium text-[var(--text-secondary)]",
    title: "text-xl font-semibold text-[var(--text-primary)]",
    muted: "text-[15px] text-[var(--text-tertiary)]",
    body: "text-[15px] leading-relaxed text-[var(--text-secondary)]",
    heading: "text-[15px] font-semibold text-[var(--text-primary)]",
    score: "text-3xl font-bold tabular-nums text-[var(--text-primary)]",
    scoreDenom: "text-base font-medium text-[var(--text-tertiary)]",
    markOk: "mt-0.5 text-[var(--status-positive-ink)]",
    markReview: "mt-0.5 text-[var(--status-attention-ink)]",
    track: "h-2 flex-1 overflow-hidden rounded-full bg-[var(--viz-track)]",
    barStrong: "bg-[var(--viz-done)]",
    barMid: "bg-[var(--viz-active)]",
    barLow: "bg-[var(--viz-idle)]",
    label: "w-56 shrink-0 text-[14px] text-[var(--text-secondary)]",
    meta: "w-16 shrink-0 text-right text-[13px] tabular-nums text-[var(--text-tertiary)]",
    bandMeta: "w-32 shrink-0 text-right text-[12px] text-[var(--text-tertiary)]",
    tableHead: "border-b border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-secondary)]",
    tableRow: "border-b border-[var(--border-subtle)]",
    tableCell: "font-medium text-[var(--text-primary)]",
    tableMuted: "text-[var(--text-secondary)]",
    formula: "mt-4 space-y-2 rounded-[var(--radius-control)] bg-[var(--surface-band)] p-4 font-mono text-[13.5px] text-[var(--text-primary)]",
    inset: "mt-2.5 whitespace-pre-line rounded-[var(--radius-control)] bg-[var(--surface-band)] p-4 text-[15px] leading-relaxed text-[var(--text-secondary)]",
    disclaimer: "px-1 text-[13px] leading-relaxed text-[var(--text-tertiary)]",
    band: {
      strong: "border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)]",
      established: "border border-[var(--status-neutral-line)] bg-[var(--status-neutral-bg)] text-[var(--text-primary)]",
      developing: "border border-[var(--status-attention-line)] bg-[var(--status-attention-bg)] text-[var(--status-attention-ink)]",
      limited: "border border-[var(--border-default)] bg-[var(--surface-band)] text-[var(--text-secondary)]",
      insufficient: "border border-[var(--border-default)] bg-[var(--surface-band)] text-[var(--text-tertiary)]",
    } as Record<string, string>,
  },
  light: null,
};

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "n/a";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const fmt2 = (n: number) => n.toFixed(2);

export function MicroResultView({
  result,
  variant = "dark",
}: {
  result: MicroResult;
  variant?: Variant;
}) {
  const t = THEME[variant] ?? THEME.dark;
  const roleTitle = ROLE_TITLES[result.roleKey] || result.roleKey;
  const analysis = result.analysis;
  const explanation =
    analysis?.explanation ??
    result.sections
      .filter((s) => s.kind === "text" && s.candidateAnswer)
      .map((s) => s.candidateAnswer)
      .join("\n\n");

  const applicable = analysis
    ? COMPONENT_ORDER.map((k) => analysis.components[k]).filter((c) => c && c.applicable)
    : [];
  const rawFormula = applicable.length
    ? `Raw = 100 x (${applicable
        .map((c) => `${fmt2(c.usedWeight)} x ${fmt2(c.value)}`)
        .join(" + ")}) = ${analysis!.raw}`
    : "";
  const adjustedFormula = analysis
    ? `Adjusted = 50 + ${fmt2(analysis.coverage)} x (${analysis.raw} - 50) = ${analysis.adjusted}`
    : "";
  const reweighted = analysis
    ? COMPONENT_ORDER.some((k) => !analysis.components[k].applicable)
    : false;

  return (
    <div className="space-y-3" data-result-variant={variant}>
      <div className={t.card}>
        <p className={t.eyebrow}>Evaluation completed</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className={t.title}>{result.simulationTitle}</h1>
            <p className={t.muted}>
              {roleTitle} · Completed in {fmtDuration(result.completionSeconds)}
            </p>
          </div>
          <div className="text-right">
            <p className={t.score}>
              {result.total}
              <span className={t.scoreDenom}> / 100</span>
            </p>
            <span
              className={`mt-1 inline-block rounded-md px-2.5 py-1 text-[12px] font-semibold ${t.band[result.band] || t.band.limited}`}
            >
              {result.bandLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className={t.card}>
          <h2 className={t.heading}>What was correct</h2>
          {result.strengths.length ? (
            <ul className="mt-2.5 space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className={`flex gap-2 ${t.body}`}>
                  <span aria-hidden className={t.markOk}>
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-2.5 ${t.muted}`}>
              This attempt did not produce standout evidence. The breakdown below shows where the
              score came from.
            </p>
          )}
        </div>
        <div className={t.card}>
          <h2 className={t.heading}>What needs review</h2>
          {result.improvements.length ? (
            <ul className="mt-2.5 space-y-2">
              {result.improvements.map((s, i) => (
                <li key={i} className={`flex gap-2 ${t.body}`}>
                  <span aria-hidden className={t.markReview}>
                    →
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-2.5 ${t.muted}`}>Nothing significant. A clean attempt.</p>
          )}
        </div>
      </div>

      <div className={t.card}>
        <h2 className={t.heading}>Competency breakdown</h2>
        <div className="mt-3 space-y-2.5">
          {result.competencies.map((c) => {
            const pct = c.available ? Math.round((c.earned / c.available) * 100) : 0;
            return (
              <div key={c.key} className="flex items-center gap-3">
                <span className={t.label}>{c.label}</span>
                <div className={t.track}>
                  <div
                    className={`h-full rounded-full ${pct >= 85 ? t.barStrong : pct >= 50 ? t.barMid : t.barLow}`}
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                </div>
                <span className={t.meta}>{pct} / 100</span>
                <span className={t.bandMeta}>{c.bandLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {analysis && (
        <div className={t.card}>
          <h2 className={t.heading}>How this score is calculated</h2>
          <p className={`mt-1 ${t.muted}`}>
            Every number below is computed from the submission with fixed rules. No AI model scores
            this work.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className={t.tableHead}>
                  <th className="py-2 pr-3 font-semibold">Component</th>
                  <th className="py-2 pr-3 font-semibold">Weight</th>
                  <th className="py-2 pr-3 font-semibold">Value</th>
                  <th className="py-2 font-semibold">What earned it</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ORDER.map((k) => {
                  const c = analysis.components[k];
                  if (!c) return null;
                  return (
                    <tr
                      key={k}
                      className={`${t.tableRow} ${c.applicable ? "" : "opacity-50"}`}
                    >
                      <td className={`py-2 pr-3 ${t.tableCell}`}>
                        {c.label} <span className="opacity-50">({k})</span>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {c.applicable ? fmt2(c.usedWeight) : "0.00"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {c.applicable ? fmt2(c.value) : "n/a"}
                      </td>
                      <td className={`py-2 ${t.tableMuted}`}>{c.detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {reweighted && (
            <p className={`mt-2 ${t.muted}`}>
              A component marked n/a has no question in this evaluation. Its weight is redistributed
              across the others.
            </p>
          )}

          <div className={t.formula}>
            <p>{rawFormula}</p>
            <p>
              Coverage = {fmt2(analysis.coverage)}{" "}
              <span className="font-sans opacity-60">
                (
                {analysis.coverageSignals
                  .filter((s) => s.applicable)
                  .map(
                    (s) =>
                      `${s.label.toLowerCase()}: ${fmt2(s.completed * s.weight)} of ${fmt2(s.weight)}`
                  )
                  .join(", ")}
                )
              </span>
            </p>
            <p>{adjustedFormula}</p>
          </div>

          <p className={`mt-3 ${t.muted}`}>
            Bands on the adjusted score: 85 to 100 Strong evidence, 70 to 84 Established evidence, 50
            to 69 Developing evidence, below 50 Limited evidence. When coverage is below 0.45 the
            result reads Insufficient evidence regardless of the score.
          </p>
        </div>
      )}

      {analysis && analysis.trail.length > 0 && (
        <div className={t.card}>
          <h2 className={t.heading}>Evidence trail</h2>
          <ol className="mt-3 space-y-2">
            {analysis.trail.map((item, i) => (
              <li key={i} className={`flex gap-3 ${t.body}`}>
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"
                />
                <span>
                  <span className={t.tableCell}>{item.label}</span>
                  <span className="opacity-60"> · {item.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {explanation && (
        <div className={t.card}>
          <h2 className={t.heading}>Candidate response</h2>
          <p className={t.inset}>{explanation}</p>
        </div>
      )}

      {analysis?.aiDisclosure && (
        <div className={t.card}>
          <h2 className={t.heading}>External AI disclosure</h2>
          <p className={`mt-2 ${t.body}`}>
            {analysis.aiDisclosure.used
              ? "The candidate disclosed using external AI tools during this attempt."
              : "The candidate reported no external AI use during this attempt."}
            {analysis.aiDisclosure.note ? ` Note: "${analysis.aiDisclosure.note}"` : ""}
          </p>
          <p className={`mt-1 ${t.disclaimer}`}>This disclosure does not affect the score.</p>
        </div>
      )}

      <p className={t.disclaimer}>
        Prototype evidence score. Not yet validated as a predictor of job performance.
      </p>
    </div>
  );
}
