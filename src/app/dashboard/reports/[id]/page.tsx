"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<{ name: string; report: string } | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/pilot/dashboard", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load report");
        return;
      }
      const found = (data.activity || []).find((r: { id: string }) => r.id === id);
      if (!found) setError("Report not found for this organization.");
      else setRow({ name: found.name, report: found.report });
    })();
  }, [id]);

  return (
    <div>
      <Link href="/dashboard/reports" className="text-[13px] text-white/50 hover:text-white">
        ← Reports
      </Link>
      <h1 className="mt-4 text-[28px] text-white" style={{ fontWeight: 560 }}>
        Evidence report
      </h1>
      {error ? <p className="mt-4 text-[#fda4b0]">{error}</p> : null}
      {row ? (
        <div className="mt-6 rounded-[14px] border border-white/10 bg-[#0A0C11] p-5 text-[13px] text-white/70">
          <p className="text-white">{row.name}</p>
          <p className="mt-2">Status: {row.report}</p>
          <p className="mt-4 text-white/50">
            Detailed evidence dimensions appear after Fydell human review releases the report.
            No fabricated scores are shown.
          </p>
        </div>
      ) : null}
    </div>
  );
}
