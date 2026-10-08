"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { api } from "./api";
import { Combobox, type ComboOption } from "./Combobox";
import { Banner, Disclosure, LineList, StatusIcon, StatusText } from "./ui";
import { SimulationPicker, modeOf, type SimulationMode } from "./SimulationPicker";
import type { AuthoringInput, Capabilities, ExemplarSummary, FormValidation, OtherField, RegistryPayload, TrackAvailability } from "./types";

const STORAGE_KEY = "fydell.work-sample-creator.v2";
const OTHER = "other";

type Clarification = FormValidation["clarifications"][number];
type Assumption = FormValidation["assumptions"][number];
type Issue = FormValidation["errors"][number];

type Stored = {
  v: 1;
  fromDraft: string | null;
  input: AuthoringInput;
  customDuration: string | null;
  seenClarifications: Clarification[];
  seenAssumptions: Assumption[];
};

/** Assumptions that depend on one field's free text; editing the field withdraws the confirmation. */
const ASSUMPTION_FIELD: Record<string, OtherField> = {
  family_other: "family",
  framework_other: "framework",
  database_other: "database",
  technologies_other: "technologies",
  task_type_other: "taskType",
  capabilities_other: "capabilities",
  starting_other: "startingMaterial",
};

const EXAMPLE =
  "Our webhook consumer processes payment events twice when the provider retries after a timeout, so some customers are charged twice. " +
  "The fix should make processing idempotent by event id and keep the existing handler interface. " +
  "A good result processes each event exactly once, still acknowledges retries, and logs duplicates. " +
  "Include a regression test that delivers the same event twice. An in-memory store is fine; no new services.";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : NaN;
}

function loadStored(fromDraft: string | null): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s.v !== 1 || (s.fromDraft ?? null) !== fromDraft || !s.input) return null;
    return { ...s, input: { ...s.input, taskMinutes: num(s.input.taskMinutes), setupMinutes: num(s.input.setupMinutes) } };
  } catch {
    return null;
  }
}

function mergeById<T extends { id: string }>(prev: T[], next: T[]): T[] {
  const map = new Map(prev.map((x) => [x.id, x]));
  for (const x of next) map.set(x.id, x);
  return [...map.values()];
}

export default function CreatorForm({
  registry,
  tracks,
  capabilities,
  prefill,
  fromDraft,
}: {
  registry: RegistryPayload;
  tracks: TrackAvailability[];
  capabilities: Capabilities;
  prefill: AuthoringInput | null;
  fromDraft: string | null;
}) {
  const router = useRouter();
  const [initial] = useState(() => loadStored(fromDraft));
  const [input, setInput] = useState<AuthoringInput>(() => initial?.input ?? prefill ?? registry.defaults);
  const presets = registry.durations.presets as readonly number[];
  const [customDuration, setCustomDuration] = useState<string | null>(() => {
    if (initial) return initial.customDuration;
    const t = (prefill ?? registry.defaults).taskMinutes;
    return presets.includes(t) ? null : String(t);
  });
  const [seenClarifications, setSeenClarifications] = useState<Clarification[]>(initial?.seenClarifications ?? []);
  const [seenAssumptions, setSeenAssumptions] = useState<Assumption[]>(initial?.seenAssumptions ?? []);
  const [validation, setValidation] = useState<{ key: string; result: FormValidation } | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const key = useMemo(() => JSON.stringify(input), [input]);
  const pending = !validation || validation.key !== key;
  const result = validation?.result ?? null;

  function remember(v: FormValidation) {
    setSeenClarifications((prev) => mergeById(prev, v.clarifications));
    setSeenAssumptions((prev) => mergeById(prev, v.assumptions));
  }

  useEffect(() => {
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      const res = await api<{ validation: FormValidation }>("/api/eng/authoring/validate", { body: { input: JSON.parse(key) as AuthoringInput }, signal: ctrl.signal });
      if (res.ok) {
        const v = res.data.validation;
        setValidateError(null);
        setValidation({ key, result: v });
        setSeenClarifications((prev) => mergeById(prev, v.clarifications));
        setSeenAssumptions((prev) => mergeById(prev, v.assumptions));
      } else if (res.error !== "aborted") {
        setValidateError(res.error);
      }
    }, 600);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [key]);

  useEffect(() => {
    const stored: Stored = { v: 1, fromDraft, input, customDuration, seenClarifications, seenAssumptions };
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Storage full or disabled: the form still works, it just won't survive a refresh.
    }
  }, [fromDraft, input, customDuration, seenClarifications, seenAssumptions]);

  // ---- updates -------------------------------------------------------------

  function withdraw(next: AuthoringInput, field: OtherField): AuthoringInput {
    const ids = Object.entries(ASSUMPTION_FIELD).filter(([, f]) => f === field).map(([id]) => id);
    return ids.length ? { ...next, confirmedAssumptions: next.confirmedAssumptions.filter((a) => !ids.includes(a)) } : next;
  }

  function setOther(field: OtherField, text: string) {
    setInput((prev) => withdraw({ ...prev, other: { ...prev.other, [field]: text } }, field));
  }

  function languageOk(langs: readonly string[], lang: string): boolean {
    return lang === OTHER || langs.includes(lang);
  }

  function setLanguage(lang: AuthoringInput["language"]) {
    setInput((prev) => {
      const fw = registry.frameworks.find((f) => f.id === prev.framework);
      const db = registry.databases.find((d) => d.id === prev.database);
      return withdraw(
        {
          ...prev,
          language: lang,
          framework: fw && !languageOk(fw.languages, lang) ? "none" : prev.framework,
          database: db && !languageOk(db.languages, lang) ? "none" : prev.database,
          technologies: prev.technologies.filter((t) => {
            const tech = registry.technologies.find((x) => x.id === t);
            return !tech || languageOk(tech.languages, lang);
          }),
        },
        "language",
      );
    });
  }

  function setField<K extends keyof AuthoringInput>(k: K, v: AuthoringInput[K]) {
    setInput((prev) => {
      const next = { ...prev, [k]: v };
      return (registry.otherFields as readonly string[]).includes(k as string) ? withdraw(next, k as OtherField) : next;
    });
  }

  function setLevel(level: AuthoringInput["level"]) {
    setInput((prev) => {
      const old = registry.levels.find((l) => l.id === prev.level)?.scope.expectation ?? "";
      const def = registry.levels.find((l) => l.id === level)?.scope.expectation ?? "";
      const untouched = !prev.levelExpectations.trim() || prev.levelExpectations === old;
      return { ...prev, level, levelExpectations: untouched ? def : prev.levelExpectations };
    });
  }

  function selectRoleModel(m: ExemplarSummary, t: TrackAvailability) {
    setInput((prev) => ({
      ...prev,
      simulation: {
        track: t.track,
        taskFamily: m.taskFamily,
        exemplarKey: m.key,
        mode: prev.simulation?.mode ?? "adapt",
        jobTitle: prev.simulation?.jobTitle ?? "",
        businessContext: prev.simulation?.businessContext ?? "",
        secondaryCapability: prev.simulation?.secondaryCapability ?? "",
      },
      language: m.config.language,
      framework: m.config.framework,
      database: m.config.database,
      taskType: m.config.taskType,
      capabilities: m.config.capabilities,
      taskMinutes: m.config.taskMinutes,
      setupMinutes: m.config.setupMinutes,
      technologies: [],
    }));
    setCustomDuration(presets.includes(m.config.taskMinutes) ? null : String(m.config.taskMinutes));
  }

  function setSimulation(patch: Partial<NonNullable<AuthoringInput["simulation"]>>) {
    setInput((prev) => (prev.simulation ? { ...prev, simulation: { ...prev.simulation, ...patch } } : prev));
  }

  function setMode(mode: SimulationMode) {
    setInput((prev) =>
      prev.simulation
        ? {
            ...prev,
            simulation: { ...prev.simulation, mode: mode === "as_is" ? "as_is" : "adapt" },
            startingMaterial: mode === "upload" ? "uploaded" : mode === "as_is" ? "reviewed_template" : "generated",
          }
        : prev,
    );
  }

  function applyAlternative(field: Issue["field"], alt: string) {
    if (field === "language") return setLanguage(alt as AuthoringInput["language"]);
    if (field === "framework" || field === "database" || field === "taskType" || field === "startingMaterial" || field === "family" || field === "specialization" || field === "aiPolicy") {
      setInput((prev) => {
        const other = { ...prev.other };
        delete other[field];
        return withdraw({ ...prev, [field]: alt, other }, field);
      });
    }
  }

  // ---- options -------------------------------------------------------------

  const lang = input.language;
  const forLang = <T extends { languages: readonly string[] }>(list: T[]) => (lang === OTHER ? list : list.filter((x) => x.languages.includes(lang)));
  const labelOf = (field: string, value: string): string => {
    const lists: Record<string, Array<{ id: string; label: string }>> = {
      language: registry.languages,
      framework: registry.frameworks,
      database: registry.databases,
      taskType: registry.taskTypes,
      startingMaterial: registry.startingMaterials,
      family: registry.families,
      specialization: registry.specializations,
      aiPolicy: registry.aiPolicies,
    };
    return lists[field]?.find((o) => o.id === value)?.label ?? value;
  };
  const otherOption = (grouped: boolean): ComboOption => ({ value: OTHER, label: "Other", description: "Not listed. Say what it is.", group: grouped ? "Not listed" : undefined });

  const levelOptions: ComboOption[] = registry.levels.map((l) => ({ value: l.id, label: l.label, description: l.scope.ambiguity }));
  const languageOptions: ComboOption[] = [
    ...registry.languages.map((l) => ({ value: l.id, label: l.label, description: l.description, group: "Supported" })),
    ...registry.unsupportedLanguages.map((u) => ({
      value: `unsupported:${u.label}`,
      label: u.label,
      group: "Not available yet",
      unavailable: { reason: u.reason, alternative: { value: u.alternative, label: labelOf("language", u.alternative) } },
    })),
    otherOption(true),
  ];
  const frameworkOptions: ComboOption[] = [
    ...forLang(registry.frameworks).map((f) => ({ value: f.id, label: f.label, description: f.description, group: "Supported" })),
    ...registry.unsupportedFrameworks
      .filter((u) => {
        const alt = registry.frameworks.find((f) => f.id === u.alternative);
        return !alt || lang === OTHER || alt.languages.includes(lang);
      })
      .map((u) => ({
        value: `unsupported:${u.label}`,
        label: u.label,
        group: "Not available yet",
        unavailable: { reason: u.reason, alternative: { value: u.alternative, label: labelOf("framework", u.alternative) } },
      })),
    otherOption(true),
  ];
  const databaseOptions: ComboOption[] = [
    ...forLang(registry.databases).map((d) => ({ value: d.id, label: d.label, description: d.description, group: "Supported" })),
    ...registry.unsupportedDatabases.map((u) => {
      const alt = registry.databases.find((d) => d.id === u.alternative);
      const altOk = !alt || lang === OTHER || alt.languages.includes(lang);
      return {
        value: `unsupported:${u.label}`,
        label: u.label,
        group: "Not available yet",
        unavailable: { reason: u.reason, alternative: altOk ? { value: u.alternative, label: labelOf("database", u.alternative) } : { value: "in-memory", label: labelOf("database", "in-memory") } },
      };
    }),
    otherOption(true),
  ];
  const technologyOptions: ComboOption[] = [...forLang(registry.technologies).map((t) => ({ value: t.id, label: t.label })), otherOption(false)];
  const taskTypeOptions: ComboOption[] = [
    ...registry.taskTypes.map((t) =>
      t.supported
        ? { value: t.id, label: t.label, description: t.description }
        : {
            value: t.id,
            label: t.label,
            unavailable: { reason: t.reason ?? "Not available yet.", alternative: t.alternative ? { value: t.alternative, label: labelOf("taskType", t.alternative) } : undefined },
          },
    ),
    otherOption(false),
  ];
  const capabilityOptions: ComboOption[] = [
    ...registry.capabilities.map((c) => ({ value: c.id, label: c.label, description: c.description, group: c.executable ? "Checked by tests" : "Judged by a reviewer" })),
    otherOption(true),
  ];
  const aiPolicyOptions: ComboOption[] = [...registry.aiPolicies.map((p) => ({ value: p.id, label: p.label, description: p.description })), otherOption(false)];
  const materialOptions: ComboOption[] = [
    ...registry.startingMaterials.map((m) =>
      m.supported
        ? { value: m.id, label: m.label, description: m.description }
        : {
            value: m.id,
            label: m.label,
            unavailable: { reason: m.reason ?? "Not available yet.", alternative: m.alternative ? { value: m.alternative, label: labelOf("startingMaterial", m.alternative) } : undefined },
          },
    ),
    otherOption(false),
  ];

  // ---- derived state -------------------------------------------------------

  const fieldError = (field: Issue["field"]): string | null => {
    if (pending || !result) return null;
    const e = [...result.errors, ...result.conflicts].find((x) => x.field === field);
    return e?.message ?? null;
  };
  const level = registry.levels.find((l) => l.id === input.level);
  const durationMode = customDuration === null ? "preset" : "custom";
  const material = input.startingMaterial;
  const usesTemplate = material === "reviewed_template" && !input.simulation;
  const asIs = modeOf(input) === "as_is" && Boolean(input.simulation);
  const uploadPath = material === "uploaded" || (material === OTHER && Boolean(input.other.startingMaterial));
  const generationBlocked = !capabilities.generation.available && material === "generated";

  const shownClarifications = seenClarifications.filter((c) => result?.clarifications.some((x) => x.id === c.id) || (input.answers[c.id] ?? "").trim().length > 0);
  const shownAssumptions = seenAssumptions.filter((a) => result?.assumptions.some((x) => x.id === a.id) || input.confirmedAssumptions.includes(a.id));

  const reasons: string[] = [];
  if (generationBlocked) reasons.push("Generation is not configured on this server. Choose Upload starter files to build the work sample yourself.");
  if (validateError) reasons.push(`Could not check the form: ${validateError}`);
  else if (pending) reasons.push("Checking your selections.");
  else if (result && !result.ok) {
    const n = result.errors.length + result.conflicts.length;
    if (n) reasons.push(`Resolve ${n} ${n === 1 ? "problem" : "problems"} in the summary.`);
    if (result.clarifications.length) reasons.push(`Answer ${result.clarifications.length} ${result.clarifications.length === 1 ? "question" : "questions"} (at least 8 characters each).`);
    if (result.assumptions.length) reasons.push(`Confirm ${result.assumptions.length} ${result.assumptions.length === 1 ? "assumption" : "assumptions"}.`);
  }
  const canSubmit = !usesTemplate && !generationBlocked && !pending && Boolean(result?.ok) && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (usesTemplate || generationBlocked) return;
    setSubmitting(true);
    setSubmitError(null);
    const check = await api<{ validation: FormValidation }>("/api/eng/authoring/validate", { body: { input } });
    if (!check.ok) {
      setSubmitting(false);
      setSubmitError(check.error);
      return;
    }
    setValidation({ key, result: check.data.validation });
    remember(check.data.validation);
    if (!check.data.validation.ok) {
      setSubmitting(false);
      summaryRef.current?.focus();
      return;
    }
    const res = await api<{ draftId: string; jobId: string | null }>("/api/eng/authoring/drafts", { body: { input } });
    if (!res.ok) {
      setSubmitting(false);
      setSubmitError(res.error);
      return;
    }
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    router.push(`/app/employer/work-samples/drafts/${res.data.draftId}`);
  }

  // ---- render --------------------------------------------------------------

  const otherInput = (field: OtherField, opts?: { multi?: boolean; long?: boolean }) => {
    const active = field === "technologies" ? input.technologies.includes(OTHER) : field === "capabilities" ? input.capabilities.includes(OTHER) : input[field] === OTHER;
    if (!active) return null;
    const id = `other-${field}`;
    return (
      <Field
        className="mt-3"
        label={opts?.long ? "Write the policy as candidates will read it" : "What is it?"}
        htmlFor={id}
        help={opts?.multi ? "Separate several with commas." : opts?.long ? "At least one full sentence." : undefined}
      >
        {opts?.long ? (
          <Textarea id={id} rows={3} maxLength={200} value={input.other[field] ?? ""} onChange={(e) => setOther(field, e.target.value)} />
        ) : (
          <Input id={id} maxLength={200} value={input.other[field] ?? ""} onChange={(e) => setOther(field, e.target.value)} />
        )}
      </Field>
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" noValidate>
      <div className="grid min-w-0 gap-6">
        <Panel>
          <PanelSection title="Hiring for">
            <SimulationPicker tracks={tracks} input={input} error={fieldError("simulation")} onSelect={selectRoleModel} onChange={setSimulation} onMode={setMode} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Expected level" htmlFor="f-level" error={fieldError("level")} className="sm:col-span-2">
                <Combobox id="f-level" options={levelOptions} value={input.level} onChange={(v) => setLevel(v as AuthoringInput["level"])} />
              </Field>
            </div>
            {level ? (
              <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-3">
                <div>
                  <dt className="text-[13px] text-[var(--text-tertiary)]">Ambiguity</dt>
                  <dd className="mt-0.5 text-[var(--text-body)]">{level.scope.ambiguity}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-[var(--text-tertiary)]">Ownership</dt>
                  <dd className="mt-0.5 text-[var(--text-body)]">{level.scope.ownership}</dd>
                </div>
                <div>
                  <dt className="text-[13px] text-[var(--text-tertiary)]">Expectation</dt>
                  <dd className="mt-0.5 text-[var(--text-body)]">{level.scope.expectation}</dd>
                </div>
              </dl>
            ) : null}
            <Field className="mt-4" label="Level expectations" htmlFor="f-level-exp" help="Used to pitch the task and the criteria. Edit to match your team." error={fieldError("levelExpectations")}>
              <Textarea id="f-level-exp" rows={3} maxLength={600} value={input.levelExpectations} onChange={(e) => setField("levelExpectations", e.target.value)} />
            </Field>
          </PanelSection>

          {asIs ? (
            <PanelSection title="What the candidate gets">
              <p className="text-[14px] leading-[1.6] text-[var(--text-body)]">
                The role model exactly as validated: its brief, starter project, tests, teammates, time limit and AI policy. After the draft is created you can edit any section, and the checks run again before it can be published.
              </p>
            </PanelSection>
          ) : (
          <>
          <PanelSection title="Environment" description="Only combinations the runner can execute are offered. Everything runs without network access or package installation.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary language" htmlFor="f-language" error={fieldError("language")}>
                <Combobox id="f-language" searchable options={languageOptions} value={input.language} onChange={(v) => setLanguage(v as AuthoringInput["language"])} />
                {otherInput("language")}
              </Field>
              <Field label="Framework" htmlFor="f-framework" error={fieldError("framework")}>
                <Combobox id="f-framework" searchable options={frameworkOptions} value={input.framework} onChange={(v) => setField("framework", v as AuthoringInput["framework"])} />
                {otherInput("framework")}
              </Field>
              <Field label="Data store" htmlFor="f-database" error={fieldError("database")}>
                <Combobox id="f-database" searchable options={databaseOptions} value={input.database} onChange={(v) => setField("database", v as AuthoringInput["database"])} />
                {otherInput("database")}
              </Field>
              <Field label="Technologies" htmlFor="f-technologies" optional error={fieldError("technologies")}>
                <Combobox
                  id="f-technologies"
                  multiple
                  searchable
                  placeholder="None selected"
                  options={technologyOptions}
                  value={input.technologies}
                  onChange={(v) => setField("technologies", v as AuthoringInput["technologies"])}
                />
                {otherInput("technologies", { multi: true })}
              </Field>
            </div>
          </PanelSection>

          <PanelSection title="Task">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Task type" htmlFor="f-task-type" error={fieldError("taskType")}>
                <Combobox id="f-task-type" options={taskTypeOptions} value={input.taskType} onChange={(v) => setField("taskType", v as AuthoringInput["taskType"])} />
                {otherInput("taskType")}
              </Field>
              <Field label="Capabilities to assess" htmlFor="f-capabilities" error={fieldError("capabilities")}>
                <Combobox
                  id="f-capabilities"
                  multiple
                  searchable
                  placeholder="None selected"
                  options={capabilityOptions}
                  value={input.capabilities}
                  onChange={(v) => setField("capabilities", v as AuthoringInput["capabilities"])}
                />
                {otherInput("capabilities", { multi: true })}
              </Field>
            </div>

            <Field
              className="mt-5"
              label="What should the engineer work on?"
              htmlFor="f-description"
              error={fieldError("description")}
              help="Describe the problem, what a good result looks like, and any constraints. Paste from an incident, ticket or design note if you are allowed to share it; remove names, customer data and secrets."
            >
              <Textarea
                id="f-description"
                required
                rows={7}
                maxLength={6001}
                value={input.description}
                onChange={(e) => setField("description", e.target.value)}
                aria-describedby="f-description-help"
              />
            </Field>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Disclosure label="Show an example">
                <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3.5 py-3 text-[14px] leading-[1.6] text-[var(--text-body)]">
                  <p>{EXAMPLE}</p>
                  {input.description.trim() ? null : (
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => setField("description", EXAMPLE)}>
                      Use this example
                    </Button>
                  )}
                </div>
              </Disclosure>
              <span className="text-[13px] tabular-nums text-[var(--text-tertiary)]">{input.description.trim().length} characters, 80 minimum</span>
            </div>

            <div className="mt-4 grid gap-3">
              <Disclosure label="Required outcomes" hint={input.outcomes.length ? `${input.outcomes.length}` : "Optional"} defaultOpen={input.outcomes.length > 0}>
                <LineList id="f-outcomes" label="Outcome" values={input.outcomes} onChange={(v) => setField("outcomes", v)} addLabel="Add outcome" placeholder="Each event is processed exactly once" />
              </Disclosure>
              <Disclosure label="Constraints" hint={input.constraints.length ? `${input.constraints.length}` : "Optional"} defaultOpen={input.constraints.length > 0}>
                <LineList id="f-constraints" label="Constraint" values={input.constraints} onChange={(v) => setField("constraints", v)} addLabel="Add constraint" placeholder="Keep the handler signature unchanged" />
              </Disclosure>
              <Disclosure label="Out of scope" hint={input.outOfScope.length ? `${input.outOfScope.length}` : "Optional"} defaultOpen={input.outOfScope.length > 0}>
                <LineList id="f-out-of-scope" label="Out of scope item" values={input.outOfScope} onChange={(v) => setField("outOfScope", v)} addLabel="Add item" placeholder="Changing the retry schedule" />
              </Disclosure>
              <Disclosure label="Background" hint={input.background.trim() ? "" : "Optional"} defaultOpen={input.background.trim().length > 0}>
                <Field label="Background" htmlFor="f-background" help="Team, system or domain context that helps the task feel real. Synthetic details only.">
                  <Textarea id="f-background" rows={4} maxLength={3000} value={input.background} onChange={(e) => setField("background", e.target.value)} />
                </Field>
              </Disclosure>
            </div>
          </PanelSection>

          <PanelSection title="Time and candidate policy">
            <fieldset>
              <legend className="text-app-meta font-medium text-[var(--text-primary)]">Task time</legend>
              <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label="Task time">
                {presets.map((m) => {
                  const on = durationMode === "preset" && input.taskMinutes === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setCustomDuration(null);
                        setField("taskMinutes", m);
                      }}
                      className={cn(
                        "h-9 rounded-[8px] border px-3.5 text-[14px] font-medium transition-colors",
                        on ? "border-[var(--text-primary)] bg-[var(--surface-selected)] text-[var(--text-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
                      )}
                    >
                      {m} min
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={durationMode === "custom"}
                  onClick={() => {
                    const text = customDuration ?? String(Number.isFinite(input.taskMinutes) ? input.taskMinutes : 75);
                    setCustomDuration(text);
                    setField("taskMinutes", Number(text));
                  }}
                  className={cn(
                    "h-9 rounded-[8px] border px-3.5 text-[14px] font-medium transition-colors",
                    durationMode === "custom" ? "border-[var(--text-primary)] bg-[var(--surface-selected)] text-[var(--text-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]",
                  )}
                >
                  Custom
                </button>
              </div>
            </fieldset>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {durationMode === "custom" ? (
                <Field label="Custom task time (minutes)" htmlFor="f-task-minutes" help={`${registry.durations.limits.minTask} to ${registry.durations.limits.maxTask} minutes.`} error={fieldError("taskMinutes")}>
                  <Input
                    id="f-task-minutes"
                    inputMode="numeric"
                    value={customDuration ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
                      setCustomDuration(v);
                      setField("taskMinutes", v ? Number(v) : NaN);
                    }}
                  />
                </Field>
              ) : fieldError("taskMinutes") ? (
                <p className="text-[13px] text-[var(--fydell-risk)] sm:col-span-2">{fieldError("taskMinutes")}</p>
              ) : null}
              <Field
                label="Setup time (minutes)"
                htmlFor="f-setup-minutes"
                help={`${registry.durations.limits.minSetup} to ${registry.durations.limits.maxSetup} minutes for installing and running the starter. Not counted in task time.`}
                error={fieldError("setupMinutes")}
              >
                <Input
                  id="f-setup-minutes"
                  inputMode="numeric"
                  value={Number.isFinite(input.setupMinutes) ? String(input.setupMinutes) : ""}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
                    setField("setupMinutes", v ? Number(v) : NaN);
                  }}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="AI policy" htmlFor="f-ai-policy" error={fieldError("aiPolicy")}>
                <Combobox id="f-ai-policy" options={aiPolicyOptions} value={input.aiPolicy} onChange={(v) => setField("aiPolicy", v as AuthoringInput["aiPolicy"])} />
                {otherInput("aiPolicy", { long: true })}
              </Field>
              {input.simulation ? null : (
                <Field label="Starting material" htmlFor="f-material" error={fieldError("startingMaterial")}>
                  <Combobox id="f-material" options={materialOptions} value={input.startingMaterial} onChange={(v) => setField("startingMaterial", v as AuthoringInput["startingMaterial"])} />
                  {otherInput("startingMaterial")}
                </Field>
              )}
            </div>
          </PanelSection>
          </>
          )}
        </Panel>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-6" aria-label="Summary">
        <Panel>
          <PanelSection title="Summary">
            <div ref={summaryRef} tabIndex={-1} className="outline-none" aria-live="polite">
              {result ? (
                <dl className="grid gap-2 text-[14px]">
                  {result.summary.map((row) => (
                    <div key={row.label} className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
                      <dt className="text-[13px] text-[var(--text-tertiary)]">{row.label}</dt>
                      <dd className="min-w-0 break-words text-[var(--text-primary)]">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <StatusText tone="busy">Checking your selections</StatusText>
              )}
            </div>
            <div className="mt-4 grid gap-1 border-t border-[var(--border-subtle)] pt-3 text-[13px] leading-[1.5]">
              <p className="text-[var(--text-secondary)]">
                Checks run on: <span className="text-[var(--text-primary)]">{capabilities.execution.label}</span>
              </p>
              {capabilities.execution.available && !capabilities.execution.isolated ? (
                <p className="text-[var(--status-attention-ink)]">This runner is not isolated. Use it for local testing only.</p>
              ) : null}
              {!capabilities.execution.available ? <p className="text-[var(--status-attention-ink)]">Checks cannot run in this environment, so drafts cannot be published from here.</p> : null}
              {!capabilities.generation.available ? (
                <p className="text-[var(--status-attention-ink)]">Generation is not configured on this server. You can still upload your own starter, tests and reference solution.</p>
              ) : null}
            </div>
          </PanelSection>

          {result && !pending && (result.errors.length > 0 || result.conflicts.length > 0) ? (
            <PanelSection title="Needs attention">
              <ul className="grid gap-3">
                {[...result.errors, ...result.conflicts].map((issue, i) => (
                  <li key={`${issue.field}-${i}`} className="flex items-start gap-2 text-[14px] leading-[1.5]">
                    <StatusIcon tone="bad" className="mt-[3px]" />
                    <div className="min-w-0">
                      <p className="text-[var(--text-body)]">{issue.message}</p>
                      {issue.alternative ? (
                        <Button className="mt-1.5" size="sm" variant="secondary" onClick={() => applyAlternative(issue.field, issue.alternative!)}>
                          Use {labelOf(issue.field, issue.alternative)}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </PanelSection>
          ) : null}

          {shownClarifications.length > 0 ? (
            <PanelSection title="Questions" description="Answers go into the brief and tests.">
              <div className="grid gap-4">
                {shownClarifications.map((c) => {
                  const answer = input.answers[c.id] ?? "";
                  const done = answer.trim().length >= 8;
                  return (
                    <Field key={c.id} label={c.question} htmlFor={`q-${c.id}`} help={done ? "Answered." : c.why}>
                      <Textarea
                        id={`q-${c.id}`}
                        rows={2}
                        maxLength={600}
                        value={answer}
                        onChange={(e) => setInput((prev) => ({ ...prev, answers: { ...prev.answers, [c.id]: e.target.value } }))}
                      />
                    </Field>
                  );
                })}
              </div>
            </PanelSection>
          ) : null}

          {shownAssumptions.length > 0 ? (
            <PanelSection title="Assumptions to confirm" description="Confirm each one, or change the form so it no longer applies.">
              <ul className="grid gap-2.5">
                {shownAssumptions.map((a) => (
                  <li key={a.id}>
                    <label className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-[var(--text-body)]">
                      <input
                        type="checkbox"
                        className="mt-[3px] h-4 w-4 shrink-0"
                        checked={input.confirmedAssumptions.includes(a.id)}
                        onChange={(e) =>
                          setInput((prev) => ({
                            ...prev,
                            confirmedAssumptions: e.target.checked ? [...new Set([...prev.confirmedAssumptions, a.id])] : prev.confirmedAssumptions.filter((x) => x !== a.id),
                          }))
                        }
                      />
                      <span>{a.statement}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </PanelSection>
          ) : null}

          <PanelSection>
            {usesTemplate ? (
              <div className="grid gap-2">
                <p className="text-[14px] leading-[1.5] text-[var(--text-body)]">The reviewed template is used as published. Open it from the Library and attach it to a role.</p>
                <ButtonLink href="/app/employer/work-samples?tab=library" variant="primary">
                  Open the Library
                </ButtonLink>
              </div>
            ) : (
              <div className="grid gap-2">
                <FormError>{submitError}</FormError>
                {generationBlocked ? (
                  <Button variant="secondary" onClick={() => setField("startingMaterial", "uploaded")}>
                    Switch to Upload starter files
                  </Button>
                ) : null}
                <Button type="submit" variant="primary" disabled={!canSubmit} loading={submitting} aria-describedby="submit-reasons">
                  {uploadPath || asIs ? "Create draft" : "Generate draft"}
                </Button>
                <div id="submit-reasons">
                  {reasons.length ? (
                    <ul className="grid gap-1 text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                      {reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                      {asIs
                        ? "Copies the validated role model into a draft you can review, edit and publish."
                        : uploadPath
                        ? "Creates an empty draft. Add your starter, tests and reference solution, then run the checks."
                        : "Generation takes several minutes. You can leave this page; it continues on the server."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </PanelSection>
        </Panel>
        {fromDraft ? (
          <Banner className="mt-4" tone="neutral">
            Prefilled from an earlier draft. Generating creates a new draft; the earlier one stays in Drafts.
          </Banner>
        ) : null}
      </aside>
    </form>
  );
}