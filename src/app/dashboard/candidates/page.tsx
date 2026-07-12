"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  name: string;
  email: string;
  invitation: string;
  session: string;
  report: string;
};

export default function CandidatesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/pilot/dashboard", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setRows(data.activity || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-[28px] text-white" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Candidates
      </h1>
      <p className="mt-2 text-[14px] text-white/55">Only invited candidates for your organization.</p>
      {loading ? <p className="mt-8 text-white/45">Loading…</p> : null}
      {error ? <p className="mt-8 text-[#fda4b0]">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <div className="mt-8 rounded-[14px] border border-dashed border-white/12 px-4 py-10 text-center text-[13px] text-white/55">
          No candidates invited yet.
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-[14px] border border-white/10">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[#0B0D12] text-[11px] uppercase tracking-[0.05em] text-white/40">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Invitation</th>
                <th className="px-4 py-3">Session</th>
                <th className="px-4 py-3">Report</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3">
                    <div className="text-white">{r.name}</div>
                    <div className="text-white/40">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{r.invitation}</td>
                  <td className="px-4 py-3 text-white/60">{r.session}</td>
                  <td className="px-4 py-3 text-white/60">{r.report}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
