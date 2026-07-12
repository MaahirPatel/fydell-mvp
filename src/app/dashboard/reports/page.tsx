"use client";

import { useEffect, useState } from "react";

export default function ReportsPage() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; report: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/pilot/dashboard", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed");
      else
        setRows(
          (data.activity || [])
            .filter((r: { report: string }) => r.report !== "none")
            .map((r: { id: string; name: string; report: string }) => ({
              id: r.id,
              name: r.name,
              report: r.report,
            }))
        );
    })();
  }, []);

  return (
    <div>
      <h1 className="text-[28px] text-white" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Reports
      </h1>
      <p className="mt-2 text-[14px] text-white/55">
        Reports enter human review after submission. Fake scores are never shown.
      </p>
      {error ? <p className="mt-6 text-[#fda4b0]">{error}</p> : null}
      {rows.length === 0 && !error ? (
        <div className="mt-8 rounded-[14px] border border-dashed border-white/12 px-4 py-10 text-center text-[13px] text-white/55">
          No reports yet.
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-[12px] border border-white/10 px-4 py-3 text-[13px]"
            >
              <span className="text-white">{r.name}</span>
              <span className="text-white/50">{r.report}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
