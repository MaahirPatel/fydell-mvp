"use client";

import { useState } from "react";
import Link from "next/link";
import { PlatformShell } from "@/components/platform/PlatformShell";
import type {
  Difficulty,
  GeneratorInput,
  SimulationDraft,
  SimulationStyle
} from "@/lib/mvp/generator-types";

interface Validation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const STYLE_OPTIONS: { value: SimulationStyle; label: string }[] = [
  { value: "case_analysis", label: "Case analysis" },
  { value: "inbox_triage", label: "Inbox triage" },
  { value: "spreadsheet_analysis", label: "Spreadsheet analysis" },
  { value: "customer_conversation", label: "Customer conversation" },
  { value: "incident_response", label: "Incident response" },
  { value: "product_decision", label: "Product decision" },
  { value: "operations_prioritization", label: "Operations prioritization" },
  { value: "written_recommendation", label: "Written recommendation" }
];

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

const labelCls = "block text-sm font-semibold text-white/85";
const helpCls = "mt-1 text-xs text-white/45";
const errCls = "mt-1 text-xs font-medium text-[#ff9d9d]";

function Field({
  label,
  htmlFor,
  help,
  children
}: {
  label: string;
  htmlFor: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {help ? <p className={helpCls}>{help}</p> : null}
    </div>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/55">{subtitle}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

const emptyForm: GeneratorInput = {
  role_title: "",
  industry: "",
  seniority: "Mid-level",
  department: "",
  duration_minutes: 30,
  difficulty: "intermediate",
  job_description: "",
  great_performance: "",
  failure_modes: "",
  real_tasks: "",
  tools_documents: "",
  required_skills: [],
  nice_to_have: [],
  evaluation_criteria: [],
  must_have_behaviors: [],
  disqualifying_behaviors: [],
  simulation_type: "case_analysis"
};

export default function NewSimulationPage() {
  const [form, setForm] = useState<GeneratorInput>(emptyForm);
  const [draft, setDraft] = useState<SimulationDraft | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [source, setSource] = useState<"llm" | "deterministic" | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "publishing">("idle");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof GeneratorInput>(key: K, value: GeneratorInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setList(key: keyof GeneratorInput, value: string) {
    set(
      key,
      value
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean) as unknown as GeneratorInput[typeof key]
    );
  }

  async function handleGenerate() {
    setError(null);
    setSavedId(null);
    if (!form.role_title.trim()) {
      setError("Add a role title before generating.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", input: form })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed.");
        return;
      }
      setDraft(data.draft);
      setValidation(data.validation);
      setSource(data.source);
    } catch {
      setError("Network error while generating.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(action: "save" | "publish") {
    if (!draft) return;
    setError(null);
    setSaveState(action === "publish" ? "publishing" : "saving");
    try {
      const res = await fetch("/api/generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, draft })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setValidation(data.validation ?? null);
        setError(data.error || "Could not save. Resolve the validation errors below.");
        return;
      }
      setSavedId(data.simulation?.id ?? null);
      setValidation(data.validation);
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaveState("idle");
    }
  }

  function patchDraft(patch: Partial<SimulationDraft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }

  return (
    <PlatformShell
      actions={
        <Link href="/platform" className="platform-btn-ghost">
          Back to dashboard
        </Link>
      }
    >
      <div className="pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9faeff]">Simulation generator</p>
        <h1 className="mt-2 font-serif text-4xl text-white">Create a new simulation</h1>
        <p className="mt-2 max-w-2xl text-white/55">
          Describe the role and how you would judge a great hire. We assemble a structured, job-relevant
          simulation you can edit, save as a draft, or publish.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-6">
          <SectionCard title="Role basics" subtitle="The essentials that anchor the simulation.">
            <Field label="Role title" htmlFor="role_title">
              <input
                id="role_title"
                className="platform-input"
                placeholder="Financial Analyst"
                value={form.role_title}
                onChange={(e) => set("role_title", e.target.value)}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Industry" htmlFor="industry">
                <input
                  id="industry"
                  className="platform-input"
                  placeholder="Financial Services"
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                />
              </Field>
              <Field label="Seniority" htmlFor="seniority">
                <input
                  id="seniority"
                  className="platform-input"
                  placeholder="Mid-level"
                  value={form.seniority}
                  onChange={(e) => set("seniority", e.target.value)}
                />
              </Field>
              <Field label="Department" htmlFor="department">
                <input
                  id="department"
                  className="platform-input"
                  placeholder="Finance"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </Field>
              <Field label="Duration (minutes)" htmlFor="duration">
                <input
                  id="duration"
                  type="number"
                  min={5}
                  max={180}
                  className="platform-input"
                  value={form.duration_minutes}
                  onChange={(e) => set("duration_minutes", Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Difficulty" htmlFor="difficulty">
              <select
                id="difficulty"
                className="platform-select"
                value={form.difficulty}
                onChange={(e) => set("difficulty", e.target.value as Difficulty)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </SectionCard>

          <SectionCard title="Role context" subtitle="What the job actually looks like day to day.">
            <Field label="Job description" htmlFor="job_description">
              <textarea
                id="job_description"
                rows={3}
                className="platform-input"
                placeholder="What this person owns and is accountable for."
                value={form.job_description}
                onChange={(e) => set("job_description", e.target.value)}
              />
            </Field>
            <Field label="What great performance looks like" htmlFor="great_performance">
              <textarea
                id="great_performance"
                rows={2}
                className="platform-input"
                value={form.great_performance}
                onChange={(e) => set("great_performance", e.target.value)}
              />
            </Field>
            <Field label="Common failure modes" htmlFor="failure_modes">
              <textarea
                id="failure_modes"
                rows={2}
                className="platform-input"
                value={form.failure_modes}
                onChange={(e) => set("failure_modes", e.target.value)}
              />
            </Field>
            <Field label="Real tasks" htmlFor="real_tasks" help="One per line or comma-separated.">
              <textarea
                id="real_tasks"
                rows={2}
                className="platform-input"
                value={form.real_tasks}
                onChange={(e) => set("real_tasks", e.target.value)}
              />
            </Field>
            <Field label="Tools and documents" htmlFor="tools_documents">
              <input
                id="tools_documents"
                className="platform-input"
                placeholder="Excel models, CRM, runbooks"
                value={form.tools_documents}
                onChange={(e) => set("tools_documents", e.target.value)}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Skills and evaluation" subtitle="How you will judge the work. Comma or line separated.">
            <Field label="Required skills" htmlFor="required_skills">
              <input
                id="required_skills"
                className="platform-input"
                placeholder="Financial modeling, valuation"
                onChange={(e) => setList("required_skills", e.target.value)}
              />
            </Field>
            <Field label="Nice-to-have skills" htmlFor="nice_to_have">
              <input
                id="nice_to_have"
                className="platform-input"
                onChange={(e) => setList("nice_to_have", e.target.value)}
              />
            </Field>
            <Field label="Evaluation criteria" htmlFor="evaluation_criteria">
              <textarea
                id="evaluation_criteria"
                rows={2}
                className="platform-input"
                onChange={(e) => setList("evaluation_criteria", e.target.value)}
              />
            </Field>
            <Field label="Must-have behaviors" htmlFor="must_have_behaviors">
              <input
                id="must_have_behaviors"
                className="platform-input"
                onChange={(e) => setList("must_have_behaviors", e.target.value)}
              />
            </Field>
            <Field
              label="Disqualifying behaviors"
              htmlFor="disqualifying_behaviors"
              help="Job-relevant only. Avoid protected-class or identity-based criteria."
            >
              <input
                id="disqualifying_behaviors"
                className="platform-input"
                onChange={(e) => setList("disqualifying_behaviors", e.target.value)}
              />
            </Field>
          </SectionCard>

          <SectionCard title="Simulation style" subtitle="The format the candidate experiences.">
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Simulation style</legend>
              {STYLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    form.simulation_type === opt.value
                      ? "border-[#7c5cff]/55 bg-[#7c5cff]/15 text-white"
                      : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="simulation_type"
                    className="accent-[#7c5cff]"
                    checked={form.simulation_type === opt.value}
                    onChange={() => set("simulation_type", opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>
          </SectionCard>

          <div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="platform-btn-primary w-full"
            >
              {loading ? "Generating..." : "Generate draft simulation"}
            </button>
            {error ? <p className={errCls}>{error}</p> : null}
          </div>
        </div>

        <div className="space-y-6">
          {!draft ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] p-10 text-center">
              <p className="text-sm font-semibold text-white/70">No draft yet</p>
              <p className="mt-2 max-w-sm text-sm text-white/45">
                Fill in the role on the left and generate. Your editable preview, validation results,
                and save options will appear here.
              </p>
            </div>
          ) : (
            <DraftPreview
              draft={draft}
              validation={validation}
              source={source}
              saveState={saveState}
              savedId={savedId}
              onPatch={patchDraft}
              onPatchResource={(i, content) => {
                const resources = draft.resources.map((r, idx) =>
                  idx === i ? { ...r, content } : r
                );
                patchDraft({ resources });
              }}
              onPatchResourceTitle={(i, title) => {
                const resources = draft.resources.map((r, idx) =>
                  idx === i ? { ...r, title } : r
                );
                patchDraft({ resources });
              }}
              onPatchRubricWeight={(i, weight) => {
                const rubric = draft.rubric.map((d, idx) =>
                  idx === i ? { ...d, weight } : d
                );
                patchDraft({ rubric });
              }}
              onSave={() => handleSave("save")}
              onPublish={() => handleSave("publish")}
            />
          )}
        </div>
      </div>
    </PlatformShell>
  );
}

function DraftPreview({
  draft,
  validation,
  source,
  saveState,
  savedId,
  onPatch,
  onPatchResource,
  onPatchResourceTitle,
  onPatchRubricWeight,
  onSave,
  onPublish
}: {
  draft: SimulationDraft;
  validation: Validation | null;
  source: "llm" | "deterministic" | null;
  saveState: "idle" | "saving" | "publishing";
  savedId: string | null;
  onPatch: (patch: Partial<SimulationDraft>) => void;
  onPatchResource: (i: number, content: string) => void;
  onPatchResourceTitle: (i: number, title: string) => void;
  onPatchRubricWeight: (i: number, weight: number) => void;
  onSave: () => void;
  onPublish: () => void;
}) {
  const weightSum = draft.rubric.reduce((acc, d) => acc + (Number(d.weight) || 0), 0);

  return (
    <div className="space-y-6">
      {validation ? (
        <div
          className={`rounded-2xl border p-4 ${
            validation.ok
              ? "border-[#3ddc97]/35 bg-[#3ddc97]/10"
              : "border-[#ff9d9d]/35 bg-[#ff9d9d]/10"
          }`}
        >
          <p className="text-sm font-bold text-white">
            {validation.ok ? "Draft is valid and ready to save" : "Resolve these before saving"}
          </p>
          {source ? (
            <p className="mt-1 text-xs text-white/55">
              Generated by the {source === "llm" ? "LLM-enriched" : "deterministic"} engine.
            </p>
          ) : null}
          {validation.errors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-[#ff9d9d]">
              {validation.errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          ) : null}
          {validation.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-[#ffd479]">
              {validation.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <SectionCard title="Editable preview" subtitle="Adjust anything before saving. Changes are validated on save.">
        <Field label="Title" htmlFor="draft_title">
          <input
            id="draft_title"
            className="platform-input"
            value={draft.title}
            onChange={(e) => onPatch({ title: e.target.value })}
          />
        </Field>
        <p className="text-xs text-white/45">
          {draft.role} | {draft.industry} | {draft.duration_minutes} min | {draft.difficulty}
        </p>
        <Field label="Business problem" htmlFor="draft_problem">
          <textarea
            id="draft_problem"
            rows={3}
            className="platform-input"
            value={draft.scenario.business_problem}
            onChange={(e) =>
              onPatch({ scenario: { ...draft.scenario, business_problem: e.target.value } })
            }
          />
        </Field>
        <Field label="Background" htmlFor="draft_background">
          <textarea
            id="draft_background"
            rows={4}
            className="platform-input"
            value={draft.scenario.background}
            onChange={(e) =>
              onPatch({ scenario: { ...draft.scenario, background: e.target.value } })
            }
          />
        </Field>
      </SectionCard>

      <SectionCard title={`Resources (${draft.resources.length})`} subtitle="The materials the candidate works from.">
        {draft.resources.map((r, i) => (
          <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <input
                aria-label={`Resource ${i + 1} title`}
                className="platform-input !min-h-0 flex-1 !py-2 text-sm font-semibold"
                value={r.title}
                onChange={(e) => onPatchResourceTitle(i, e.target.value)}
              />
              <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[11px] uppercase tracking-wide text-white/55">
                {r.type}
              </span>
            </div>
            <textarea
              aria-label={`Resource ${i + 1} content`}
              rows={3}
              className="platform-input mt-3 text-sm"
              value={r.content}
              onChange={(e) => onPatchResource(i, e.target.value)}
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Scoring rubric" subtitle={`Weights total ${weightSum} (normalized to 100 on save).`}>
        {draft.rubric.map((d, i) => (
          <div key={d.dimension} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{d.dimension}</p>
              <p className="mt-0.5 text-xs text-white/50">{d.description}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-white/55">
              <span className="sr-only">{d.dimension} weight</span>
              <input
                type="number"
                min={0}
                max={100}
                className="platform-input !min-h-0 w-20 !py-1.5 text-right text-sm"
                value={d.weight}
                onChange={(e) => onPatchRubricWeight(i, Number(e.target.value))}
              />
              %
            </label>
          </div>
        ))}
      </SectionCard>

      <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saveState !== "idle"}
            className="platform-btn-primary"
          >
            {saveState === "saving" ? "Saving..." : "Save draft"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={saveState !== "idle"}
            className="platform-btn-ghost"
          >
            {saveState === "publishing" ? "Publishing..." : "Publish"}
          </button>
        </div>
        {savedId ? (
          <div className="mt-4 rounded-xl border border-[#3ddc97]/30 bg-[#3ddc97]/10 p-4 text-sm">
            <p className="font-semibold text-white">Saved to your workspace.</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <Link href={`/platform/simulations/${savedId}`} className="text-[#9faeff] underline">
                Open simulation
              </Link>
              <Link href={`/session/${savedId}`} className="text-[#9faeff] underline">
                Test-run candidate view
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
