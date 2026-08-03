"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Review status">
        {(
          [
            { key: "all" as const, label: `All (${rows.length})` },
            { key: "needs_review" as const, label: `Needs review (${needsReviewCount})` },
            {
              key: "decided" as const,
              label: `Decided (${rows.length - needsReviewCount})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={reviewFilter === tab.key}
            onClick={() => setReviewFilter(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13.5px] transition ${
              reviewFilter === tab.key
                ? "bg-slate-900 font-semibold text-white"
                : "border border-slate-300 bg-white font-medium text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search candidates"
          aria-label="Search candidates"
          className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-900 focus:border-[#3157D5] focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-700 focus:border-[#3157D5] focus:outline-none"
        >
          <option value="all">All roles</option>
          {roleOptions.map((r) => (
            <option key={r.key} value={r.key}>
              {r.title}
            </option>
          ))}
        </select>
        <select
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value)}
          aria-label="Filter by evidence band"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-700 focus:border-[#3157D5] focus:outline-none"
        >
          <option value="all">All bands</option>
          {BAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={sortNewestFirst ? "newest" : "oldest"}
          onChange={(e) => setSortNewestFirst(e.target.value === "newest")}
          aria-label="Sort by completion date"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-700 focus:border-[#3157D5] focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-[15px] text-slate-600">
            {rows.length === 0
              ? "No completed reports yet. Reports appear here after a candidate submits a simulation."
              : reviewFilter === "needs_review"
                ? "No reports need a hiring decision right now."
                : "No reports match these filters."}
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Candidate</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
                <th className="px-4 py-2.5 font-semibold">Simulation</th>
                <th className="px-4 py-2.5 font-semibold">Score</th>
                <th className="px-4 py-2.5 font-semibold">Evidence band</th>
                <th className="px-4 py-2.5 font-semibold">Completed</th>
                <th className="px-4 py-2.5 font-semibold" aria-label="View" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.sessionId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.candidate}</p>
                    {r.candidate !== r.email && (
                      <p className="text-[12.5px] text-slate-400">{r.email}</p>
                    )}
                    {r.needsReview && (
                      <p className="mt-0.5 text-[12px] font-medium text-amber-700">Needs review</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.roleTitle}</td>
                  <td className="px-4 py-3 text-slate-600">{r.simulation}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.score !== null ? `${r.score}/100` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {r.bandLabel ? (
                      <span className="whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[12.5px] font-semibold text-blue-700">
                        {r.bandLabel}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/employer/assessments/report/${r.sessionId}`}
                      className="text-[13.5px] font-semibold text-blue-700 hover:text-blue-600"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
