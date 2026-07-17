"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Node = {
  receiptId: string;
  receiptNumber: string;
  status: string;
  missionTitle: string;
  issuedAt: string | null;
  shares: number;
  decisions: Array<{ id: string; decision: string; structured_reason: string | null; created_at: string }>;
};

export default function FdeGraphPage() {
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fde/graph", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load graph");
        setNodes(data.nodes || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load graph");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Graph</p>
      <h1 className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
        Your evidence graph
      </h1>
      <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
        A plain list of your real receipts, who you've shared them with, and any decisions employers
        recorded. No candidate network, no fabricated connections — this is honest, not a visualization
        yet.
      </p>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : nodes === null ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : nodes.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            Nothing here yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Once you have an issued receipt, its shares and any employer decisions will show up here.
          </p>
        </section>
      ) : (
        <ul className="mt-6 space-y-3">
          {nodes.map((n) => (
            <li key={n.receiptId} className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/app/fde/receipts/${n.receiptId}`} className="font-medium text-white hover:underline">
                    {n.receiptNumber}
                  </Link>
                  <p className="mt-0.5 text-[13px] text-white/45">{n.missionTitle}</p>
                </div>
                <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-white/60">
                  {n.shares} active share{n.shares === 1 ? "" : "s"}
                </span>
              </div>
              {n.decisions.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
                  {n.decisions.map((d) => (
                    <li key={d.id} className="text-[12.5px] text-white/55">
                      <span className="capitalize text-white/75">{d.decision}</span> ·{" "}
                      {new Date(d.created_at).toLocaleDateString()}
                      {d.structured_reason ? ` — ${d.structured_reason}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
