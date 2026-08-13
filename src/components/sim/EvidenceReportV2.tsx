/**
 * The candidate's own view of a scored attempt, and the same view an
 * authorized share renders.
 *
 * Rewritten onto the design tokens: it was five white cards with violet
 * progress bars sitting on the graphite canvas, which is the exact defect the
 * brief calls a light slab. Colour now carries meaning rather than decoration,
 * so the bars are one blue and band strength is said in words.
 */
import type { V2PersistedResult } from "@/lib/simulations/v2/scoring";
import { Surface } from "@/components/ui/Surface";
import { StatusTag } from "@/components/ui/StatusTag";

const ROLE_TITLES: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "Business Intelligence Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "an unrecorded time";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function Metric({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div>
      <dt className="text-[12px] text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-0.5 text-[19px] font-medium tabular-nums text-[var(--text-primary)]">
        {value}
      </dd>
      <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--text-tertiary)]">
        {help}
      </p>
    </div>
  );
}

function SectionHead({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)] px-5 py-3.5">
      <h2 className="text-[14px] font-medium text-[var(--text-primary)]">{title}</h2>
      {description ? (
        <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function EvidenceReportV2({ result }: { result: V2PersistedResult }) {
  const roleTitle = ROLE_TITLES[result.roleKey] || result.roleKey;

  return (
    <div className="space-y-4">
      <Surface tone="panel">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              Evaluation completed
            </p>
            <h1 className="mt-1 text-[19px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
              {result.simulationTitle}
            </h1>
            <p className="mt-1 text-[13.5px] text-[var(--text-secondary)]">
              {roleTitle} · finished in {fmtDuration(result.completionSeconds)}
            </p>
          </div>
          {result.performance !== null ? (
            <div className="text-right">
              <p className="text-[30px] font-medium leading-none tabular-nums text-[var(--text-primary)]">
                {result.performance}
                <span className="text-[15px] text-[var(--text-tertiary)]"> / 100</span>
              </p>
              <div className="mt-2 flex justify-end">
                <StatusTag tone="neutral">{result.bandLabel}</StatusTag>
              </div>
            </div>
          ) : (
            <StatusTag tone="neutral">{result.bandLabel}</StatusTag>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-5 border-t border-[var(--border-subtle)] px-5 py-4 sm:grid-cols-3">
          <Metric
            label="Performance"
            value={result.performance === null ? "Not scored" : String(result.performance)}
            help="How the work was judged against the evaluation."
          />
          <Metric
            label="Coverage"
            value={pct(result.coverage)}
            help="How much of the work the assessment could see."
          />
          <Metric
            label="Confidence"
            value={pct(result.confidence)}
            help="How firmly the evidence supports the judgment."
          />
        </dl>
      </Surface>

      <Surface tone="panel">
        <SectionHead
          title="What this rests on"
          description="Each line names something observed in your attempt, not an impression of it."
        />
        {result.citations.length ? (
          <ol className="divide-y divide-[var(--border-subtle)]">
            {result.citations.map((c, i) => {
              const anchor = `evidence-${c.eventOrArtifactId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
              return (
                <li
                  key={`${c.eventOrArtifactId}-${i}`}
                  id={anchor}
                  className="scroll-mt-24 px-5 py-3.5"
                >
                  <p className="border-l-2 border-[rgba(107,140,255,0.5)] pl-3 text-[14px] font-medium text-[var(--text-primary)]">
                    {c.claim}
                  </p>
                  <p className="mt-1 pl-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                    {c.detail}
                  </p>
                  {c.eventOrArtifactId ? (
                    <p className="mt-1.5 pl-3">
                      <span className="inline-block max-w-full overflow-x-auto whitespace-nowrap rounded-[5px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-2 py-1 font-mono text-[11.5px] text-[var(--text-tertiary)]">
                        {c.eventOrArtifactId}
                      </span>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-5 py-3.5 text-[13.5px] text-[var(--text-secondary)]">
            No supporting citations were produced for this attempt.
          </p>
        )}
      </Surface>

      <div className="grid gap-4 md:grid-cols-2">
        <Surface tone="panel">
          <SectionHead title="What went well" />
          {result.strengths.length ? (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {result.strengths.map((s, i) => (
                <li
                  key={i}
                  className="px-5 py-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]"
                >
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-3 text-[13.5px] text-[var(--text-secondary)]">
              Nothing stood out strongly enough on this attempt to single out.
            </p>
          )}
        </Surface>
        <Surface tone="panel">
          <SectionHead title="Where it stopped short" />
          {result.improvements.length ? (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {result.improvements.map((s, i) => (
                <li
                  key={i}
                  className="px-5 py-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]"
                >
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-3 text-[13.5px] text-[var(--text-secondary)]">
              Nothing was left obviously unfinished.
            </p>
          )}
        </Surface>
      </div>

      <Surface tone="panel">
        <SectionHead
          title="By competency"
          description="Coverage and confidence are separate from performance. Thin coverage can hold a result back even where the answered parts look strong."
        />
        <ul className="divide-y divide-[var(--border-subtle)]">
          {result.competencies.map((c) => {
            const perf = c.performance ?? 0;
            return (
              <li key={c.key} className="px-5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[13.5px] text-[var(--text-primary)]">
                    {c.label}
                  </span>
                  <span className="text-[12.5px] text-[var(--text-tertiary)]">
                    {c.bandLabel}
                    {c.performance === null ? null : (
                      <span className="ml-2 tabular-nums text-[var(--text-secondary)]">
                        {Math.round(c.performance)}
                      </span>
                    )}
                  </span>
                </div>
                {/* One colour. A bar that changes hue by value says "good" and
                    "bad" twice, once in a language nobody was taught. */}
                <div
                  className="mt-2 h-[5px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]"
                  role="img"
                  aria-label={`${c.label}: ${
                    c.performance === null ? "not scored" : `${Math.round(perf)} out of 100`
                  }`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--fydell-evidence)]"
                    style={{
                      width: `${c.performance === null ? 0 : Math.max(perf, 2)}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Surface>

      <p className="text-[13px] leading-[1.65] text-[var(--text-tertiary)]">
        {result.disclaimer}
      </p>
    </div>
  );
}
