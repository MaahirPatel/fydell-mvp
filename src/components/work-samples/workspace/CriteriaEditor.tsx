"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { CAPABILITIES } from "@/lib/eng/authoring/registry";
import { Combobox } from "../Combobox";
import { Disclosure } from "../ui";
import type { RubricCriterion } from "../types";
import { nextId, type Draft, type Edit } from "./model";

const TEXT_FIELDS: Array<{ key: "whyItMatters" | "observableEvidence" | "insufficientEvidence" | "limitations" | "candidateExplanation"; label: string; help?: string }> = [
  { key: "whyItMatters", label: "Why it matters" },
  { key: "observableEvidence", label: "Observable evidence", help: "What a reviewer can point to in the code, tests or handoff." },
  { key: "insufficientEvidence", label: "When evidence is insufficient", help: "When to record Insufficient evidence instead of a judgment." },
  { key: "limitations", label: "Limitations", help: "What this criterion cannot tell you." },
  { key: "candidateExplanation", label: "Explanation for candidates", help: "How this is assessed, in plain words." },
];

const ANCHORS: Array<{ key: keyof RubricCriterion["anchors"]; label: string }> = [
  { key: "concern_observed", label: "Concern observed" },
  { key: "partially_demonstrated", label: "Partially demonstrated" },
  { key: "demonstrated", label: "Demonstrated" },
];

export function CriteriaEditor({ draft, edit, readOnly }: { draft: Draft; edit: Edit; readOnly: boolean }) {
  const { pkg, prot } = draft;
  const capOptions = CAPABILITIES.map((c) => ({ value: c.id, label: c.label }));
  const acOptions = pkg.acceptanceCriteria.map((a) => ({ value: a.id, label: `${a.id}: ${a.text.slice(0, 80)}` }));
  const set = (i: number, patch: Partial<RubricCriterion>) => edit("criteria", (d) => ({ ...d, pkg: { ...d.pkg, rubric: d.pkg.rubric.map((r, j) => (j === i ? { ...r, ...patch } : r)) } }));

  return (
    <Panel>
      <PanelSection
        title="Criteria"
        description="How reviewers judge the work. Test-judged criteria rely on acceptance criteria; reviewer-judged ones are read from the code and handoff."
      >
        <ul className="grid gap-4">
          {pkg.rubric.map((r, i) => (
            <li key={r.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_180px_auto] sm:items-end">
                <Field label="Criterion" htmlFor={`cr-label-${r.id}`}>
                  <Input id={`cr-label-${r.id}`} maxLength={80} value={r.label} readOnly={readOnly} onChange={(e) => set(i, { label: e.target.value })} />
                </Field>
                <Field label="Capability" htmlFor={`cr-cap-${r.id}`}>
                  <Combobox id={`cr-cap-${r.id}`} options={capOptions} value={r.capability} disabled={readOnly} onChange={(v) => set(i, { capability: v as RubricCriterion["capability"] })} />
                </Field>
                <Field label="Judged by" htmlFor={`cr-judge-${r.id}`}>
                  <Combobox
                    id={`cr-judge-${r.id}`}
                    options={[
                      { value: "tests", label: "Tests" },
                      { value: "reviewer", label: "Reviewer" },
                    ]}
                    value={r.judgedBy}
                    disabled={readOnly}
                    onChange={(v) => set(i, v === "reviewer" ? { judgedBy: "reviewer", acceptanceCriterionIds: [] } : { judgedBy: "tests" })}
                  />
                </Field>
                {readOnly ? null : (
                  <Button
                    variant="quiet"
                    icon
                    aria-label={`Remove ${r.label || "criterion"}`}
                    onClick={() => edit("criteria", (d) => ({ ...d, pkg: { ...d.pkg, rubric: d.pkg.rubric.filter((_, j) => j !== i) } }))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
              {r.judgedBy === "tests" ? (
                <Field className="mt-3" label="Acceptance criteria it relies on" htmlFor={`cr-ac-${r.id}`}>
                  <Combobox id={`cr-ac-${r.id}`} multiple options={acOptions} value={r.acceptanceCriterionIds} placeholder="None selected" disabled={readOnly} onChange={(v) => set(i, { acceptanceCriterionIds: v.slice(0, 10) })} />
                </Field>
              ) : null}
              <div className="mt-3">
                <Disclosure label="Anchors and explanations" defaultOpen={!r.anchors.demonstrated.trim()}>
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      {ANCHORS.map((a) => (
                        <Field key={a.key} label={a.label} htmlFor={`cr-${a.key}-${r.id}`}>
                          <Textarea
                            id={`cr-${a.key}-${r.id}`}
                            rows={3}
                            maxLength={400}
                            readOnly={readOnly}
                            value={r.anchors[a.key]}
                            onChange={(e) => set(i, { anchors: { ...r.anchors, [a.key]: e.target.value } })}
                          />
                        </Field>
                      ))}
                    </div>
                    {TEXT_FIELDS.map((f) => (
                      <Field key={f.key} label={f.label} htmlFor={`cr-${f.key}-${r.id}`} help={f.help}>
                        <Textarea id={`cr-${f.key}-${r.id}`} rows={2} maxLength={400} readOnly={readOnly} value={r[f.key]} onChange={(e) => set(i, { [f.key]: e.target.value })} />
                      </Field>
                    ))}
                    <Field label="Reviewer notes, evaluators only" htmlFor={`cr-notes-${r.id}`} optional>
                      <Textarea
                        id={`cr-notes-${r.id}`}
                        rows={2}
                        maxLength={1000}
                        readOnly={readOnly}
                        value={prot.rubricNotes[r.id] ?? ""}
                        onChange={(e) => edit("criteria", (d) => ({ ...d, prot: { ...d.prot, rubricNotes: { ...d.prot.rubricNotes, [r.id]: e.target.value } } }))}
                      />
                    </Field>
                  </div>
                </Disclosure>
              </div>
            </li>
          ))}
        </ul>
        {readOnly || pkg.rubric.length >= 12 ? null : (
          <Button
            className="mt-4"
            size="sm"
            variant="secondary"
            onClick={() =>
              edit("criteria", (d) => ({
                ...d,
                pkg: {
                  ...d.pkg,
                  rubric: [
                    ...d.pkg.rubric,
                    {
                      id: nextId("cr-", d.pkg.rubric.map((x) => x.id)),
                      capability: d.pkg.config.capabilities[0] ?? "correctness",
                      label: "",
                      whyItMatters: "",
                      observableEvidence: "",
                      anchors: { concern_observed: "", partially_demonstrated: "", demonstrated: "" },
                      insufficientEvidence: "",
                      limitations: "",
                      candidateExplanation: "",
                      acceptanceCriterionIds: [],
                      judgedBy: "reviewer",
                    },
                  ],
                },
              }))
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add criterion
          </Button>
        )}
      </PanelSection>
    </Panel>
  );
}

export default CriteriaEditor;
