"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { TRAIT_IDS, TRAIT_LABELS, type TraitId } from "@/lib/fde/evidence/traits";
import { getFydellTemplate } from "@/lib/fde/templates/catalog";

type ValidationFlag = { code: string; severity: "info" | "warning" | "blocking"; message: string };

type Preview = {
  companyName: string;
  industry: string;
  ask: string;
  competencyCoverage: { traitId: TraitId; label: string; coverage: number }[];
  requestedDurationMinutes: number;
  plannedDurationMinutes: number;
  trapsIncluded: { id: string; title: string; kind: string; estimatedMinutes: number }[];
  curveballsIncluded: { key: string; label: string }[];
  validationFlags: ValidationFlag[];
  maturity: "draft" | "auto_validated";
  maturityLabel: string;
  topWeightedTraits: { traitId: TraitId; label: string; weight: number }[];
  difficultyScore?: number;
  utilityScore?: number;
  geometricQuality?: number;
  publishGate?: { gate: "publishable" | "needs_revision"; reasons: string[] };
  durationEstimate?: {
    min: number;
    max: number;
    criticalPathMinutes: number;
    estimatedMinutes: number;
  };
  designQualityLogdet?: number;
};

type GenerateResponse = {
  seed: string;
  preview: Preview;
  filesPreview: Record<string, string>;
  maturity?: string;
  fallbackMessage?: string;
};

type StudioStep = "role" | "competencies" | "scenario" | "ai" | "validate";

const STEPS: { id: StudioStep; label: string }[] = [
  { id: "role", label: "Role" },
  { id: "competencies", label: "Competencies" },
  { id: "scenario", label: "Scenario" },
  { id: "ai", label: "AI policy" },
  { id: "validate", label: "Generate" },
];

const SCENARIO_FAMILIES = [
  {
    id: "deployment_recovery",
    label: "Enterprise deployment recovery",
    industry: "saas",
    ask: "A newly deployed analytics workflow returns incomplete results after a configuration change. Diagnose safely, verify, and communicate.",
  },
  {
    id: "data_quality",
    label: "Data-quality incident",
    industry: "logistics",
    ask: "We need better visibility into shipment delays.",
  },
  {
    id: "integration_design",
    label: "Integration design",
    industry: "fintech",
    ask: "Translate an ambiguous customer integration ask into a plan with tradeoffs and risk controls.",
  },
  {
    id: "ai_workflow",
    label: "AI workflow failure",
    industry: "saas",
    ask: "An AI-assisted workflow produces plausible but incorrect outputs — find the layer that broke.",
  },
  {
    id: "executive_escalation",
    label: "Executive escalation",
    industry: "healthcare",
    ask: "A technically solvable issue is complicated by deadline pressure and conflicting stakeholder demands.",
  },
] as const;

const DEFAULT_WEIGHT = 50;

const SEVERITY_STYLE: Record<ValidationFlag["severity"], string> = {
  info: "text-white/45",
  warning: "text-[#F5C56B]",
  blocking: "text-[#fda4b0]",
};

const GENERATE_STAGES = [
  "Building role blueprint",
  "Planning evidence coverage",
  "Constructing scenario world",
  "Generating artifacts",
  "Creating evidence rules",
  "Running consistency checks",
] as const;

function coverageColor(coverage: number): string {
  if (coverage >= 0.7) return "bg-[#8EE4B8]";
  if (coverage >= 0.4) return "bg-[#F5C56B]";
  return "bg-white/20";
}

export default function GenerateFdeSimulationPage() {
  const router = useRouter();
  const [step, setStep] = useState<StudioStep>("role");

  const [title, setTitle] = useState("Forward Deployed Engineer — work sample");
  const [company, setCompany] = useState("");
  const [seniority, setSeniority] = useState("mid-level");
  const [industry, setIndustry] = useState("saas");
  const [scenarioFamily, setScenarioFamily] = useState<string>("deployment_recovery");
  const [ask, setAsk] = useState<string>(SCENARIO_FAMILIES[0].ask);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [aiPolicy, setAiPolicy] = useState<"allowed_observed" | "disclose" | "episode_restricted">(
    "allowed_observed"
  );
  const [skillWeights, setSkillWeights] = useState<Record<TraitId, number>>(() => {
    const init = {} as Record<TraitId, number>;
    for (const id of TRAIT_IDS) init[id] = DEFAULT_WEIGHT;
    return init;
  });
  const [criticalTraits, setCriticalTraits] = useState<Partial<Record<TraitId, boolean>>>({
    data_integrity_vigilance: true,
    elicitation: true,
    verification_discipline: true,
  });

  const [seed, setSeed] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const templateId = new URLSearchParams(window.location.search).get("template");
    if (!templateId) return;
    const template = getFydellTemplate(templateId);
    if (!template) return;
    setTitle(template.title);
    setSeniority(template.seniority);
    setDurationMinutes(template.durationMinutes);
    setIndustry(template.intake.industry);
    setScenarioFamily(template.scenarioFamily);
    setAsk(template.intake.objective);
    const policy = template.intake.aiPolicy;
    if (policy === "allowed_observed" || policy === "disclose" || policy === "episode_restricted") {
      setAiPolicy(policy);
    }
    if (template.intake.skillWeights) {
      setSkillWeights((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(template.intake.skillWeights || {})) {
          next[k as TraitId] = v;
        }
        return next;
      });
    }
    if (template.intake.criticalTraits?.length) {
      const crit: Partial<Record<TraitId, boolean>> = {};
      for (const id of template.intake.criticalTraits) crit[id] = true;
      setCriticalTraits(crit);
    }
  }, []);

  const requestBody = useMemo(
    () => ({
      title,
      objective: ask,
      customerContext: [
        company ? `Employer: ${company}` : "",
        `Seniority: ${seniority}`,
        `Scenario family: ${scenarioFamily}`,
        `AI policy: ${aiPolicy}`,
        `Critical traits: ${TRAIT_IDS.filter((id) => criticalTraits[id]).join(", ") || "none"}`,
      ]
        .filter(Boolean)
        .join("\n"),
      industry,
      durationMinutes,
      skillWeights,
      aiPolicy,
      criticalTraits: TRAIT_IDS.filter((id) => criticalTraits[id]),
    }),
    [title, ask, company, industry, durationMinutes, skillWeights, seniority, scenarioFamily, aiPolicy, criticalTraits]
  );

  function applyFamily(id: string) {
    const family = SCENARIO_FAMILIES.find((f) => f.id === id);
    if (!family) return;
    setScenarioFamily(id);
    setIndustry(family.industry);
    setAsk(family.ask);
  }

  function useFdeDefaults() {
    setTitle("Forward Deployed Engineer — work sample");
    setSeniority("mid-level");
    setDurationMinutes(30);
    applyFamily("deployment_recovery");
    setAiPolicy("allowed_observed");
    const weights = {} as Record<TraitId, number>;
    for (const id of TRAIT_IDS) weights[id] = DEFAULT_WEIGHT;
    weights.data_integrity_vigilance = 80;
    weights.elicitation = 75;
    weights.verification_discipline = 75;
    weights.communication_translation = 65;
    setSkillWeights(weights);
  }

  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    setGenerating(true);
    setError(null);
    setStageIndex(0);
    setStep("validate");

    // Real staged progress: advance only after each awaitable chunk of work.
    // Stages 0–4 are local prep; stage 5 is the compile request itself.
    for (let i = 0; i < GENERATE_STAGES.length - 1; i++) {
      setStageIndex(i);
      await new Promise((r) => setTimeout(r, 180));
    }
    setStageIndex(GENERATE_STAGES.length - 1);

    try {
      const res = await fetch("/api/employer/simulations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compile", ...requestBody, seed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate simulation");
      setSeed(data.seed);
      setResult({
        seed: data.seed,
        preview: data.preview,
        filesPreview: data.filesPreview,
        maturity: data.maturity,
        fallbackMessage:
          data.maturity === "draft"
            ? "Generated from the validated FDE pilot template with your role configuration."
            : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function saveAsMissionDraft() {
    if (!seed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/simulations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_mission", ...requestBody, seed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save simulation draft");
      router.push(`/app/employer/missions/${data.mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  const preview = result?.preview;
  const publishBlocked =
    preview?.publishGate?.gate === "needs_revision" ||
    (preview?.validationFlags || []).some((f) => f.severity === "blocking");

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Simulation studio
          </p>
          <h1
            className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[30px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            Generate an FDE simulation
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-white/50">
            Configure what matters for any company&apos;s FDE hire. Compiles a constrained,
            editable measurement environment — not freeform text.
          </p>
        </div>
        <button
          type="button"
          onClick={useFdeDefaults}
          className="h-9 rounded-[8px] border border-white/15 px-3 text-[12px] text-white/70 hover:bg-white/[0.04]"
        >
          Use FDE defaults
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Left steps */}
        <nav className="rounded-[12px] border border-white/[0.08] bg-[#0A0C11]/85 p-3" aria-label="Studio steps">
          <ol className="space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={
                    "flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[13px] transition-colors " +
                    (step === s.id
                      ? "bg-white/[0.07] text-white"
                      : "text-white/50 hover:bg-white/[0.03] hover:text-white/80")
                  }
                >
                  <span className="tabular-nums text-white/35">{i + 1}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Center canvas */}
        <div className="min-w-0 rounded-[12px] border border-white/[0.08] bg-[#0A0C11]/85 p-5">
          {step === "role" && (
            <div className="grid gap-4">
              <label className="block">
                <span className="text-[13px] font-medium text-white/66">Role title</span>
                <input
                  className="platform-input mt-1.5"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] font-medium text-white/66">Seniority</span>
                  <select
                    className="platform-input mt-1.5"
                    value={seniority}
                    onChange={(e) => setSeniority(e.target.value)}
                  >
                    <option value="early-career">Early-career</option>
                    <option value="mid-level">Mid-level</option>
                    <option value="senior">Senior</option>
                    <option value="staff">Staff</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[13px] font-medium text-white/66">Duration</span>
                  <select
                    className="platform-input mt-1.5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  >
                    {[20, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-[13px] font-medium text-white/66">
                  Your company <span className="text-white/35">(context only)</span>
                </span>
                <input
                  className="platform-input mt-1.5"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Any company name"
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep("competencies")}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === "competencies" && (
            <div>
              <p className="text-[12.5px] text-white/50">
                Weights determine emphasis. Critical traits require stronger coverage before publish.
              </p>
              <div className="mt-4 grid gap-3">
                {TRAIT_IDS.map((id) => (
                  <div key={id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <label className="block min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12.5px] text-white/75">{TRAIT_LABELS[id]}</span>
                        <span className="tabular-nums text-[11px] text-white/40">{skillWeights[id]}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={skillWeights[id]}
                        onChange={(e) =>
                          setSkillWeights((prev) => ({ ...prev, [id]: Number(e.target.value) }))
                        }
                        className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#3B5BFF]"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-white/50">
                      <input
                        type="checkbox"
                        checked={Boolean(criticalTraits[id])}
                        onChange={(e) =>
                          setCriticalTraits((prev) => ({ ...prev, [id]: e.target.checked }))
                        }
                      />
                      Critical
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-between">
                <button type="button" onClick={() => setStep("role")} className="text-[13px] text-white/50">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("scenario")}
                  className="inline-flex h-10 items-center rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "scenario" && (
            <div className="grid gap-4">
              <fieldset>
                <legend className="text-[13px] font-medium text-white/66">Scenario family</legend>
                <div className="mt-2 grid gap-2">
                  {SCENARIO_FAMILIES.map((f) => (
                    <label
                      key={f.id}
                      className={
                        "flex cursor-pointer gap-3 rounded-[10px] border px-3 py-2.5 text-[13px] " +
                        (scenarioFamily === f.id
                          ? "border-[#3B5BFF]/40 bg-[#3B5BFF]/10 text-white"
                          : "border-white/10 text-white/65 hover:bg-white/[0.03]")
                      }
                    >
                      <input
                        type="radio"
                        name="family"
                        checked={scenarioFamily === f.id}
                        onChange={() => applyFamily(f.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{f.label}</span>
                        <span className="mt-0.5 block text-[12px] text-white/45">{f.ask}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="text-[13px] font-medium text-white/66">Customer ask</span>
                <textarea
                  className="platform-input mt-1.5 min-h-[88px] resize-y"
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-white/66">Industry</span>
                <select
                  className="platform-input mt-1.5"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="saas">Enterprise analytics / SaaS</option>
                  <option value="logistics">Logistics</option>
                  <option value="fintech">Fintech</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="manufacturing">Manufacturing</option>
                </select>
              </label>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("competencies")}
                  className="text-[13px] text-white/50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep("ai")}
                  className="inline-flex h-10 items-center rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "ai" && (
            <div className="grid gap-4">
              <p className="text-[13px] text-white/55">
                Fydell evaluates framing, verification, integration, and reliance — not whether AI
                was used.
              </p>
              {(
                [
                  ["allowed_observed", "AI allowed in embedded assistant (default)"],
                  ["disclose", "AI allowed externally; candidate must disclose usage"],
                  ["episode_restricted", "No AI for a specific verification episode"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-white/10 px-3 py-2.5 text-[13px] text-white/75"
                >
                  <input
                    type="radio"
                    name="ai"
                    checked={aiPolicy === value}
                    onChange={() => setAiPolicy(value)}
                    className="mt-1"
                  />
                  {label}
                </label>
              ))}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep("scenario")}
                  className="text-[13px] text-white/50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => generate()}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#3B5BFF] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Generate simulation
                </button>
              </div>
            </div>
          )}

          {step === "validate" && (
            <div>
              {generating && (
                <div aria-live="polite">
                  <p className="text-[13px] text-white/70">Compiling measurement environment…</p>
                  <ul className="mt-3 space-y-1.5">
                    {GENERATE_STAGES.map((label, i) => (
                      <li
                        key={label}
                        className={
                          "text-[12.5px] " +
                          (i < stageIndex
                            ? "text-[#8EE4B8]"
                            : i === stageIndex
                              ? "text-white"
                              : "text-white/30")
                        }
                      >
                        {i < stageIndex ? "✓" : i === stageIndex ? "…" : "○"} {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-3 text-[13px] text-[#fda4b0]">
                  {error}
                </p>
              )}

              {result && preview && !generating && (
                <div className="space-y-4">
                  {result.fallbackMessage && (
                    <p className="rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/60">
                      {result.fallbackMessage}
                    </p>
                  )}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">
                      Candidate-facing world
                    </p>
                    <h2 className="mt-1 text-[18px] text-white" style={{ fontWeight: 560 }}>
                      {preview.companyName}
                    </h2>
                    <p className="mt-1 text-[13px] text-white/60">{preview.ask}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">Episodes</p>
                    <ul className="mt-1.5 space-y-1 text-[12.5px] text-white/70">
                      {preview.trapsIncluded.map((t) => (
                        <li key={t.id}>
                          · {t.title}{" "}
                          <span className="text-white/35">({t.estimatedMinutes} min)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {preview.curveballsIncluded.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">
                        Curveball
                      </p>
                      <ul className="mt-1.5 text-[12.5px] text-white/70">
                        {preview.curveballsIncluded.map((c) => (
                          <li key={c.key}>· {c.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={saveAsMissionDraft}
                      disabled={saving}
                      className="inline-flex h-11 items-center rounded-[10px] bg-[#F1F2F4] px-5 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
                    >
                      {saving
                        ? "Saving…"
                        : publishBlocked
                          ? "Save draft (publish blocked until fixed)"
                          : "Save & open simulation"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeed(null);
                        setResult(null);
                        generate();
                      }}
                      className="h-11 rounded-[10px] border border-white/15 px-4 text-[13px] text-white/70"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}

              {!generating && !result && (
                <button
                  type="button"
                  onClick={() => generate()}
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#3B5BFF] px-5 text-[13px] font-semibold text-white"
                >
                  Generate simulation
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right quality panel */}
        <aside className="rounded-[12px] border border-white/[0.08] bg-[#0A0C11]/85 p-4 lg:sticky lg:top-4 lg:self-start">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">
            Simulation quality
          </p>
          <p className="mt-1 text-[12px] text-white/45">
            Updates from the last compile. Design heuristics — not validated science.
          </p>

          {preview ? (
            <div className="mt-4 space-y-4">
              <div
                className={`rounded-[8px] border px-3 py-2 ${
                  preview.publishGate?.gate === "publishable"
                    ? "border-[#8EE4B8]/30 bg-[#8EE4B8]/[0.06]"
                    : "border-[#F5C56B]/30 bg-[#F5C56B]/[0.06]"
                }`}
              >
                <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">Publish gate</p>
                <p className="mt-0.5 text-[13px] text-white/90">
                  {preview.publishGate?.gate === "publishable" ? "Publishable" : "Needs revision"}
                </p>
                {(preview.publishGate?.reasons || []).slice(0, 3).map((r) => (
                  <p key={r} className="mt-1 text-[11px] leading-snug text-[#F5C56B]">
                    {r}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-[11px] text-white/40">Maturity</p>
                <p className="mt-0.5 text-[13px] text-white/85">{preview.maturityLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <p className="text-[11px] text-white/40">Difficulty</p>
                  <p className="text-white/85 tabular-nums">
                    {preview.difficultyScore != null
                      ? `${Math.round(preview.difficultyScore * 100)}% · expert prior`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-white/40">Utility U(s)</p>
                  <p className="text-white/85 tabular-nums">
                    {preview.utilityScore != null ? preview.utilityScore.toFixed(2) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-white/40">Quality Q</p>
                  <p className="text-white/85 tabular-nums">
                    {preview.geometricQuality != null ? preview.geometricQuality.toFixed(1) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-white/40">Design logdet</p>
                  <p className="text-white/85 tabular-nums">
                    {preview.designQualityLogdet != null
                      ? preview.designQualityLogdet.toFixed(3)
                      : "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-white/40">Duration (CPM)</p>
                <p className="mt-0.5 text-[13px] text-white/85">
                  {preview.durationEstimate
                    ? `${preview.durationEstimate.estimatedMinutes} min est · path ${preview.durationEstimate.criticalPathMinutes} · range ${preview.durationEstimate.min}–${preview.durationEstimate.max}`
                    : `${preview.plannedDurationMinutes} min planned`}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">
                  Measurement blueprint
                </p>
                <ul className="mt-2 space-y-1.5">
                  {preview.competencyCoverage.map((c) => (
                    <li key={c.traitId} className="flex items-center gap-2">
                      <span className="w-[110px] shrink-0 truncate text-[11px] text-white/55">
                        {c.label}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                        <span
                          className={`block h-full rounded-full ${coverageColor(c.coverage)}`}
                          style={{ width: `${Math.round(c.coverage * 100)}%` }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {preview.validationFlags.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">Findings</p>
                  <ul className="mt-1.5 space-y-1">
                    {preview.validationFlags.slice(0, 8).map((f) => (
                      <li
                        key={f.code}
                        className={`text-[11.5px] leading-snug ${SEVERITY_STYLE[f.severity]}`}
                      >
                        {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-[12.5px] leading-relaxed text-white/45">
              Generate to see coverage, difficulty, utility, design quality, duration, and the
              publish gate for this configuration.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
