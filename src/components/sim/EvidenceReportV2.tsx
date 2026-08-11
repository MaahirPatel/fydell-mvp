/**
 * Citation-backed v2 result view. Summary first, then evidence citations -
 * no formula-first decorative card.
 */
import type { V2PersistedResult } from "@/lib/simulations/v2/scoring";

const ROLE_TITLES: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "Business Intelligence Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

const BAND_CLASS: Record<string, string> = {
  strong: "bg-blue-100 text-blue-800",
  established: "bg-blue-100 text-blue-800",
  developing: "bg-slate-200 text-slate-700",
  limited: "bg-slate-100 text-slate-600",
  insufficient: "bg-slate-100 text-slate-500",
};

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "n/a";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function EvidenceReportV2({ result }: { result: V2PersistedResult }) {
  const roleTitle = ROLE_TITLES[result.roleKey] || result.roleKey;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-[#3157D5]">
          Simulation completed
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{result.simulationTitle}</h1>
            <p className="text-[15px] text-slate-500">
              {roleTitle} · Completed in {fmtDuration(result.completionSeconds)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-slate-900">
              {result.performance === null ? "-" : result.performance}
              {result.performance !== null && (
                <span className="text-base font-medium text-slate-400"> / 100</span>
              )}
            </p>
            <span
              className={`mt-1 inline-block rounded-md px-2.5 py-1 text-[12px] font-semibold ${BAND_CLASS[result.band] || BAND_CLASS.limited}`}
            >
              {result.bandLabel}
            </span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Performance
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {result.performance === null ? "n/a" : result.performance}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Coverage
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {pct(result.coverage)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Confidence
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
              {pct(result.confidence)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">Evidence citations</h2>
        <p className="mt-1 text-[13px] text-slate-500">
          Claims backed by observed signals from this attempt.
        </p>
        {result.citations.length ? (
          <ol className="mt-3 space-y-3">
            {result.citations.map((c, i) => {
              const anchor = `evidence-${c.eventOrArtifactId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
              return (
                <li
                  key={`${c.eventOrArtifactId}-${i}`}
                  id={anchor}
                  className="scroll-mt-24 border-l-2 border-[#3157D5]/40 pl-3"
                >
                  <p className="text-[14px] font-medium text-slate-800">{c.claim}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{c.detail}</p>
                  <a
                    href={`#${anchor}`}
                    className="mt-0.5 inline-block font-mono text-[11px] text-[#3157D5] hover:underline"
                  >
                    {c.eventOrArtifactId}
                  </a>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-[14px] text-slate-500">
            No supporting citations were produced for this attempt.
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-slate-900">Strengths</h2>
          {result.strengths.length ? (
            <ul className="mt-2.5 space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-slate-700">
                  <span aria-hidden className="mt-0.5 text-violet-600">
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-[15px] text-slate-500">No standout evidence on this attempt.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-slate-900">Improvements</h2>
          {result.improvements.length ? (
            <ul className="mt-2.5 space-y-2">
              {result.improvements.map((s, i) => (
                <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-slate-700">
                  <span aria-hidden className="mt-0.5 text-violet-500">
                    →
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 text-[15px] text-slate-500">Coverage looks complete.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-slate-900">Competency breakdown</h2>
        <div className="mt-3 space-y-2.5">
          {result.competencies.map((c) => {
            const perf = c.performance ?? 0;
            return (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-56 shrink-0 text-[14px] text-slate-700">{c.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${perf >= 85 ? "bg-violet-500" : perf >= 50 ? "bg-violet-400" : "bg-blue-500"}`}
                    style={{ width: `${Math.max(c.performance === null ? 0 : perf, 3)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[13px] tabular-nums text-slate-500">
                  {c.performance === null ? "n/a" : `${Math.round(c.performance)}`}
                </span>
                <span className="w-32 shrink-0 text-right text-[12px] text-slate-400">
                  {c.bandLabel}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-slate-400">
          Coverage and confidence are separate from performance. Low coverage can mark a result as
          insufficient even when answered items look strong.
        </p>
      </div>

      <p className="px-1 text-[13px] leading-relaxed text-slate-400">{result.disclaimer}</p>
    </div>
  );
}
