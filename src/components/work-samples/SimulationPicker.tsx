"use client";

import { Field, Input, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { AuthoringInput, ExemplarSummary, TrackAvailability } from "./types";

type Simulation = NonNullable<AuthoringInput["simulation"]>;
export type SimulationMode = "as_is" | "adapt" | "upload";

const DIFFICULTY_LABEL: Record<ExemplarSummary["difficulty"], string> = { introductory: "Introductory", moderate: "Moderate", challenging: "Challenging" };

const MODES: Array<{ id: SimulationMode; label: string; description: string }> = [
  { id: "adapt", label: "Adapt to my context", description: "Fydell writes a new scenario of the same kind, set in your business, then runs every check on it." },
  { id: "as_is", label: "Use as reviewed", description: "The role model exactly as validated. You can still edit any section in the draft." },
  { id: "upload", label: "Upload my own files", description: "Your starter, tests and reference solution, checked by the same runner." },
];

export function modeOf(input: AuthoringInput): SimulationMode {
  if (input.simulation?.mode === "as_is") return "as_is";
  return input.startingMaterial === "uploaded" ? "upload" : "adapt";
}

function choiceClass(on: boolean, disabled = false) {
  return cn(
    "rounded-[var(--radius-panel)] border px-3.5 py-3 text-left transition-colors",
    disabled
      ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--surface-panel)] opacity-70"
      : on
        ? "border-[var(--accent)] bg-[var(--surface-selected)] ring-1 ring-[var(--accent)]"
        : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
  );
}

export function SimulationPicker({
  tracks,
  input,
  error,
  onSelect,
  onChange,
  onMode,
}: {
  tracks: TrackAvailability[];
  input: AuthoringInput;
  error: string | null;
  /** Picks a role model and applies the configuration it was validated with. */
  onSelect: (exemplar: ExemplarSummary, track: TrackAvailability) => void;
  onChange: (patch: Partial<Simulation>) => void;
  onMode: (mode: SimulationMode) => void;
}) {
  const sim = input.simulation;
  const available = tracks.filter((t) => t.available);
  const later = tracks.filter((t) => !t.available);
  const track = tracks.find((t) => t.track === sim?.track) ?? null;
  const families = track ? [...new Map(track.exemplars.map((e) => [e.taskFamily, e.taskFamilyLabel])).entries()] : [];
  const models = track && sim ? track.exemplars.filter((e) => e.taskFamily === sim.taskFamily) : [];
  const mode = modeOf(input);

  function pickTrack(t: TrackAvailability) {
    if (!t.available || t.track === sim?.track) return;
    onSelect(t.exemplars[0], t);
  }
  function pickFamily(id: string) {
    if (!track || id === sim?.taskFamily) return;
    const first = track.exemplars.find((e) => e.taskFamily === id);
    if (first) onSelect(first, track);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title" htmlFor="f-job-title" help="As it appears on your posting, for example Founding Engineer or Senior Backend Engineer.">
          <Input id="f-job-title" maxLength={120} value={sim?.jobTitle ?? ""} disabled={!sim} onChange={(e) => onChange({ jobTitle: e.target.value })} />
        </Field>
        <Field label="Secondary capability" htmlFor="f-secondary" optional help="Something adjacent you also care about, for example API design or mobile client constraints.">
          <Input id="f-secondary" maxLength={200} value={sim?.secondaryCapability ?? ""} disabled={!sim} onChange={(e) => onChange({ secondaryCapability: e.target.value })} />
        </Field>
      </div>

      <fieldset>
        <legend className="text-app-meta font-medium text-[var(--text-primary)]">Primary track</legend>
        <p className="mt-0.5 text-[13px] leading-[1.5] text-[var(--text-secondary)]">The kind of engineering work the simulation is built around. A track is offered once it has a validated role-model simulation.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Primary track">
          {available.map((t) => {
            const on = t.track === sim?.track;
            return (
              <button key={t.track} type="button" role="radio" aria-checked={on} onClick={() => pickTrack(t)} className={choiceClass(on)}>
                <span className="block text-[15px] font-semibold text-[var(--text-primary)]">{t.label}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--text-secondary)]">{t.roles.slice(0, 3).join(", ")}</span>
                <span className="mt-1.5 block text-[12px] font-medium text-[var(--accent)]">
                  {t.exemplars.length} role-model {t.exemplars.length === 1 ? "simulation" : "simulations"}
                </span>
              </button>
            );
          })}
        </div>
        {later.length ? (
          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Tracks not offered yet ({later.length})</summary>
            <ul className="mt-2 grid gap-2">
              {later.map((t) => (
                <li key={t.track} className="leading-[1.5] text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-body)]">{t.label}</span>
                  <span className="text-[var(--text-tertiary)]"> · {t.priorityLabel}</span>
                  {t.prerequisite ? <span>. Needs: {t.prerequisite.charAt(0).toLowerCase() + t.prerequisite.slice(1)}.</span> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {track?.scopeNote ? <p className="mt-2 text-[13px] leading-[1.5] text-[var(--text-secondary)]">{track.scopeNote}</p> : null}
      </fieldset>

      {track ? (
        <fieldset>
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">Task family</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Task family">
            {families.map(([id, label]) => {
              const on = id === sim?.taskFamily;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickFamily(id)}
                  className={cn(
                    "h-9 rounded-[8px] border px-3.5 text-[14px] font-medium transition-colors",
                    on ? "border-[var(--accent)] bg-[var(--surface-selected)] text-[var(--text-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {models.length ? (
        <fieldset>
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">Role-model simulation</legend>
          <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Role-model simulation">
            {models.map((m) => {
              const on = m.key === sim?.exemplarKey;
              return (
                <button key={m.key} type="button" role="radio" aria-checked={on} onClick={() => track && onSelect(m, track)} className={choiceClass(on)}>
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-[15px] font-semibold text-[var(--text-primary)]">{m.title}</span>
                    <span className="text-[12px] font-medium text-[var(--status-positive-ink)]">Validated</span>
                  </span>
                  <span className="mt-1 block text-[14px] leading-[1.5] text-[var(--text-body)]">{m.summary}</span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[var(--text-secondary)]">
                    <span>{m.stackLabel}</span>
                    <span>{m.minutes} min</span>
                    <span>{DIFFICULTY_LABEL[m.difficulty]}</span>
                    <span>Set in: {m.businessContext}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {sim ? (
        <fieldset>
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">How to use it</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How to use the role model">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => onMode(m.id)} className={choiceClass(mode === m.id)}>
                <span className="block text-[14px] font-semibold text-[var(--text-primary)]">{m.label}</span>
                <span className="mt-0.5 block text-[13px] leading-[1.45] text-[var(--text-secondary)]">{m.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {sim && mode === "adapt" ? (
        <Field
          label="Your business context"
          htmlFor="f-business-context"
          help="What your company does and where this kind of problem shows up for you. The new scenario is set there. Synthetic details only: no customer names, data or secrets."
        >
          <Textarea id="f-business-context" rows={4} maxLength={1500} value={sim.businessContext} onChange={(e) => onChange({ businessContext: e.target.value })} />
        </Field>
      ) : null}

      {error ? <p className="text-[13px] text-[var(--fydell-risk)]">{error}</p> : null}
    </div>
  );
}
