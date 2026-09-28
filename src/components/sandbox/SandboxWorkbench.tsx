"use client";

import { useEffect, useMemo, useState } from "react";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";
import type {
  AppliedAiConfig,
  AppliedAiEvalCase,
} from "@/lib/sim-engine/proof/sandbox/applied-ai-workspace";

type Action = (body: Record<string, unknown>) => void;

const CHECKS: Array<[keyof SandboxSessionView["progress"], string]> = [
  ["traceOpened", "Inspect failed trace"],
  ["baselineRun", "Run baseline"],
  ["configEdited", "Change executable config"],
  ["evalCaseEdited", "Change eval coverage"],
  ["architectureCommitted", "Commit architecture"],
  ["factReleased", "Receive LATENCY_001"],
  ["postFactRevision", "Revise after fact"],
  ["postFactEvalRun", "Rerun evaluation"],
  ["recommendationWritten", "Write recommendation"],
  ["submissionCompleted", "Submit episode"],
];

export function SandboxWorkbench({
  session,
  busy,
  onAction,
  onEnsure,
}: {
  session: SandboxSessionView | null;
  busy: boolean;
  onAction: Action;
  onEnsure: () => void;
}) {
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [config, setConfig] = useState<AppliedAiConfig | null>(session?.workspace.config ?? null);
  const [newCase, setNewCase] = useState<AppliedAiEvalCase>({
    id: "candidate-regression-01",
    title: "Candidate regression case",
    slice: "critical_authorization",
    enabled: true,
  });
  const [architecture, setArchitecture] = useState(session?.workspace.architectureDecision ?? "");
  const [recommendation, setRecommendation] = useState(session?.workspace.productionRecommendation ?? "");
  const [proposal, setProposal] = useState(session?.workspace.proposalCode ?? "");
  const [defense, setDefense] = useState(session?.defense?.answer ?? "");

  useEffect(() => {
    if (!session) return;
    const id = window.setTimeout(() => {
      setConfig(session.workspace.config);
      setArchitecture(session.workspace.architectureDecision);
      setRecommendation(session.workspace.productionRecommendation);
      setProposal(session.workspace.proposalCode);
    }, 0);
    return () => window.clearTimeout(id);
  }, [session]);

  const resource = useMemo(
    () => session?.fixture.resources.find((item) => item.id === selectedResource) ?? null,
    [selectedResource, session],
  );

  if (!session) {
    return (
      <section className="mx-auto max-w-[720px] py-16">
        <p className="text-app-meta uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Candidate 01 · Applied AI Engineer</p>
        <h1 className="mt-3 text-app-page">Verify remaining proof</h1>
        <p className="mt-3 text-app-body text-[var(--text-secondary)]">
          Start an isolated 24-hour sandbox. The runtime is deterministic and synthetic; it does not execute arbitrary proposal code.
        </p>
        <button type="button" onClick={onEnsure} className="mt-6 h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-4 text-app-body font-medium text-[var(--control-solid-ink)]">
          Create verification workspace
        </button>
      </section>
    );
  }

  const active = session.step === "active";
  const canEvaluate = active && session.progress.traceOpened;
  const canCommit =
    active &&
    session.progress.traceOpened &&
    session.progress.baselineRun &&
    session.progress.configEdited &&
    session.progress.evalCaseEdited &&
    !session.progress.architectureCommitted;

  function openResource(resourceId: string, kind: string) {
    setSelectedResource(resourceId);
    onAction({
      type: kind === "trace" ? "open_trace" : "open_resource",
      resourceId,
      idempotencyKey: `open:${resourceId}`,
    });
  }

  return (
    <div className="-mx-2 lg:-mx-4">
      <header className="mb-4 flex flex-wrap items-end gap-3 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <p className="text-app-meta text-[var(--text-tertiary)]">
            Candidate 01 · Applied AI Engineer · {session.episodeStage.replaceAll("_", " ")}
          </p>
          <h1 className="mt-1 text-app-page">{session.fixture.simulationTitle}</h1>
        </div>
        <p className="ml-auto text-app-meta text-[var(--text-secondary)]">Autosaved · workspace v{session.revision}</p>
      </header>

      <div className="mb-4 border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-app-meta text-[var(--text-secondary)]">
        Honest runtime boundary: supported configuration and eval cases execute against stable synthetic fixtures. Proposal code is saved but never executed. No shell, network, packages, or paid model calls.
      </div>

      {session.step === "invited" ? (
        <button type="button" disabled={busy} onClick={() => onAction({ type: "start" })} className="mb-4 h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-4 text-app-body font-medium text-[var(--control-solid-ink)]">
          Start candidate work
        </button>
      ) : null}

      <div className="grid min-h-[650px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-raised)] xl:grid-cols-[250px_minmax(420px,1fr)_350px]">
        <aside className="border-b border-[var(--border-subtle)] xl:border-b-0 xl:border-r">
          <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
            <p className="text-app-section">Task & resources</p>
            <p className="mt-1 text-app-meta text-[var(--text-secondary)]">Targets PR-AI-04/05/07/08</p>
          </div>
          <div className="py-1">
            {session.fixture.resources.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openResource(item.id, item.kind)}
                className={`block w-full border-b border-[var(--border-subtle)] px-3 py-2.5 text-left ${
                  selectedResource === item.id ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                <span className="block text-app-body font-medium">{item.title}</span>
                <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">{item.id}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border-subtle)] px-3 py-3">
            <p className="text-app-meta font-medium text-[var(--text-secondary)]">Required action state</p>
            <ol className="mt-2 space-y-1.5">
              {CHECKS.map(([key, label]) => (
                <li key={key} className="flex gap-2 text-app-meta text-[var(--text-secondary)]">
                  <span className={session.progress[key] ? "text-[var(--fydell-good)]" : "text-[var(--text-tertiary)]"}>
                    {session.progress[key] ? "●" : "○"}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <main className="min-w-0 border-b border-[var(--border-subtle)] xl:border-b-0 xl:border-r">
          {resource ? (
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-3">
              <p className="text-app-meta text-[var(--text-tertiary)]">{resource.id}</p>
              <p className="mt-1 text-app-body text-[var(--text-secondary)]">{resource.body}</p>
            </div>
          ) : (
            <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-app-body text-[var(--text-secondary)]">
              Open a failed trace, then run the baseline.
            </div>
          )}

          <section className="border-b border-[var(--border-subtle)] px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-app-section">Executable workflow config</h2>
              <button
                type="button"
                disabled={busy || !active || !session.progress.baselineRun || !config}
                onClick={() => config && onAction({ type: "edit_config", config, idempotencyKey: `config:${session.revision}` })}
                className="h-8 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-app-meta font-medium disabled:opacity-40"
              >
                Save config mutation
              </button>
            </div>
            {config ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Select label="Routing" value={config.routing} options={["model", "deterministic"]} onChange={(routing) => setConfig({ ...config, routing: routing as AppliedAiConfig["routing"] })} />
                <Select label="Model profile" value={config.model} options={["quality", "balanced", "fast"]} onChange={(model) => setConfig({ ...config, model: model as AppliedAiConfig["model"] })} />
                <NumberField label="Model calls" value={config.modelCalls} min={1} max={3} onChange={(modelCalls) => setConfig({ ...config, modelCalls })} />
                <NumberField label="Context tokens" value={config.contextTokens} min={1000} max={16000} step={1000} onChange={(contextTokens) => setConfig({ ...config, contextTokens })} />
                <Select label="Retry policy" value={config.retryMode} options={["all_errors", "transient_only", "none"]} onChange={(retryMode) => setConfig({ ...config, retryMode: retryMode as AppliedAiConfig["retryMode"] })} />
                <NumberField label="Max retries" value={config.maxRetries} min={0} max={4} onChange={(maxRetries) => setConfig({ ...config, maxRetries })} />
                <CheckField label="Semantic validation" checked={config.semanticValidation} onChange={(semanticValidation) => setConfig({ ...config, semanticValidation })} />
                <CheckField label="Stable idempotency key" checked={config.idempotencyKey} onChange={(idempotencyKey) => setConfig({ ...config, idempotencyKey })} />
                <CheckField label="Human review when information is missing" checked={config.humanReviewOnMissingInfo} onChange={(humanReviewOnMissingInfo) => setConfig({ ...config, humanReviewOnMissingInfo })} />
              </div>
            ) : null}
          </section>

          <section className="border-b border-[var(--border-subtle)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-app-section">Evaluation case mutation</h2>
              <button
                type="button"
                disabled={busy || !active || !session.progress.baselineRun}
                onClick={() => onAction({ type: "upsert_eval_case", evalCase: newCase, idempotencyKey: `eval-case:${session.revision}` })}
                className="h-8 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-app-meta font-medium disabled:opacity-40"
              >
                Add / update case
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]">
              <input value={newCase.title} onChange={(event) => setNewCase({ ...newCase, title: event.target.value })} className="h-9 border border-[var(--border-default)] bg-[var(--surface-panel)] px-2.5 text-app-body outline-none" aria-label="Evaluation case title" />
              <select value={newCase.slice} onChange={(event) => setNewCase({ ...newCase, slice: event.target.value as AppliedAiEvalCase["slice"] })} className="h-9 border border-[var(--border-default)] bg-[var(--surface-panel)] px-2.5 text-app-body">
                <option value="critical_authorization">Critical authorization</option>
                <option value="malformed_output">Malformed output</option>
                <option value="duplicate_write">Duplicate write</option>
                <option value="missing_information">Missing information</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </section>

          <section className="border-b border-[var(--border-subtle)] px-4 py-4">
            <h2 className="text-app-section">Architecture decision</h2>
            <textarea rows={3} value={architecture} onChange={(event) => setArchitecture(event.target.value)} className="mt-2 w-full resize-y border border-[var(--border-default)] bg-[var(--surface-panel)] p-2.5 text-app-body outline-none" />
            <button type="button" disabled={busy || !canCommit} onClick={() => onAction({ type: "commit_architecture", architectureDecision: architecture, idempotencyKey: `architecture:${session.revision}` })} className="mt-2 h-8 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-app-meta font-medium text-[var(--control-solid-ink)] disabled:opacity-40">
              Commit approach & release fact
            </button>
          </section>

          <section className="px-4 py-4">
            <h2 className="text-app-section">Proposal-only code</h2>
            <p className="mt-1 text-app-meta text-[var(--fydell-changed)]">Saved for review, never executed, and does not affect metrics.</p>
            <textarea rows={4} value={proposal} onChange={(event) => setProposal(event.target.value)} onBlur={() => onAction({ type: "save_proposal", proposalCode: proposal, idempotencyKey: `proposal:${session.revision}` })} className="mt-2 w-full resize-y border border-[var(--border-default)] bg-[var(--surface-panel)] p-2.5 font-mono text-app-meta leading-5 outline-none" />
          </section>
        </main>

        <aside className="min-w-0">
          <div className="border-b border-[var(--border-subtle)] px-3 py-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-app-section">Runtime & evaluation</h2>
              <button type="button" disabled={busy || !canEvaluate || (session.progress.factReleased && !session.progress.postFactRevision)} onClick={() => onAction({ type: "run_eval", idempotencyKey: `eval:${session.revision}` })} className="h-8 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-app-meta font-medium text-[var(--control-solid-ink)] disabled:opacity-40">
                {session.progress.baselineRun ? "Rerun evaluation" : "Run baseline"}
              </button>
            </div>
          </div>

          {session.constraintDelivered ? (
            <div className="border-b border-[var(--border-default)] bg-[var(--surface-selected)] px-3 py-3">
              <p className="text-app-meta font-medium text-[var(--fydell-changed)]">LATENCY_001 · released once</p>
              <p className="mt-1 text-app-body text-[var(--text-secondary)]">{session.fixture.changedFact.body}</p>
            </div>
          ) : null}

          <Metrics current={session.latestEval} baseline={session.baselineEval} />

          <div className="border-t border-[var(--border-subtle)] px-3 py-3">
            <h2 className="text-app-section">Trace & event ledger</h2>
            <ol className="mt-2 max-h-[190px] overflow-auto">
              {session.events.slice(-12).reverse().map((event) => (
                <li key={event.id} className="border-b border-[var(--border-subtle)] py-1.5 text-app-meta text-[var(--text-secondary)]">
                  <span className="mr-2 tabular-nums text-[var(--text-tertiary)]">{event.sequence}</span>
                  {event.eventType}
                </li>
              ))}
            </ol>
          </div>

          {session.progress.postFactEvalRun && !session.progress.submissionCompleted ? (
            <div className="border-t border-[var(--border-subtle)] px-3 py-3">
              <h2 className="text-app-section">Production recommendation</h2>
              <textarea rows={4} value={recommendation} onChange={(event) => setRecommendation(event.target.value)} className="mt-2 w-full resize-y border border-[var(--border-default)] bg-[var(--surface-panel)] p-2.5 text-app-body outline-none" />
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={busy} onClick={() => onAction({ type: "write_recommendation", recommendation, idempotencyKey: `recommendation:${session.revision}` })} className="h-8 border border-[var(--border-strong)] px-3 text-app-meta font-medium">
                  Save recommendation
                </button>
                <button type="button" disabled={busy || !session.progress.recommendationWritten} onClick={() => onAction({ type: "submit_episode", idempotencyKey: `submit:${session.revision}` })} className="h-8 bg-[var(--control-solid)] px-3 text-app-meta font-medium text-[var(--control-solid-ink)] disabled:opacity-40">
                  Submit
                </button>
              </div>
            </div>
          ) : null}

          {session.defense && (session.step === "defense_ready" || session.step === "defense_in_progress") ? (
            <form className="border-t border-[var(--border-subtle)] px-3 py-3" onSubmit={(event) => { event.preventDefault(); onAction({ type: "submit_defense", answer: defense }); }}>
              <h2 className="text-app-section">Defense</h2>
              <p className="mt-2 text-app-body text-[var(--text-secondary)]">{session.defense.prompt}</p>
              <textarea rows={3} value={defense} onChange={(event) => setDefense(event.target.value)} className="mt-2 w-full border border-[var(--border-default)] bg-[var(--surface-panel)] p-2.5 text-app-body" />
              <button type="submit" className="mt-2 h-8 bg-[var(--control-solid)] px-3 text-app-meta font-medium text-[var(--control-solid-ink)]">Submit defense</button>
            </form>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Metrics({ current, baseline }: { current: SandboxSessionView["latestEval"]; baseline: SandboxSessionView["baselineEval"] }) {
  if (!current) return <p className="px-3 py-5 text-app-body text-[var(--text-secondary)]">No evaluation result yet.</p>;
  const rows = [
    ["Quality", `${current.quality}%`, baseline ? `${baseline.quality}%` : "—"],
    ["Critical slice", `${current.criticalSliceQuality}%`, baseline ? `${baseline.criticalSliceQuality}%` : "—"],
    ["Schema failures", `${current.schemaFailureRate}%`, baseline ? `${baseline.schemaFailureRate}%` : "—"],
    ["Semantic failures", `${current.semanticFailureRate}%`, baseline ? `${baseline.semanticFailureRate}%` : "—"],
    ["Duplicate side effects", `${current.duplicateSideEffectRate}%`, baseline ? `${baseline.duplicateSideEffectRate}%` : "—"],
    ["p50 / p95", `${current.p50LatencySeconds}s / ${current.p95LatencySeconds}s`, baseline ? `${baseline.p50LatencySeconds}s / ${baseline.p95LatencySeconds}s` : "—"],
    ["Cost / plan", `$${current.estimatedCostDollars}`, baseline ? `$${baseline.estimatedCostDollars}` : "—"],
  ];
  return (
    <div className="px-3 py-3">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-app-meta text-[var(--text-tertiary)]"><span>Metric</span><span>Current</span><span>Baseline</span></div>
      {rows.map(([label, value, before]) => <div key={label} className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-[var(--border-subtle)] py-2 text-app-meta"><span>{label}</span><span className="tabular-nums">{value}</span><span className="tabular-nums text-[var(--text-tertiary)]">{before}</span></div>)}
      <ul className="mt-3 space-y-1">{current.explanations.map((item) => <li key={item} className="text-app-meta text-[var(--text-secondary)]">• {item}</li>)}</ul>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="text-app-meta text-[var(--text-secondary)]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block h-9 w-full border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 text-app-body">{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="text-app-meta text-[var(--text-secondary)]">{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block h-9 w-full border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 text-app-body" /></label>;
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-9 items-center gap-2 text-app-body text-[var(--text-secondary)]"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}
