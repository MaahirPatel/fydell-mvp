"use client";

/**
 * A dense list of evaluations.
 *
 * This replaced a marketplace grid: role pills across the top, a card per
 * simulation, a competency tag cloud on every card and two competing buttons.
 * An evaluation is an operational object, so it gets one row, one status and
 * one action menu.
 */
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { isFlagshipSlug } from "@/lib/simulations/roles";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
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

type Entry = { sim: CatalogSim; roleKey: string };

function RowMenu({
  onPreview,
  onInvite,
  canInvite,
  label,
}: {
  onPreview: () => void;
  onInvite: () => void;
  canInvite: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "block w-full rounded-[5px] px-2.5 py-1.5 text-left text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-45";

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="quiet"
        size="sm"
        icon
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${label}`}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.7} aria-hidden />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-[190px] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-1 shadow-[var(--shadow-pop)]"
        >
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onPreview();
            }}
          >
            Preview what candidates see
          </button>
          <button
            type="button"
            className={itemClass}
            disabled={!canInvite}
            onClick={() => {
              setOpen(false);
              onInvite();
            }}
          >
            Invite a candidate
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PreviewDialog({
  sim,
  onClose,
}: {
  sim: CatalogSim | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={Boolean(sim)}
      onClose={onClose}
      title={sim?.title ?? ""}
      description={
        sim
          ? `${sim.durationMinutes} minutes · ${sim.preview.companyName} · read-only`
          : undefined
      }
      width="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {sim ? (
        <div className="grid gap-6">
          <section>
            <h3 className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)]">
              The brief candidates see
            </h3>
            <p className="mt-2 text-[14px] leading-[1.65] text-[var(--text-secondary)]">
              {sim.preview.brief}
            </p>
          </section>

          <section>
            <h3 className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)]">
              Working materials
            </h3>
            <ul className="mt-2 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
              {sim.preview.resources.map((r) => (
                <li
                  key={r.title}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-[13.5px]"
                >
                  <span className="text-[var(--text-primary)]">{r.title}</span>
                  <span className="text-[12.5px] text-[var(--text-tertiary)]">
                    {RESOURCE_KIND_LABEL[r.kind] || "Document"}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-3 px-3 py-2 text-[13.5px]">
                <span className="text-[var(--text-primary)]">
                  Conversation with {sim.preview.stakeholder.name}
                </span>
                <span className="text-[12.5px] text-[var(--text-tertiary)]">
                  {sim.preview.stakeholder.role}
                </span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)]">
              What the candidate is asked
            </h3>
            <ol className="mt-2 grid gap-2.5">
              {sim.preview.questions.map((q, i) => (
                <li
                  key={i}
                  className="text-[13.5px] leading-[1.6] text-[var(--text-secondary)]"
                >
                  <span className="tabular-nums text-[var(--text-tertiary)]">
                    {i + 1}.
                  </span>{" "}
                  {q.prompt}
                  <span className="ml-1.5 text-[12.5px] text-[var(--text-tertiary)]">
                    {QUESTION_KIND_LABEL[q.kind] || q.kind}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
              Answer keys and scoring internals are hidden from candidates and
              from this preview.
            </p>
          </section>
        </div>
      ) : null}
    </Dialog>
  );
}

export default function EvaluationList({ roles }: { roles: CatalogRole[] }) {
  const { open } = useInviteModal();
  const [preview, setPreview] = useState<CatalogSim | null>(null);

  const entries: Entry[] = roles.flatMap((role) =>
    role.sims.map((sim) => ({ sim, roleKey: role.key })),
  );

  // The published flagship leads; everything else follows in catalogue order.
  entries.sort((a, b) => {
    const af = isFlagshipSlug(a.sim.slug) ? 0 : 1;
    const bf = isFlagshipSlug(b.sim.slug) ? 0 : 1;
    return af - bf;
  });

  if (entries.length === 0) return null;

  return (
    <>
      <ul className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        {entries.map(({ sim, roleKey }) => (
          <li
            key={`${roleKey}-${sim.slug}`}
            className="flex items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.02]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreview(sim)}
                  className="truncate text-[14px] font-medium text-[var(--text-primary)] underline-offset-2 hover:underline"
                >
                  {sim.title}
                </button>
                {/* Not green: green is reserved for something a candidate
                    actually finished, not for a template being available. */}
                {sim.templateId ? null : <StatusTag>Prototype</StatusTag>}
              </div>
              <p className="mt-0.5 truncate text-[13px] text-[var(--text-secondary)]">
                {sim.tagline}
              </p>
            </div>

            <span className="hidden shrink-0 text-[13px] tabular-nums text-[var(--text-tertiary)] sm:block">
              {sim.durationMinutes} min
            </span>

            <RowMenu
              label={sim.title}
              canInvite={Boolean(sim.templateId)}
              onPreview={() => setPreview(sim)}
              onInvite={() => open({ roleKey, slug: sim.slug })}
            />
          </li>
        ))}
      </ul>

      <PreviewDialog sim={preview} onClose={() => setPreview(null)} />
    </>
  );
}
