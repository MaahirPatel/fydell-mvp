"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { CAPABILITIES } from "@/lib/eng/authoring/registry";
import { Combobox } from "../Combobox";
import { LineList } from "../ui";
import type { ScenarioPackage } from "../types";
import { nextId, type Draft, type Edit } from "./model";

export function BriefEditor({ draft, edit }: { draft: Draft; edit: Edit }) {
  const { pkg } = draft;
  const b = pkg.brief;
  const setBrief = (patch: Partial<ScenarioPackage["brief"]>) => edit("brief", (d) => ({ ...d, pkg: { ...d.pkg, brief: { ...d.pkg.brief, ...patch } } }));
  const setPkg = (section: "brief" | "policy" | "timing", patch: (p: ScenarioPackage) => ScenarioPackage) => edit(section, (d) => ({ ...d, pkg: patch(d.pkg) }));
  const capOptions = CAPABILITIES.map((c) => ({ value: c.id, label: c.label, description: c.executable ? "Checked by tests" : "Judged by a reviewer" }));

  return (
    <div className="grid gap-6">
      <Panel>
        <PanelSection title="Brief" description="What candidates read first.">
          <div className="grid gap-4">
            <Field label="Title" htmlFor="b-title">
              <Input id="b-title" maxLength={120} value={b.title} onChange={(e) => setBrief({ title: e.target.value })} />
            </Field>
            <Field label="Summary" htmlFor="b-summary">
              <Textarea id="b-summary" rows={2} maxLength={400} value={b.summary} onChange={(e) => setBrief({ summary: e.target.value })} />
            </Field>
            <Field label="Context" htmlFor="b-context">
              <Textarea id="b-context" rows={5} maxLength={3000} value={b.context} onChange={(e) => setBrief({ context: e.target.value })} />
            </Field>
            <Field label="Task" htmlFor="b-task">
              <Textarea id="b-task" rows={5} maxLength={3000} value={b.task} onChange={(e) => setBrief({ task: e.target.value })} />
            </Field>
            <Field label="Required outcomes" htmlFor="b-outcomes">
              <LineList id="b-outcomes" label="Outcome" values={b.outcomes} onChange={(v) => setBrief({ outcomes: v })} addLabel="Add outcome" maxLength={400} />
            </Field>
            <Field label="Constraints" htmlFor="b-constraints">
              <LineList id="b-constraints" label="Constraint" values={b.constraints} onChange={(v) => setBrief({ constraints: v })} addLabel="Add constraint" maxLength={400} />
            </Field>
            <Field label="Out of scope" htmlFor="b-oos">
              <LineList id="b-oos" label="Out of scope item" values={b.outOfScope} onChange={(v) => setBrief({ outOfScope: v })} addLabel="Add item" maxLength={400} />
            </Field>
            <Field label="Optional extensions" htmlFor="b-ext" optional>
              <LineList id="b-ext" label="Extension" values={b.optionalExtensions} onChange={(v) => setBrief({ optionalExtensions: v })} max={6} addLabel="Add extension" maxLength={400} />
            </Field>
            <Field label="Interface" htmlFor="b-interface" help="Public modules, signatures and injected dependencies of the starter.">
              <Textarea id="b-interface" rows={6} maxLength={2000} className="font-mono text-[13px]" value={b.interface} onChange={(e) => setBrief({ interface: e.target.value })} />
            </Field>
          </div>
        </PanelSection>

        <PanelSection title="Acceptance criteria" description="Every test must map to one of these, and each one needs at least one test.">
          <ol className="grid gap-3">
            {pkg.acceptanceCriteria.map((ac, i) => (
              <li key={ac.id} className="grid gap-2 sm:grid-cols-[56px_minmax(0,1fr)_200px_auto] sm:items-start">
                <span className="pt-2.5 font-mono text-[13px] text-[var(--text-tertiary)]">{ac.id}</span>
                <Textarea
                  aria-label={`${ac.id} text`}
                  rows={2}
                  maxLength={400}
                  value={ac.text}
                  onChange={(e) =>
                    setPkg("brief", (p) => ({ ...p, acceptanceCriteria: p.acceptanceCriteria.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) }))
                  }
                />
                <Combobox
                  id={`ac-cap-${ac.id}`}
                  options={capOptions}
                  value={ac.capability}
                  onChange={(v) =>
                    setPkg("brief", (p) => ({
                      ...p,
                      acceptanceCriteria: p.acceptanceCriteria.map((x, j) => (j === i ? { ...x, capability: v as typeof x.capability } : x)),
                    }))
                  }
                />
                <Button
                  variant="quiet"
                  icon
                  aria-label={`Remove ${ac.id}`}
                  disabled={pkg.acceptanceCriteria.length <= 1}
                  onClick={() => setPkg("brief", (p) => ({ ...p, acceptanceCriteria: p.acceptanceCriteria.filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          {pkg.acceptanceCriteria.length < 10 ? (
            <Button
              className="mt-3"
              size="sm"
              variant="quiet"
              onClick={() =>
                setPkg("brief", (p) => ({
                  ...p,
                  acceptanceCriteria: [...p.acceptanceCriteria, { id: nextId("AC-", p.acceptanceCriteria.map((a) => a.id)), text: "", capability: p.config.capabilities[0] ?? "correctness" }],
                }))
              }
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add acceptance criterion
            </Button>
          ) : null}
        </PanelSection>

        <PanelSection title="Setup instructions">
          <LineList
            id="b-setup"
            label="Setup step"
            values={pkg.setupInstructions}
            max={8}
            onChange={(v) => setPkg("brief", (p) => ({ ...p, setupInstructions: v }))}
            addLabel="Add step"
            maxLength={400}
          />
          <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
            Test command: <code className="font-mono text-[var(--text-primary)]">{pkg.environment.testCommand || "Not set"}</code>
          </p>
        </PanelSection>
      </Panel>

      <Panel>
        <PanelSection title="Time">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Task time (minutes)" htmlFor="t-task" help="30 to 180 minutes.">
              <Input
                id="t-task"
                inputMode="numeric"
                value={Number.isFinite(pkg.environment.taskMinutes) ? String(pkg.environment.taskMinutes) : ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "").slice(0, 3);
                  setPkg("timing", (p) => ({ ...p, environment: { ...p.environment, taskMinutes: v ? Number(v) : NaN } }));
                }}
              />
            </Field>
            <Field label="Setup time (minutes)" htmlFor="t-setup" help="5 to 30 minutes. Not counted in task time.">
              <Input
                id="t-setup"
                inputMode="numeric"
                value={Number.isFinite(pkg.environment.setupMinutes) ? String(pkg.environment.setupMinutes) : ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
                  setPkg("timing", (p) => ({ ...p, environment: { ...p.environment, setupMinutes: v ? Number(v) : NaN } }));
                }}
              />
            </Field>
          </div>
        </PanelSection>

        <PanelSection title="Candidate policy">
          <div className="grid gap-4">
            <Field label="AI policy as candidates read it" htmlFor="p-ai">
              <Textarea
                id="p-ai"
                rows={3}
                maxLength={800}
                value={pkg.aiPolicy.candidateText}
                onChange={(e) => setPkg("policy", (p) => ({ ...p, aiPolicy: { ...p.aiPolicy, candidateText: e.target.value } }))}
              />
            </Field>
            <Field label="What candidates must submit" htmlFor="p-req">
              <LineList
                id="p-req"
                label="Requirement"
                values={pkg.submission.requirements}
                max={8}
                onChange={(v) => setPkg("policy", (p) => ({ ...p, submission: { ...p.submission, requirements: v } }))}
                addLabel="Add requirement"
                maxLength={400}
              />
            </Field>
            <fieldset>
              <legend className="text-app-meta font-medium text-[var(--text-primary)]">Handoff prompts</legend>
              <div className="mt-1.5 grid gap-3">
                {pkg.submission.handoffPrompts.map((h, i) => (
                  <div key={h.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                    <Input
                      aria-label={`Handoff prompt ${i + 1}`}
                      maxLength={120}
                      value={h.label}
                      onChange={(e) =>
                        setPkg("policy", (p) => ({
                          ...p,
                          submission: { ...p.submission, handoffPrompts: p.submission.handoffPrompts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) },
                        }))
                      }
                    />
                    <Input
                      aria-label={`Help for handoff prompt ${i + 1}`}
                      maxLength={300}
                      placeholder="Help text"
                      value={h.help}
                      onChange={(e) =>
                        setPkg("policy", (p) => ({
                          ...p,
                          submission: { ...p.submission, handoffPrompts: p.submission.handoffPrompts.map((x, j) => (j === i ? { ...x, help: e.target.value } : x)) },
                        }))
                      }
                    />
                    <Button
                      variant="quiet"
                      icon
                      aria-label={`Remove handoff prompt ${i + 1}`}
                      onClick={() => setPkg("policy", (p) => ({ ...p, submission: { ...p.submission, handoffPrompts: p.submission.handoffPrompts.filter((_, j) => j !== i) } }))}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                {pkg.submission.handoffPrompts.length < 6 ? (
                  <div>
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() =>
                        setPkg("policy", (p) => {
                          const taken = p.submission.handoffPrompts.map((h) => h.id);
                          const id = ["prompt_a", "prompt_b", "prompt_c", "prompt_d", "prompt_e", "prompt_f", "prompt_g"].find((x) => !taken.includes(x)) ?? "prompt_z";
                          return { ...p, submission: { ...p.submission, handoffPrompts: [...p.submission.handoffPrompts, { id, label: "", help: "" }] } };
                        })
                      }
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Add prompt
                    </Button>
                  </div>
                ) : null}
              </div>
            </fieldset>
            <Field label="Feedback policy" htmlFor="p-feedback" help="What candidates receive after submitting.">
              <Textarea id="p-feedback" rows={2} maxLength={800} value={pkg.feedbackPolicy} onChange={(e) => setPkg("policy", (p) => ({ ...p, feedbackPolicy: e.target.value }))} />
            </Field>
            <Field label="Interruptions" htmlFor="p-interrupt" optional>
              <Textarea id="p-interrupt" rows={2} maxLength={600} value={pkg.interruptionPolicy} onChange={(e) => setPkg("policy", (p) => ({ ...p, interruptionPolicy: e.target.value }))} />
            </Field>
            <Field label="Accommodations" htmlFor="p-acc" optional>
              <LineList id="p-acc" label="Accommodation" values={pkg.accommodations} max={8} onChange={(v) => setPkg("policy", (p) => ({ ...p, accommodations: v }))} addLabel="Add accommodation" maxLength={400} />
            </Field>
          </div>
        </PanelSection>
      </Panel>
    </div>
  );
}

export default BriefEditor;
