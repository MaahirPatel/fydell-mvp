"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/Field";
import { PanelLabel } from "@/components/ui/Panel";
import { engFetch } from "./api";
import { FileViewer, type FileTarget } from "./EvidenceViews";
import { observedSentence, STATE_LABEL, suggestState } from "@/lib/eng/criteria";
import type { AssessmentState } from "@/lib/eng/scenarios/types";
import type { Citation, CriterionAssessment, Finding, ReportBrief } from "@/lib/eng/types";

type DimensionKey = Finding["dimension"];
type Level = ReportBrief["dimensions"][number]["level"];

export interface EditorCriterion {
  id: string;
  label: string;
  requirement: string;
  anchors: { state: AssessmentState; observable: string }[];
  notCovered: string;
  observed: CriterionAssessment["observed"];
}

export interface EditorEvidence {
  files: { path: string; size: number }[];
  probes: { id: string; title: string; outcome: string }[];
  messages: { id: string; label: string }[];
  handoffFields: string[];
}

export interface EditorRubric {
  key: DimensionKey;
  label: string;
  question: string;
  anchors: { level: Level; observable: string }[];
  criteria: EditorCriterion[];
}

type CriterionDraft = { id: string; state: AssessmentState; rationale: string };

function initialCriteria(rubric: EditorRubric[], brief: ReportBrief | null): CriterionDraft[] {
  return rubric.flatMap((r) =>
    r.criteria.map((c) => {
      const saved = brief?.criteria?.find((x) => x.id === c.id);
      return saved ? { id: c.id, state: saved.state, rationale: saved.rationale } : { id: c.id, state: suggestState(c.observed), rationale: "" };
    })
  );
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function blankFinding(n: number): Finding {
  return { id: `F${n}`, dimension: "correctness", category: "coding_result", kind: "observation", basis: "observed", statement: "", citations: [] };
}

function CitationEditor({
  citation,
  evidence,
  onChange,
  onRemove,
  onOpenFile,
}: {
  citation: Citation;
  evidence: EditorEvidence;
  onChange: (c: Citation) => void;
  onRemove: () => void;
  onOpenFile: (t: FileTarget) => void;
}) {
  const options =
    citation.kind === "file"
      ? evidence.files.map((f) => ({ value: f.path, label: f.path }))
      : citation.kind === "test"
        ? evidence.probes.map((p) => ({ value: p.id, label: `${p.id} ${p.title} (${p.outcome})` }))
        : citation.kind === "message"
          ? evidence.messages.map((m) => ({ value: m.id, label: m.label }))
          : evidence.handoffFields.map((h) => ({ value: h, label: h.replace(/_/g, " ") }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Citation kind" value={citation.kind} onChange={(e) => onChange({ kind: e.target.value as Citation["kind"], ref: "" })} className="w-[110px]">
        <option value="file">File</option>
        <option value="test">Test</option>
        <option value="message">Message</option>
        <option value="handoff">Handoff</option>
      </Select>
      <Select aria-label="Citation reference" value={citation.ref} onChange={(e) => onChange({ ...citation, ref: e.target.value })} className="min-w-[220px] flex-1">
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label.length > 90 ? `${o.label.slice(0, 90)}…` : o.label}
          </option>
        ))}
      </Select>
      {citation.kind === "file" ? (
        <>
          <Input
            aria-label="First line"
            type="number"
            min={1}
            className="w-[80px]"
            value={citation.lineStart ?? ""}
            onChange={(e) => onChange({ ...citation, lineStart: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="from"
          />
          <Input
            aria-label="Last line"
            type="number"
            min={1}
            className="w-[80px]"
            value={citation.lineEnd ?? ""}
            onChange={(e) => onChange({ ...citation, lineEnd: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="to"
          />
          {citation.ref ? (
            <Button size="sm" variant="quiet" onClick={() => onOpenFile({ path: citation.ref, lineStart: citation.lineStart, lineEnd: citation.lineEnd })}>
              View
            </Button>
          ) : null}
        </>
      ) : null}
      <Button size="sm" variant="quiet" onClick={onRemove} aria-label="Remove citation">
        Remove
      </Button>
    </div>
  );
}

export default function ReportEditor({
  apiBase,
  rubric,
  evidence,
  initialBrief,
  initialFindings,
  needsChangeReason,
  initialChangeReason,
  hasDraft,
}: {
  /** /api/eng/review/<id> for Fydell reviewers, /api/eng/org/attempts/<id> for the employer's team. */
  apiBase: string;
  rubric: EditorRubric[];
  evidence: EditorEvidence;
  initialBrief: ReportBrief | null;
  initialFindings: Finding[];
  needsChangeReason: boolean;
  initialChangeReason: string;
  hasDraft: boolean;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialBrief?.summary ?? "");
  const [dimensions, setDimensions] = useState<ReportBrief["dimensions"]>(
    rubric.map(
      (r) =>
        initialBrief?.dimensions.find((d) => d.key === r.key && r.anchors.some((a) => a.level === d.level)) ?? {
          key: r.key,
          level: r.anchors[r.anchors.length - 1]?.level ?? "not_assessed",
          rationale: "",
        }
    )
  );
  const [criteria, setCriteria] = useState<CriterionDraft[]>(() => initialCriteria(rubric, initialBrief));
  const hasCriteria = criteria.length > 0;

  function updateCriterion(id: string, patch: Partial<CriterionDraft>) {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  const [strengths, setStrengths] = useState((initialBrief?.strengths ?? []).join("\n"));
  const [gaps, setGaps] = useState((initialBrief?.gaps ?? []).join("\n"));
  const [limitations, setLimitations] = useState(
    (initialBrief?.limitations ?? ["Fydell cannot observe the candidate's editor, AI tools or time spent outside the recorded actions."]).join("\n")
  );
  const [followUps, setFollowUps] = useState((initialBrief?.followUps ?? []).join("\n"));
  const [findings, setFindings] = useState<Finding[]>(initialFindings.length ? initialFindings : [blankFinding(1)]);
  const [changeReason, setChangeReason] = useState(initialChangeReason);
  const [reviewMinutes, setReviewMinutes] = useState("");
  const [file, setFile] = useState<FileTarget | null>(null);
  const [busy, setBusy] = useState<"save" | "release" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(hasDraft);

  function updateFinding(index: number, patch: Partial<Finding>) {
    setFindings((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  async function save(): Promise<boolean> {
    setBusy("save");
    setError(null);
    setProblems([]);
    setNotice(null);
    const res = await engFetch(`${apiBase}/report`, {
      method: "PUT",
      body: {
        brief: {
          summary,
          dimensions,
          strengths: lines(strengths),
          gaps: lines(gaps),
          limitations: lines(limitations),
          followUps: lines(followUps),
          ...(hasCriteria ? { criteria } : {}),
        },
        findings: findings.map((f) => ({ ...f, citations: f.citations.filter((c) => c.ref) })),
        changeReason: changeReason || null,
        reviewMinutes: reviewMinutes ? Number(reviewMinutes) : null,
      },
    });
    setBusy(null);
    if (res.ok === false) {
      setError(res.error);
      setProblems(res.problems);
      return false;
    }
    setDraftSaved(true);
    setNotice("Draft saved. Drafts stay private to reviewers until released.");
    return true;
  }

  async function release() {
    if (!(await save())) return;
    if (!window.confirm("Release this report? The hiring team and the candidate will see it (the candidate without interview follow-ups). Every citation is checked against the submitted evidence first, and released versions cannot be edited.")) return;
    setBusy("release");
    setError(null);
    const res = await engFetch(`${apiBase}/report`, { body: {} });
    setBusy(null);
    if (res.ok === false) {
      setError(res.error);
      setProblems(res.problems);
      return;
    }
    setNotice("Released. Your team and the candidate can now see this report.");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <FormError>
        {error}
        {problems.length ? (
          <ul className="mt-1 list-disc pl-4">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
      </FormError>
      <FormSuccess>{notice}</FormSuccess>

      <Field label="Summary" htmlFor="rep-summary" help="Two to four sentences an engineering manager can act on. Describe what was observed, not the person.">
        <Textarea id="rep-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} maxLength={1200} />
      </Field>

      <div>
        <PanelLabel>Rubric</PanelLabel>
        <div className="mt-2 grid gap-4">
          {rubric.map((r, i) => (
            <div key={r.key} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-app-body font-medium text-[var(--text-primary)]">{r.label}</p>
                <Select
                  aria-label={`${r.label} level`}
                  value={dimensions[i].level}
                  onChange={(e) => setDimensions((prev) => prev.map((d, j) => (j === i ? { ...d, level: e.target.value as Level } : d)))}
                  className="w-[200px]"
                >
                  {r.anchors.map((a) => (
                    <option key={a.level} value={a.level}>
                      {STATE_LABEL[a.level]}
                    </option>
                  ))}
                </Select>
              </div>
              <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{r.question}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-app-meta text-[var(--text-tertiary)]">Anchors</summary>
                <ul className="mt-1 grid gap-1 text-app-meta text-[var(--text-secondary)]">
                  {r.anchors.map((a) => (
                    <li key={a.level}>
                      <span className="text-[var(--text-primary)]">{STATE_LABEL[a.level]}:</span> {a.observable}
                    </li>
                  ))}
                </ul>
              </details>
              {r.criteria.length ? (
                <ul className="mt-3 grid gap-3 border-t border-[var(--border-subtle)] pt-3">
                  {r.criteria.map((c) => {
                    const draft = criteria.find((x) => x.id === c.id);
                    if (!draft) return null;
                    return (
                      <li key={c.id} className="grid gap-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-app-body text-[var(--text-primary)]">{c.label}</p>
                          <Select
                            aria-label={`${c.label} state`}
                            value={draft.state}
                            onChange={(e) => updateCriterion(c.id, { state: e.target.value as AssessmentState })}
                            className="w-[260px]"
                          >
                            {c.anchors.map((a) => (
                              <option key={a.state} value={a.state}>
                                {STATE_LABEL[a.state]}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <p className="text-app-meta text-[var(--text-secondary)]">{c.requirement}</p>
                        <p className="text-app-meta text-[var(--text-tertiary)]">
                          {c.observed ? `Observed: ${observedSentence(c.observed)}. Suggested: ${STATE_LABEL[suggestState(c.observed)]}.` : "No defined checks. Judge from the code, messages or handoff and cite them in a finding."}
                          {" "}Not covered: {c.notCovered}
                        </p>
                        <details>
                          <summary className="cursor-pointer text-app-meta text-[var(--text-tertiary)]">Anchors</summary>
                          <ul className="mt-1 grid gap-1 text-app-meta text-[var(--text-secondary)]">
                            {c.anchors.map((a) => (
                              <li key={a.state}>
                                <span className="text-[var(--text-primary)]">{STATE_LABEL[a.state]}:</span> {a.observable}
                              </li>
                            ))}
                          </ul>
                        </details>
                        <Textarea
                          aria-label={`${c.label} rationale`}
                          value={draft.rationale}
                          onChange={(e) => updateCriterion(c.id, { rationale: e.target.value })}
                          rows={2}
                          maxLength={600}
                          placeholder="What in the submission supports this state"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              <Textarea
                aria-label={`${r.label} rationale`}
                className="mt-2"
                value={dimensions[i].rationale}
                onChange={(e) => setDimensions((prev) => prev.map((d, j) => (j === i ? { ...d, rationale: e.target.value } : d)))}
                rows={2}
                maxLength={600}
                placeholder="Why this level, in terms of the anchors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Strengths" htmlFor="rep-strengths" help="One per line, up to 8.">
          <Textarea id="rep-strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={3} />
        </Field>
        <Field label="Gaps" htmlFor="rep-gaps" help="One per line, up to 8.">
          <Textarea id="rep-gaps" value={gaps} onChange={(e) => setGaps(e.target.value)} rows={3} />
        </Field>
        <Field label="Limitations of the evidence" htmlFor="rep-limits" help="At least one.">
          <Textarea id="rep-limits" value={limitations} onChange={(e) => setLimitations(e.target.value)} rows={3} />
        </Field>
        <Field label="Interview follow-ups" htmlFor="rep-follow" help="At least one. Visible to your team only, not the candidate.">
          <Textarea id="rep-follow" value={followUps} onChange={(e) => setFollowUps(e.target.value)} rows={3} />
        </Field>
      </div>

      <div>
        <PanelLabel>Findings</PanelLabel>
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">
          Observed coding results must cite executed tests: a gap needs a test that did not pass, a strength only passing tests. Communication findings cite a message or the handoff. Anything
          else is a hypothesis.
        </p>
        <div className="mt-2 grid gap-3">
          {findings.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input aria-label="Finding id" value={f.id} onChange={(e) => updateFinding(i, { id: e.target.value })} className="w-[80px]" maxLength={40} />
                <Select aria-label="Dimension" value={f.dimension} onChange={(e) => updateFinding(i, { dimension: e.target.value as DimensionKey })} className="w-[210px]">
                  {rubric.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <Select aria-label="Category" value={f.category} onChange={(e) => updateFinding(i, { category: e.target.value as Finding["category"] })} className="w-[160px]">
                  <option value="coding_result">Coding result</option>
                  <option value="interpretation">Interpretation</option>
                  <option value="communication">Communication</option>
                </Select>
                <Select aria-label="Kind" value={f.kind} onChange={(e) => updateFinding(i, { kind: e.target.value as Finding["kind"] })} className="w-[130px]">
                  <option value="strength">Strength</option>
                  <option value="gap">Gap</option>
                  <option value="observation">Observation</option>
                </Select>
                <Select aria-label="Basis" value={f.basis} onChange={(e) => updateFinding(i, { basis: e.target.value as Finding["basis"] })} className="w-[130px]">
                  <option value="observed">Observed</option>
                  <option value="hypothesis">Hypothesis</option>
                </Select>
                <Button size="sm" variant="quiet" className="ml-auto" onClick={() => setFindings((prev) => prev.filter((_, j) => j !== i))}>
                  Delete
                </Button>
              </div>
              <Textarea aria-label="Statement" value={f.statement} onChange={(e) => updateFinding(i, { statement: e.target.value })} rows={2} maxLength={600} placeholder="What the evidence shows" />
              <div className="grid gap-2">
                {f.citations.map((c, ci) => (
                  <CitationEditor
                    key={ci}
                    citation={c}
                    evidence={evidence}
                    onOpenFile={setFile}
                    onChange={(next) => updateFinding(i, { citations: f.citations.map((x, xi) => (xi === ci ? next : x)) })}
                    onRemove={() => updateFinding(i, { citations: f.citations.filter((_, xi) => xi !== ci) })}
                  />
                ))}
                <div>
                  <Button size="sm" variant="secondary" onClick={() => updateFinding(i, { citations: [...f.citations, { kind: "test", ref: "" }] })}>
                    Add citation
                  </Button>
                </div>
              </div>
            </div>
          ))}
          <div>
            <Button size="sm" variant="secondary" onClick={() => setFindings((prev) => [...prev, blankFinding(prev.length + 1)])}>
              Add finding
            </Button>
          </div>
        </div>
        {file ? (
          <div className="mt-3">
            <FileViewer endpoint={`${apiBase}/file`} target={file} onClose={() => setFile(null)} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        {needsChangeReason ? (
          <Field label="What changed in this correction" htmlFor="rep-change" help="Required. Shown to the employer with the corrected version.">
            <Textarea id="rep-change" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} rows={2} maxLength={1000} />
          </Field>
        ) : (
          <div />
        )}
        <Field label="Review minutes" htmlFor="rep-minutes" optional help="Time you spent reviewing.">
          <Input id="rep-minutes" type="number" min={1} max={599} value={reviewMinutes} onChange={(e) => setReviewMinutes(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" loading={busy === "save"} disabled={busy !== null} onClick={() => void save()}>
          Save draft
        </Button>
        <Button variant="primary" loading={busy === "release"} disabled={busy !== null} onClick={release}>
          {needsChangeReason ? "Release correction" : "Release to employer"}
        </Button>
        {draftSaved ? <span className="text-app-meta text-[var(--text-tertiary)]">A draft exists for this attempt.</span> : null}
      </div>
    </div>
  );
}
