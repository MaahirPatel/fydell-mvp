"use client";

import { useCallback, useEffect, useState } from "react";

type Mission = {
  id: string;
  title: string;
  status: string;
  organizationName: string;
  createdAt: string;
};

export default function OpsMissionsList() {
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/missions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load missions");
      setMissions(data.missions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load missions");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ops/missions/${id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not activate mission");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate mission");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-[13px] text-[#fda4b0]">{error}</p>;
  if (missions === null) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-14 rounded-[12px] bg-white/5" />
      </div>
    );
  }
  if (missions.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-5 py-10 text-center text-[13.5px] text-white/50">
        Nothing waiting for review.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06] rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85">
      {missions.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px]">
          <div>
            <p className="font-medium text-white">{m.title}</p>
            <p className="mt-0.5 text-white/45">
              {m.organizationName} · submitted {new Date(m.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            disabled={busyId === m.id}
            onClick={() => activate(m.id)}
            className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {busyId === m.id ? "Activating…" : "Activate"}
          </button>
        </li>
      ))}
    </ul>
  );
}
