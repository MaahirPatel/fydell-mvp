"use client";

import { useMemo, useState } from "react";
import type { AnalysisResult } from "@/lib/sim-engine/types";
import { cn } from "@/lib/cn";
import { StatusTag } from "@/components/ui/StatusTag";

export function AnalysisEngineView({ analysis }: { analysis: AnalysisResult }) {
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const playback = useMemo(() => {
    return analysis.playback.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (!query.trim()) return true;
      const hay = `${p.label} ${p.detail ?? ""}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }, [analysis.playback, filter, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)]">Employer analysis</h1>
        <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
          scenario {analysis.versions.scenarioVersion} · engine {analysis.versions.engineVersion} ·
          analysis {analysis.versions.analysisVersion}
        </p>
      </header>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {analysis.competencies.map((c) => (
          <div
            key={c.competencyId}
            className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[13px] font-medium text-[var(--text-primary)]">{c.label}</div>
              <StatusTag
                tone={
                  c.outcome === "DEMONSTRATED"
                    ? "good"
                    : c.outcome === "CONCERN"
                      ? "risk"
                      : c.outcome === "PARTIALLY_DEMONSTRATED"
                        ? "changed"
                        : "neutral"
                }
              >
                {c.outcome.replaceAll("_", " ")}
              </StatusTag>
            </div>
            <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
              {c.inferences[0]?.statement ??
                (c.outcome === "INSUFFICIENT_EVIDENCE"
                  ? "Not enough evidence to judge."
                  : c.strengths[0] ?? c.concerns[0] ?? "")}
            </p>
            {c.observations[0] ? (
              <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                Obs: {c.observations[0].statement}
              </p>
            ) : null}
          </div>
        ))}
      </section>

      {analysis.sections.map((section) => (
        <section key={section.kind} className="space-y-3">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">{section.title}</h2>
          <p className="text-[13px] text-[var(--text-secondary)]">{section.body}</p>
          {section.kind === "execution" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="platform-input h-8 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 text-[12px]"
                placeholder="Search timeline"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search execution timeline"
              />
              {["all", "code", "ai", "communication", "execution", "navigation", "integrity", "system"].map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    className={cn(
                      "rounded-[var(--radius-control)] border px-2 py-1 text-[11px]",
                      filter === f
                        ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                        : "border-[var(--border-default)] text-[var(--text-tertiary)]"
                    )}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                )
              )}
            </div>
          ) : null}
          <ul className="space-y-2">
            {section.kind === "execution"
              ? playback.map((p) => (
                  <li
                    key={p.eventId}
                    className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2"
                  >
                    <div className="text-[12px] text-[var(--text-primary)]">{p.label}</div>
                    {p.detail ? (
                      <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{p.detail}</div>
                    ) : null}
                  </li>
                ))
              : (section.items ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2"
                  >
                    <div className="text-[12px] text-[var(--text-primary)]">{item.label}</div>
                    {item.detail ? (
                      <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{item.detail}</div>
                    ) : null}
                  </li>
                ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
