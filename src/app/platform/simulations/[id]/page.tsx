"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PlatformShell } from "@/components/platform/PlatformShell";
import type { GeneratedSimulation } from "@/lib/platform-types";

export default function SimulationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [sim, setSim] = useState<GeneratedSimulation | null>(null);

  useEffect(() => {
    fetch(`/api/platform/simulations/${id}`)
      .then((r) => r.json())
      .then((d) => setSim(d.simulation));
  }, [id]);

  function openImmersive() {
    const url = `/session/${id}?kiosk=1`;
    const w = window.open(url, "fydell_session", "popup,width=1280,height=800,noopener,noreferrer");
    if (!w) window.location.href = url;
  }

  if (!sim) {
    return (
      <PlatformShell>
        <p className="pt-20 text-white/50">Loading simulation...</p>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      actions={
        <Link href="/platform/create" className="platform-btn-ghost">← Studio</Link>
      }
    >
      <div className="pt-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal">Simulation preview</p>
        <h1 className="mt-2 font-serif text-4xl">{sim.title}</h1>
        <p className="mt-2 text-white/60">{sim.role} | {sim.durationMinutes} minutes</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="font-semibold">Documents</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/75">
              {sim.documents.map((d) => (
                <li key={d.id} className="rounded-lg border border-white/10 p-3">
                  <strong className="text-white">{d.title}</strong>
                  <p className="mt-1 text-white/55">{d.content.slice(0, 160)}...</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="font-semibold">Embedded errors (scoring key)</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {sim.embeddedErrors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
            <h2 className="mt-6 font-semibold">Workbook tasks</h2>
            <p className="mt-2 text-sm text-white/55">{sim.tasks.length} required fields</p>
            <button type="button" onClick={openImmersive} className="platform-btn-primary mt-8">
              Launch immersive session ↗
            </button>
            <Link href={`/session/${sim.id}`} className="platform-btn-ghost mt-3 inline-flex">
              Open in this tab
            </Link>
          </div>
        </div>
      </div>
    </PlatformShell>
  );
}
