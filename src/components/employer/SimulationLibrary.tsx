"use client";

/**
 * Six role tabs, five simulations each. Full mode shows cards with Preview
 * and Invite actions; compact mode shows a short list with Invite buttons.
 * Preview is read-only and candidate-safe (no answers, no scoring).
 */
import { useState } from "react";
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

function RoleTabs({
  roles,
  activeKey,
  onSelect,
}: {
  roles: CatalogRole[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Roles">
      {roles.map((r) => (
        <button
          key={r.key}
          role="tab"
          aria-selected={activeKey === r.key}
          onClick={() => onSelect(r.key)}
          className={`rounded-full px-3.5 py-1.5 text-[13.5px] transition ${
            activeKey === r.key
              ? "bg-slate-900 font-semibold text-white"
              : "border border-slate-300 bg-white font-medium text-slate-600 hover:bg-slate-50"
          }`}
        >
          {r.title}
        </button>
      ))}
    </div>
  );
}

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
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                {r.title}
                <span className="text-[12.5px] text-slate-400">
                  {RESOURCE_KIND_LABEL[r.kind] || "Document"}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-[14.5px] text-slate-700">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
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

export default function SimulationLibrary({
  roles,
  compact = false,
}: {
  roles: CatalogRole[];
  compact?: boolean;
}) {
  const { open } = useInviteModal();
  const [activeKey, setActiveKey] = useState(roles[0]?.key || "");
  const [previewSim, setPreviewSim] = useState<CatalogSim | null>(null);

  const activeRole = roles.find((r) => r.key === activeKey) || roles[0];
  if (!activeRole) return null;

  return (
    <div>
      <RoleTabs roles={roles} activeKey={activeRole.key} onSelect={setActiveKey} />

      {compact ? (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {activeRole.sims.map((sim) => (
            <li key={sim.slug} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-slate-900">{sim.title}</p>
                <p className="truncate text-[13px] text-slate-500">
                  {sim.durationMinutes} min · {sim.tagline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => open({ roleKey: activeRole.key, slug: sim.slug })}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Invite
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeRole.sims.map((sim) => (
            <div
              key={sim.slug}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
            >
              <h3 className="text-[16px] font-semibold text-slate-900">{sim.title}</h3>
              <p className="mt-1 flex-1 text-[14.5px] leading-relaxed text-slate-600">
                {sim.tagline}
              </p>
              <p className="mt-3 text-[13px] text-slate-500">{sim.durationMinutes} min</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sim.competencies.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewSim(sim)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13.5px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => open({ roleKey: activeRole.key, slug: sim.slug })}
                  className="rounded-lg bg-violet-600 px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-violet-500"
                >
                  Invite candidate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewSim && <PreviewModal sim={previewSim} onClose={() => setPreviewSim(null)} />}
    </div>
  );
}
