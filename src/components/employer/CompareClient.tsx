"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CompareRow {
  sessionId: string;
  candidate: string;
  reportStatus: string;
  performance: number | null;
  coverage: number | null;
  confidence: number | null;
  band: string | null;
  strengths: string[];
  counterevidence: string[];
  humanReviewRequired: boolean;
}

export default function CompareClient() {
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/pilot/compare")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRows(data.candidates || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) {
    return <p className="text-[14px] text-red-700">{error}</p>;
  }
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-[14px] text-slate-500">
        No completed candidates in this cohort yet. Compatible reports will appear here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-[13px]">
        <thead className="border-b border-slate-200 bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Coverage</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Strengths</th>
            <th className="px-4 py-3">Counterevidence</th>
            <th className="px-4 py-3">Report</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sessionId} className="border-t border-slate-100 align-top">
              <td className="px-4 py-3 font-medium text-slate-900">
                {r.candidate}
                {r.humanReviewRequired && (
                  <span className="mt-1 block text-[11.5px] font-normal text-amber-700">
                    Human review required
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {r.performance === null ? "Insufficient evidence" : `${r.performance} · ${r.band}`}
              </td>
              <td className="px-4 py-3">
                {r.coverage === null ? "-" : `${Math.round(r.coverage * 100)}%`}
              </td>
              <td className="px-4 py-3">
                {r.confidence === null ? "-" : `${Math.round(r.confidence * 100)}%`}
              </td>
              <td className="px-4 py-3 text-slate-600">
                <ul className="list-disc pl-4">
                  {r.strengths.slice(0, 2).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3 text-slate-600">
                <ul className="list-disc pl-4">
                  {r.counterevidence.slice(0, 2).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/app/employer/assessments/report/${r.sessionId}`}
                  className="font-medium text-[#3157D5] hover:underline"
                >
                  Open evidence
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
