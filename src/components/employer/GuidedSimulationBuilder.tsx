"use client";

/**
 * Guided "Start from template" entry: pick a role, pick one of five sims
 * (flagship selected by default), then Preview or Invite. No AI generator.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { isFlagshipSlug } from "@/lib/simulations/roles";
import { useInviteModal } from "./InviteCandidateModal";
import type { CatalogRole, CatalogSim } from "./catalog-types";

const RESOURCE_KIND_LABEL: Record<string, string> = {
  table: "Data table",
  markdown: "Document",
};

const QUESTION_KIND_LABEL: Record<string, string> = {
  single_select: "Single choice",
  multi_select: "Multiple choice",
  number: "Number",
  text: "Written answer",
};

function PreviewModal({ sim, onClose }: { sim: CatalogSim; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${sim.title}`}
        className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-900">{sim.title}</h2>
            <p className="mt-0.5 text-[13.5px] text-slate-500">
              {sim.durationMinutes} min · {sim.preview.companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close preview"
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            The brief candidates see
          </h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{sim.preview.brief}</p>
        </section>

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            Working materials
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {sim.preview.resources.map((r) => (
              <li key={r.title} className="flex items-center gap-2 text-[14.5px] text-slate-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3157D5]" />
                {r.title}
                <span className="text-[12.5px] text-slate-400">
                  {RESOURCE_KIND_LABEL[r.kind] || "Document"}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-[14.5px] text-slate-700">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3157D5]" />
              Chat with {sim.preview.stakeholder.name}
              <span className="text-[12.5px] text-slate-400">{sim.preview.stakeholder.role}</span>
            </li>
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            Questions
          </h3>
          <ol className="mt-1.5 space-y-2.5">
            {sim.preview.questions.map((q, i) => (
              <li key={i} className="text-[14.5px] leading-snug text-slate-700">
                <span className="font-medium text-slate-900">{i + 1}.</span> {q.prompt}
                <span className="ml-1.5 text-[12.5px] text-slate-400">
                  {QUESTION_KIND_LABEL[q.kind] || q.kind} · {q.points} pts
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[13px] text-slate-500">
            Answer keys and scoring details stay hidden from candidates and from this preview.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function GuidedSimulationBuilder({ roles }: { roles: CatalogRole[] }) {
  const { open } = useInviteModal();
  const [roleKey, setRoleKey] = useState(roles[0]?.key || "");
  const [previewSim, setPreviewSim] = useState<CatalogSim | null>(null);

  const activeRole = roles.find((r) => r.key === roleKey) || roles[0];
  const defaultSlug = useMemo(() => {
    if (!activeRole) return "";
    return activeRole.sims.find((s) => isFlagshipSlug(s.slug))?.slug || activeRole.sims[0]?.slug || "";
  }, [activeRole]);

  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);

  // Keep selection on the flagship when the role changes.
  const selectedSim =
    activeRole?.sims.find((s) => s.slug === selectedSlug) ||
    activeRole?.sims.find((s) => s.slug === defaultSlug) ||
    activeRole?.sims[0] ||
    null;

  if (!activeRole || !selectedSim) {
    return (
      <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-[14.5px] text-slate-500">
        No published simulations are available yet.
      </p>
    );
  }

  return (
    <div>
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
          1. Choose a role
        </h2>
        <div className="mt-3 flex flex-wrap gap-2" role="list">
          {roles.map((r) => {
            const active = r.key === activeRole.key;
            return (
              <button
                key={r.key}
                type="button"
                role="listitem"
                onClick={() => {
                  setRoleKey(r.key);
                  const flagship =
                    r.sims.find((s) => isFlagshipSlug(s.slug))?.slug || r.sims[0]?.slug || "";
                  setSelectedSlug(flagship);
                }}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[#3157D5] bg-[#EEF2FF] ring-1 ring-[#3157D5]/30"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <p className={`text-[14.5px] ${active ? "font-semibold text-[#2848b8]" : "font-medium text-slate-800"}`}>
                  {r.title}
                </p>
                <p className="mt-0.5 text-[12.5px] text-slate-500">
                  {r.sims.length} simulation{r.sims.length === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">
          2. Choose a simulation
        </h2>
        <ul className="mt-3 space-y-2">
          {activeRole.sims.map((sim) => {
            const selected = sim.slug === selectedSim.slug;
            const flagship = isFlagshipSlug(sim.slug);
            return (
              <li key={sim.slug}>
                <button
                  type="button"
                  onClick={() => setSelectedSlug(sim.slug)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                    selected
                      ? "border-[#3157D5] bg-white ring-1 ring-[#3157D5]/25"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-[#3157D5] bg-[#3157D5]" : "border-slate-300 bg-white"
                    }`}
                    aria-hidden
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-slate-900">{sim.title}</p>
                      {flagship && (
                        <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#3157D5]">
                          Flagship
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13.5px] text-slate-500">
                      {sim.durationMinutes} min · {sim.tagline}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-[#F0F4FC] p-5">
        <h2 className="text-[16px] font-semibold text-slate-900">{selectedSim.title}</h2>
        <p className="mt-1 text-[14px] text-slate-600">{selectedSim.tagline}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewSim(selectedSim)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => open({ roleKey: activeRole.key, slug: selectedSim.slug })}
            disabled={!selectedSim.templateId}
            className="rounded-lg bg-[#3157D5] px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-[#2848b8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Invite candidate
          </button>
          <Link
            href="/app/employer/assessments"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Browse full library
          </Link>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
          Use as-is: published templates are already live. Inviting a candidate pins the current
          immutable version, so later catalog edits never change evidence for this attempt.
          {!selectedSim.templateId && (
            <span className="mt-1 block text-amber-700">
              This simulation is not published in the database yet, so invitations are unavailable.
            </span>
          )}
        </p>
      </section>

      {previewSim && <PreviewModal sim={previewSim} onClose={() => setPreviewSim(null)} />}
    </div>
  );
}
