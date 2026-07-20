"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

type OrgMission = {
  id: string;
  title: string;
  status: string;
  created_at: string;
};

type TemplateCard = {
  id: string;
  title: string;
  summary: string;
  roleTitle: string;
  seniority: string;
  durationLabel: string;
  aiPolicyLabel: string;
  competencies: string[];
  badge: string;
  ownerType: "fydell";
  label: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Validated",
  active: "Published",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

/** True Simulation Library — blueprints & Fydell templates, not candidate sessions. */
export default function SimulationLibraryPage() {
  const router = useRouter();
  const [missions, setMissions] = useState<OrgMission[] | null>(null);
  const [templates, setTemplates] = useState<TemplateCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adopting, setAdopting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mRes, tRes] = await Promise.all([
        fetch("/api/fde/missions", { cache: "no-store" }),
        fetch("/api/employer/simulations/templates", { cache: "no-store" }),
      ]);
      const mData = await mRes.json();
      const tData = await tRes.json();
      if (!mRes.ok) throw new Error(mData.error || "Could not load your simulations");
      if (!tRes.ok) throw new Error(tData.error || "Could not load Fydell templates");
      setMissions(mData.missions || []);
      setTemplates(tData.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load library");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function useTemplate(templateId: string) {
    setAdopting(templateId);
    setError(null);
    try {
      const res = await fetch("/api/employer/simulations/use-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not use template");
      router.push(data.redirectTo || `/app/employer/missions/${data.mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use template");
      setAdopting(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Simulation library
          </p>
          <h1
            className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            Build and manage work simulations
          </h1>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-white/55">
            Create reusable FDE work environments, validate what they measure, and publish them as
            hiring missions. Candidate sessions live under Attempts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/employer/simulations/generate"
            className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate with AI
          </Link>
          <Link
            href="/app/employer/attempts"
            className="inline-flex h-10 items-center rounded-[9px] border border-white/15 px-4 text-[13px] text-white/75"
          >
            View attempts
          </Link>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-[13px] text-[#fda4b0]" role="alert">
          {error}
        </p>
      )}

      {/* Generate card */}
      <section className="mt-8 rounded-[16px] border border-[#3B5BFF]/25 bg-[#3B5BFF]/[0.07] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#B8C4FF]">
              Generate a new simulation
            </p>
            <h2 className="mt-1 text-[18px] text-white" style={{ fontWeight: 560 }}>
              AI drafts the full FDE work environment
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-white/55">
              Scenario, artifacts, hidden state, tests, curveball, and measurement blueprint —
              compiled into a real candidate workspace you can preview before inviting anyone.
            </p>
          </div>
          <Link
            href="/app/employer/simulations/generate"
            className="inline-flex h-10 items-center gap-2 rounded-[9px] bg-white px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Open generator
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Recommended by Fydell */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
            Recommended by Fydell
          </h2>
          <p className="text-[11px] text-white/35">Platform content — not company-owned until you adopt it</p>
        </div>

        {templates === null ? (
          <div className="mt-3 h-40 animate-pulse rounded-[16px] bg-white/5" />
        ) : (
          <ul className="mt-3 grid gap-4 lg:grid-cols-1">
            {templates.map((t) => (
              <li
                key={t.id}
                className="rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/90 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-[6px] border border-[#B8C4FF]/35 bg-[#3B5BFF]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B8C4FF]">
                        {t.label}
                      </span>
                      <span className="text-[11px] text-white/40">{t.badge}</span>
                    </div>
                    <h3
                      className="mt-2 text-[20px] text-white"
                      style={{ fontWeight: 560, letterSpacing: "-0.02em" }}
                    >
                      {t.title}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-white/50">
                      {t.roleTitle} · {t.seniority} · {t.durationLabel} · {t.aiPolicyLabel}
                    </p>
                    <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-white/65">
                      {t.summary}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {t.competencies.map((c) => (
                        <li
                          key={c}
                          className="rounded-[6px] border border-white/10 px-2 py-0.5 text-[11px] text-white/55"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => useTemplate(t.id)}
                      disabled={adopting === t.id}
                      className="inline-flex h-10 items-center justify-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
                    >
                      {adopting === t.id ? "Publishing…" : "Use template & invite"}
                    </button>
                    <Link
                      href={`/app/employer/simulations/generate?template=${encodeURIComponent(t.id)}`}
                      className="inline-flex h-10 items-center justify-center rounded-[9px] border border-white/15 px-4 text-[13px] text-white/75"
                    >
                      Customize in generator
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Your simulations */}
      <section className="mt-10">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Your simulations
        </h2>
        <p className="mt-1 text-[12.5px] text-white/40">
          Organization-owned blueprints. Zero until you use a template or generate one.
        </p>

        {missions === null ? (
          <div className="mt-3 h-24 animate-pulse rounded-[14px] bg-white/5" />
        ) : missions.length === 0 ? (
          <div className="mt-3 rounded-[14px] border border-dashed border-white/12 px-5 py-8 text-center">
            <p className="text-[14px] text-white/55">
              No company-owned simulations yet. Use the Fydell template above or generate with AI.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
            {missions.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/app/employer/missions/${m.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{m.title}</p>
                    <p className="mt-0.5 text-[11px] text-white/40">
                      Updated {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                        m.status === "active"
                          ? "border-[#8EE4B8]/35 text-[#8EE4B8]"
                          : "border-white/15 text-white/60"
                      }`}
                    >
                      {STATUS_LABEL[m.status] || m.status}
                    </span>
                    <span className="text-[12px] text-white/45">Open →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
