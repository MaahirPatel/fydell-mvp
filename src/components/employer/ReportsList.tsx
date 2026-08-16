"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { StatusTag } from "@/components/ui/StatusTag";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";

const TABS_ID = "reports-review";

export interface ReportRow {
  sessionId: string;
  candidate: string;
  email: string;
  roleKey: string;
  roleTitle: string;
  simulation: string;
  score: number | null;
  bandLabel: string | null;
  completedAt: string | null;
  needsReview?: boolean;
}

const BAND_OPTIONS = [
  "Strong evidence",
  "Established evidence",
  "Developing evidence",
  "Limited evidence",
  "Insufficient evidence",
];

type ReviewFilter = "all" | "needs_review" | "decided";

/** Comparison is only meaningful between two reports on the same evaluation. */
function comparableCount(rows: ReportRow[]): number {
  const bySimulation = new Map<string, number>();
  for (const r of rows) {
    bySimulation.set(r.simulation, (bySimulation.get(r.simulation) ?? 0) + 1);
  }
  return Math.max(0, ...bySimulation.values());
}

export default function ReportsList({
  rows,
  roleOptions,
  initialReviewFilter = "all",
}: {
  rows: ReportRow[];
  roleOptions: { key: string; title: string }[];
  initialReviewFilter?: ReviewFilter;
}) {
  const [roleFilter, setRoleFilter] = useState("all");
  const [bandFilter, setBandFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(initialReviewFilter);
  const [search, setSearch] = useState("");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const needsReviewCount = useMemo(
    () => rows.filter((r) => r.needsReview).length,
    [rows]
  );

  const canCompare = comparableCount(rows) >= 2;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (roleFilter !== "all" && r.roleKey !== roleFilter) return false;
      if (bandFilter !== "all" && r.bandLabel !== bandFilter) return false;
      if (reviewFilter === "needs_review" && !r.needsReview) return false;
      if (reviewFilter === "decided" && r.needsReview) return false;
      if (q && !r.candidate.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q))
        return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const at = a.completedAt || "";
      const bt = b.completedAt || "";
      return sortNewestFirst ? (at < bt ? 1 : -1) : at < bt ? -1 : 1;
    });
  }, [rows, roleFilter, bandFilter, reviewFilter, search, sortNewestFirst]);

  // Nothing to filter, so no filter chrome. An empty toolbar above an empty
  // table is the clearest signal a screen was never designed for zero state.
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No reports yet"
        description="A report appears here as soon as a candidate submits their evaluation. It contains their conclusion, the evidence they cited, and questions to take into the interview."
        action={
          <ButtonLink href="/app/employer/candidates" variant="secondary" size="sm">
            Go to candidates
          </ButtonLink>
        }
      />
    );
  }

  const showFilters = rows.length > 3;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)]">
        <Tabs
          idBase={TABS_ID}
          label="Review status"
          value={reviewFilter}
          onValueChange={(v) => setReviewFilter(v as ReviewFilter)}
          className="border-b-0"
          items={[
            { value: "all", label: "All", count: rows.length },
            { value: "needs_review", label: "Needs review", count: needsReviewCount },
            {
              value: "decided",
              label: "Decided",
              count: rows.length - needsReviewCount,
            },
          ]}
        />

        {/* Contextual, not a permanent destination, and off until it can work. */}
        <div className="pb-2">
          {canCompare ? (
            <ButtonLink href="/app/employer/compare" variant="secondary" size="sm">
              Compare reports
            </ButtonLink>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled
              title="Comparison needs two completed reports on the same evaluation."
            >
              Compare reports
            </Button>
          )}
        </div>
      </div>

      {showFilters ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates"
            aria-label="Search candidates"
            className="w-[220px]"
          />
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            {roleOptions.map((r) => (
              <option key={r.key} value={r.key}>
                {r.title}
              </option>
            ))}
          </Select>
          <Select
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value)}
            aria-label="Filter by evidence band"
          >
            <option value="all">All bands</option>
            {BAND_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
          <Select
            value={sortNewestFirst ? "newest" : "oldest"}
            onChange={(e) => setSortNewestFirst(e.target.value === "newest")}
            aria-label="Sort by completion date"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`${TABS_ID}-panel`}
        aria-labelledby={`${TABS_ID}-tab-${reviewFilter}`}
        className="mt-4"
      >
      {visible.length === 0 ? (
        <EmptyState
          title={
            reviewFilter === "needs_review"
              ? "Nothing waiting on a decision"
              : "No reports match these filters"
          }
          description={
            reviewFilter === "needs_review"
              ? "Every completed report has a recorded hiring decision."
              : "Try widening the role or evidence band."
          }
        />
      ) : (
        <Panel>
          <Table className="min-w-[840px]">
            <THead>
              <TH>Candidate</TH>
              <TH>Evaluation</TH>
              <TH align="right">Score</TH>
              <TH>Evidence</TH>
              <TH>Completed</TH>
              <TH align="right">Report</TH>
            </THead>
            <TBody>
              {visible.map((r) => (
                <TR key={r.sessionId}>
                  <TDPrimary>
                    <span className="block truncate">{r.candidate}</span>
                    {r.candidate !== r.email && r.email ? (
                      <span className="mt-0.5 block truncate text-[12.5px] font-normal text-[var(--text-tertiary)]">
                        {r.email}
                      </span>
                    ) : null}
                  </TDPrimary>
                  <TD>
                    <span className="block truncate">{r.simulation}</span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-[var(--text-tertiary)]">
                      {r.roleTitle}
                    </span>
                  </TD>
                  <TD align="right" className="tabular-nums text-[var(--text-primary)]">
                    {r.score !== null ? (
                      r.score
                    ) : (
                      <span className="text-[var(--text-tertiary)]">n/a</span>
                    )}
                  </TD>
                  <TD>
                    {r.bandLabel ? (
                      <StatusTag tone="neutral">{r.bandLabel}</StatusTag>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">Not banded</span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">
                    {r.completedAt
                      ? new Date(r.completedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "n/a"}
                    {r.needsReview ? (
                      <span className="mt-0.5 block text-app-meta text-[var(--fydell-changed)]">
                        Needs review
                      </span>
                    ) : null}
                  </TD>
                  <TD align="right">
                    <Link
                      href={`/app/employer/assessments/report/${r.sessionId}`}
                      className="inline-flex h-8 items-center rounded-[var(--radius-control)] px-2.5 text-app-body font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
                    >
                      Open
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Panel>
      )}
      </div>
    </div>
  );
}
