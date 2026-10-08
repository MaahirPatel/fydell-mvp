"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import type { Coworker } from "../types";
import { nextId, type Draft, type Edit } from "./model";

export function CoworkersEditor({ draft, edit, readOnly }: { draft: Draft; edit: Edit; readOnly: boolean }) {
  const { pkg, prot } = draft;
  const set = (i: number, patch: Partial<Coworker>) => edit("coworkers", (d) => ({ ...d, pkg: { ...d.pkg, coworkers: d.pkg.coworkers.map((c, j) => (j === i ? { ...c, ...patch } : c)) } }));
  const setFacts = (id: string, facts: Array<{ id: string; text: string; topics?: string[] }>) =>
    edit("coworkers", (d) => ({ ...d, prot: { ...d.prot, coworkerFacts: { ...d.prot.coworkerFacts, [id]: facts } } }));

  return (
    <Panel>
      <PanelSection title="Coworkers" description="Simulated teammates the candidate can message. Candidates see only their name and title before they ask.">
        {pkg.coworkers.length === 0 ? <p className="text-[14px] text-[var(--text-secondary)]">No coworkers. Candidates work from the brief alone.</p> : null}
        <ul className="grid gap-4">
          {pkg.coworkers.map((c, i) => {
            const facts = prot.coworkerFacts[c.id] ?? [];
            return (
              <li key={c.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name" htmlFor={`cw-name-${c.id}`}>
                    <Input id={`cw-name-${c.id}`} maxLength={60} value={c.name} readOnly={readOnly} onChange={(e) => set(i, { name: e.target.value })} />
                  </Field>
                  <Field label="Title" htmlFor={`cw-title-${c.id}`}>
                    <Input id={`cw-title-${c.id}`} maxLength={80} value={c.title} readOnly={readOnly} onChange={(e) => set(i, { title: e.target.value })} />
                  </Field>
                  <Field className="sm:col-span-2" label="Responsibilities" htmlFor={`cw-resp-${c.id}`}>
                    <Textarea id={`cw-resp-${c.id}`} rows={2} maxLength={400} value={c.responsibilities} readOnly={readOnly} onChange={(e) => set(i, { responsibilities: e.target.value })} />
                  </Field>
                  <Field label="Topics" htmlFor={`cw-topics-${c.id}`} help="Separate with commas. Up to 8.">
                    <Input
                      id={`cw-topics-${c.id}`}
                      value={c.topics.join(", ")}
                      readOnly={readOnly}
                      onChange={(e) => set(i, { topics: e.target.value.split(",").map((t) => t.replace(/^\s+/, "")).slice(0, 8) })}
                    />
                  </Field>
                  <Field label="Tone" htmlFor={`cw-tone-${c.id}`}>
                    <Input id={`cw-tone-${c.id}`} maxLength={120} value={c.tone} readOnly={readOnly} onChange={(e) => set(i, { tone: e.target.value })} />
                  </Field>
                  <Field className="sm:col-span-2" label="Boundaries" htmlFor={`cw-bound-${c.id}`} help="What they will not do or decide for the candidate.">
                    <Textarea id={`cw-bound-${c.id}`} rows={2} maxLength={400} value={c.boundaries} readOnly={readOnly} onChange={(e) => set(i, { boundaries: e.target.value })} />
                  </Field>
                </div>
                <fieldset className="mt-4">
                  <legend className="text-app-meta font-medium text-[var(--text-primary)]">Facts, evaluators only</legend>
                  <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">Shared only when the candidate asks about them.</p>
                  <div className="mt-2 grid gap-2">
                    {facts.map((f, k) => (
                      <div key={f.id} className="flex items-start gap-2">
                        <div className="grid min-w-0 flex-1 gap-1.5">
                          <Textarea
                            aria-label={`${c.name || "Coworker"} fact ${k + 1}`}
                            rows={2}
                            maxLength={400}
                            value={f.text}
                            readOnly={readOnly}
                            onChange={(e) => setFacts(c.id, facts.map((x, j) => (j === k ? { ...x, text: e.target.value } : x)))}
                          />
                          <Input
                            aria-label={`${c.name || "Coworker"} fact ${k + 1} topics`}
                            placeholder="Shared when the question is about: retries, event id"
                            value={(f.topics ?? []).join(", ")}
                            readOnly={readOnly}
                            onChange={(e) =>
                              setFacts(
                                c.id,
                                facts.map((x, j) => (j === k ? { ...x, topics: e.target.value.split(",").map((t) => t.replace(/^\s+/, "")).slice(0, 8) } : x)),
                              )
                            }
                          />
                        </div>
                        {readOnly ? null : (
                          <Button variant="quiet" icon aria-label={`Remove fact ${k + 1}`} onClick={() => setFacts(c.id, facts.filter((_, j) => j !== k))}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    ))}
                    {readOnly || facts.length >= 8 ? null : (
                      <div>
                        <Button size="sm" variant="quiet" onClick={() => setFacts(c.id, [...facts, { id: nextId("f-", facts.map((x) => x.id)), text: "" }])}>
                          <Plus className="h-4 w-4" aria-hidden />
                          Add fact
                        </Button>
                      </div>
                    )}
                  </div>
                </fieldset>
                {readOnly ? null : (
                  <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() =>
                        edit("coworkers", (d) => {
                          const facts = { ...d.prot.coworkerFacts };
                          delete facts[c.id];
                          return { pkg: { ...d.pkg, coworkers: d.pkg.coworkers.filter((_, j) => j !== i) }, prot: { ...d.prot, coworkerFacts: facts } };
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Remove {c.name || "coworker"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {readOnly || pkg.coworkers.length >= 3 ? null : (
          <Button
            className="mt-4"
            size="sm"
            variant="secondary"
            onClick={() =>
              edit("coworkers", (d) => ({
                ...d,
                pkg: {
                  ...d.pkg,
                  coworkers: [...d.pkg.coworkers, { id: nextId("cw-", d.pkg.coworkers.map((x) => x.id)), name: "", title: "", responsibilities: "", topics: [], tone: "", boundaries: "" }],
                },
              }))
            }
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add coworker
          </Button>
        )}
      </PanelSection>
      {pkg.coworkers.length ? (
        <PanelSection
          title="Review question"
          description="Optional. One question a coworker asks about the candidate's own change, when they open Review submission or at 70% of the time. It must not add requirements."
        >
          <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
            <Field label="Asked by" htmlFor="cw-review-by">
              <Select
                id="cw-review-by"
                value={pkg.reviewQuestion?.coworkerId ?? pkg.coworkers[0].id}
                disabled={readOnly}
                onChange={(e) => edit("coworkers", (d) => ({ ...d, pkg: { ...d.pkg, reviewQuestion: { coworkerId: e.target.value, text: d.pkg.reviewQuestion?.text ?? "" } } }))}
              >
                {pkg.coworkers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Question" htmlFor="cw-review-text" help="Leave empty for no review question.">
              <Textarea
                id="cw-review-text"
                rows={2}
                maxLength={400}
                value={pkg.reviewQuestion?.text ?? ""}
                readOnly={readOnly}
                onChange={(e) =>
                  edit("coworkers", (d) => ({ ...d, pkg: { ...d.pkg, reviewQuestion: { coworkerId: d.pkg.reviewQuestion?.coworkerId ?? d.pkg.coworkers[0].id, text: e.target.value } } }))
                }
              />
            </Field>
          </div>
        </PanelSection>
      ) : null}
    </Panel>
  );
}

export default CoworkersEditor;
