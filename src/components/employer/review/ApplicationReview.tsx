"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/Field";
import type { EvidenceMapping, ReviewQuestion } from "@/lib/employer/review";
import type { ApplicationInvitation } from "@/lib/hiring/work-samples";
import WorkSampleInviteForm from "./WorkSampleInviteForm";
import type { EvidenceItem, ReviewData, ReviewRequirement } from "./types";

type Path = "review" | "ask" | "invite";

const PREVIEW_FINDINGS = 3;

const PATHS: Array<{ key: Path; label: string; help: string }> = [
  { key: "review", label: "Review existing evidence", help: "Map a finding from their Passport, or record that it is not established." },
  { key: "ask", label: "Ask a question or request an artifact", help: "A targeted question, or a design doc, pull request or write-up they are permitted to share." },
  { key: "invite", label: "Invite to a work sample", help: "Only when the gap remains after their existing work. You name the gap first." },
];

function newRequestId(): string {
  return `q_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function postJson<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; ok?: boolean };
    if (!res.ok || data.ok === false) return { ok: false, error: data.error ?? "Something went wrong. Nothing was saved; try again." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Couldn't reach Fydell. Check your connection; nothing was saved." };
  }
}

function status(mapping: EvidenceMapping | undefined, questions: ReviewQuestion[], invites: ApplicationInvitation[]): { label: string; badge: string } {
  if (mapping?.status === "accepted" && mapping.evidenceId) return { label: "Evidence mapped", badge: "badge-teal" };
  if (invites.some((i) => i.status === "invited" || i.status === "accepted")) return { label: "Work sample invited", badge: "badge-violet" };
  if (questions.some((q) => q.status === "open")) return { label: "Waiting on applicant", badge: "badge-attention" };
  if (questions.some((q) => q.status === "answered" && !q.reviewedAt)) return { label: "Answer to read", badge: "badge-attention" };
  if (mapping?.status === "unresolved") return { label: "Not established yet", badge: "badge-attention" };
  return { label: "Not reviewed", badge: "badge-neutral" };
}

function EvidenceCard({ item, action }: { item: EvidenceItem; action?: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-3">
      <p className="text-app-meta leading-[1.5] text-[var(--text-body)]">{item.finding}</p>
      <p className="mt-1 break-all font-mono text-[12px] text-[var(--text-tertiary)]">
        {item.repo} · {item.path}:{item.startLine}
        {item.endLine > item.startLine ? `-${item.endLine}` : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {action}
        {item.excerpt.length > 0 ? (
          <details className="w-full text-app-meta">
            <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Show source excerpt</summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-[6px] bg-[var(--surface-code)] p-3 font-mono text-[12px] leading-[1.5] text-[var(--text-body)]">{item.excerpt.join("\n")}</pre>
            {item.limitations.length > 0 ? <p className="mt-1.5 text-[var(--text-tertiary)]">Limits: {item.limitations.join(" ")}</p> : null}
          </details>
        ) : null}
        {item.sourceUrl ? (
          <a href={item.sourceUrl} target="_blank" rel="noreferrer nofollow" className="text-app-meta text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]">
            Open in repository
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ExistingEvidence({
  data,
  req,
  mapped,
  mapping,
  questions,
  invites,
}: {
  data: ReviewData;
  req: ReviewRequirement;
  mapped: EvidenceItem | undefined;
  mapping: EvidenceMapping | undefined;
  questions: ReviewQuestion[];
  invites: ApplicationInvitation[];
}) {
  const nothing = !mapped && questions.length === 0 && invites.length === 0;
  return (
    <div className="grid content-start gap-3">
      <h4 className="text-app-meta font-medium text-[var(--text-primary)]">Existing evidence</h4>
      {mapped ? <EvidenceCard item={mapped} /> : null}
      {mapping?.reviewerNote && mapping.reviewerNote !== "Mapping removed by reviewer." ? <p className="text-app-meta text-[var(--text-secondary)]">Reviewer note: {mapping.reviewerNote}</p> : null}
      {questions.map((q) => (
        <div key={q.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
          <p className="text-[var(--text-tertiary)]">
            {q.status === "closed" ? "Question closed" : q.status === "answered" ? "Answered" : `Waiting for an answer${q.dueAt ? ` by ${new Date(q.dueAt).toLocaleDateString()}` : ""}`}
          </p>
          <p className="mt-1 font-medium text-[var(--text-primary)]">{q.question}</p>
          {q.response ? <p className="mt-1 whitespace-pre-wrap text-[var(--text-body)]">{q.response}</p> : null}
        </div>
      ))}
      {invites.map((i) => (
        <div key={i.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
          <p className="text-[var(--text-tertiary)]">Work sample: {i.scenarioTitle}</p>
          {i.evidenceGap ? <p className="mt-1 text-[var(--text-body)]">Gap named: {i.evidenceGap.uncertainCapability}</p> : null}
        </div>
      ))}
      {!mapped && data.share && data.evidence.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">
            {req.kind === "preferred"
              ? "Read as context; preferred requirements are not mapped. Their shared findings:"
              : "Nothing mapped yet, which is not a negative judgment. Their shared findings:"}
          </p>
          <ul className="grid gap-1.5">
            {data.evidence.slice(0, PREVIEW_FINDINGS).map((e) => (
              <li key={e.id} className="rounded-[6px] bg-[var(--surface-canvas)] px-2.5 py-2 text-app-meta leading-[1.45]">
                <span className="text-[var(--text-body)]">{e.finding}</span>
                <span className="mt-0.5 block break-all font-mono text-[12px] text-[var(--text-tertiary)]">{e.path}:{e.startLine}</span>
              </li>
            ))}
          </ul>
          {data.evidence.length > PREVIEW_FINDINGS ? (
            <p className="text-app-meta text-[var(--text-tertiary)]">{data.evidence.length - PREVIEW_FINDINGS} more under Review existing evidence.</p>
          ) : null}
        </div>
      ) : nothing ? (
        <div className="rounded-[8px] border border-dashed border-[var(--border-default)] p-3 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
          {data.share
            ? "Their shared projects have no analyzed findings. Read the note and links beside the requirements."
            : "This applicant didn't share Passport projects. Their note and links are beside the requirements."}
        </div>
      ) : null}
    </div>
  );
}

function ReviewPath({ data, req, mapped, onSaved }: { data: ReviewData; req: ReviewRequirement; mapped: EvidenceItem | undefined; onSaved: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!data.share) {
    return <p className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">There are no Passport findings to review. Read the note and links, then ask a question if something is unclear.</p>;
  }
  if (data.evidence.length === 0) {
    return <p className="text-app-meta text-[var(--text-secondary)]">The shared projects have no analyzed findings. Ask a question or request a permitted artifact instead.</p>;
  }
  const canMap = data.canAsk && req.mappingIndex !== null;
  async function map(item: EvidenceItem | null) {
    if (!data.share || req.mappingIndex === null) return;
    setBusy(item?.id ?? "unresolved");
    setError(null);
    const r = await postJson(`/api/employer/review/${data.roleId}/${data.share.shareId}/mappings`, {
      requirementIndex: req.mappingIndex,
      evidenceProjectId: item?.projectId ?? null,
      evidenceId: item?.id ?? null,
      status: item ? "accepted" : "unresolved",
      reviewerNote: item ? "" : "Not established by the shared evidence.",
    });
    setBusy(null);
    if (r.ok === false) return setError(r.error);
    onSaved();
  }
  return (
    <div className="grid gap-3">
      {!canMap ? (
        <p className="text-app-meta text-[var(--text-secondary)]">
          {req.mappingIndex === null ? "Preferred requirements are read as context and not mapped." : "Your workspace role can read evidence but not record review notes."}
        </p>
      ) : null}
      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
        {data.evidence.map((item) => (
          <EvidenceCard
            key={item.id}
            item={item}
            action={
              canMap ? (
                <Button size="sm" variant={mapped?.id === item.id ? "primary" : "secondary"} onClick={() => map(item)} loading={busy === item.id} disabled={busy !== null || mapped?.id === item.id}>
                  {mapped?.id === item.id ? "Mapped" : "Map to this requirement"}
                </Button>
              ) : undefined
            }
          />
        ))}
      </div>
      {canMap ? (
        <div>
          <Button size="sm" variant="quiet" onClick={() => map(null)} loading={busy === "unresolved"} disabled={busy !== null}>
            Not established by this evidence
          </Button>
        </div>
      ) : null}
      <FormError>{error}</FormError>
    </div>
  );
}

function AskPath({ data, req, mapping, onSaved }: { data: ReviewData; req: ReviewRequirement; mapping: EvidenceMapping | undefined; onSaved: () => void }) {
  const artifactText = `Could you share a design doc, pull request or write-up you are permitted to share that shows your work on: ${req.text}? Leave out anything confidential.`;
  const [mode, setMode] = useState<"question" | "artifact">("question");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!data.share) {
    return (
      <p className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        Questions are attached to a shared Passport, and this applicant applied without one. Write to them at the email on their application, or invite them to a work sample if the gap matters.
      </p>
    );
  }
  if (!data.canAsk) return <p className="text-app-meta text-[var(--text-secondary)]">Your workspace role cannot ask applicants questions.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!data.share || busy || !text.trim()) return;
    setBusy(true);
    setError(null);
    let mappingId: string | null = mapping?.id ?? null;
    if (!mappingId && req.mappingIndex !== null) {
      const created = await postJson<{ mapping: EvidenceMapping }>(`/api/employer/review/${data.roleId}/${data.share.shareId}/mappings`, {
        requirementIndex: req.mappingIndex,
        evidenceProjectId: null,
        evidenceId: null,
        status: "questioned",
        reviewerNote: "",
      });
      if (created.ok === false) {
        setBusy(false);
        return setError(created.error);
      }
      mappingId = created.data.mapping.id;
    }
    const r = await postJson(`/api/employer/review/${data.roleId}/${data.share.shareId}/questions`, {
      question: text.trim(),
      mappingId,
      dueAt: due ? new Date(`${due}T23:59:00`).toISOString() : null,
      clientRequestId: requestId,
    });
    setBusy(false);
    if (r.ok === false) return setError(r.error);
    setSent(true);
    setText("");
    setDue("");
    setRequestId(newRequestId());
    onSaved();
  }

  if (sent) {
    return (
      <div className="grid gap-3">
        <FormSuccess>Sent. The applicant is notified and answers from their Passport.</FormSuccess>
        <div>
          <Button size="sm" onClick={() => setSent(false)}>
            Ask something else
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div className="flex gap-1" role="group" aria-label="Request type">
        {(["question", "artifact"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              if (m === "artifact" && !text.trim()) setText(artifactText);
              if (m === "question" && text === artifactText) setText("");
            }}
            className={`h-8 rounded-[8px] px-3 text-app-meta font-medium ${
              mode === m ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {m === "question" ? "Targeted question" : "Permitted artifact"}
          </button>
        ))}
      </div>
      <Field label={mode === "question" ? "Question" : "Artifact request"} htmlFor={`ask-${req.id}`} help="Ask about this requirement only. Keep it answerable in a few minutes.">
        <Textarea
          id={`ask-${req.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="In your queue worker, what happens to a job that fails after it has already sent the email?"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Answer by" htmlFor={`ask-due-${req.id}`} optional help="The applicant sees this date.">
          <Input id={`ask-due-${req.id}`} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" loading={busy} disabled={!text.trim()}>
          Send to applicant
        </Button>
      </div>
    </form>
  );
}

function RequirementCard({ data, req }: { data: ReviewData; req: ReviewRequirement }) {
  const router = useRouter();
  const [path, setPath] = useState<Path | null>(null);
  const mapping =
    req.mappingIndex === null ? undefined : data.mappings.find((m) => m.requirementIndex === req.mappingIndex && m.requirementText === req.text);
  const mapped = mapping?.evidenceId ? data.evidence.find((e) => e.id === mapping.evidenceId) : undefined;
  const questions = mapping ? data.questions.filter((q) => q.mappingId === mapping.id) : [];
  const invites = data.invitations.filter((i) => i.evidenceGap?.requirementId === req.id);
  const s = status(mapping, questions, invites);
  const withdrawn = data.application.status === "withdrawn";
  const policyNote =
    data.workSamplePolicy === "not_needed"
      ? "This role's policy says work samples are not needed. Invite only if this gap would otherwise block a decision."
      : data.workSamplePolicy === "required"
        ? "This role asks for a work sample from applicants who reach review. Name the gap so the result is read against it."
        : null;
  const refresh = () => router.refresh();

  return (
    <li className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--text-tertiary)]">{req.kind === "required" ? "Required" : "Preferred"}</p>
          <h3 className="mt-0.5 text-[15px] font-medium leading-[1.4] text-[var(--text-primary)]">{req.text}</h3>
        </div>
        <span className={`badge shrink-0 ${s.badge}`}>{s.label}</span>
      </div>
      <div className="grid gap-5 px-5 py-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <ExistingEvidence data={data} req={req} mapped={mapped} mapping={mapping} questions={questions} invites={invites} />
        <div className="grid content-start gap-3">
          {path === null ? (
            <>
              <h4 className="text-app-meta font-medium text-[var(--text-primary)]">Next step</h4>
              <div className="grid gap-2">
                {PATHS.map((p) => {
                  const disabled = withdrawn || (p.key === "invite" && !data.canInvite);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPath(p.key)}
                      className="grid gap-0.5 rounded-[8px] border border-[var(--border-default)] px-3.5 py-2.5 text-left hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="text-app-meta font-medium text-[var(--text-primary)]">{p.label}</span>
                      <span className="text-app-meta leading-[1.45] text-[var(--text-secondary)]">{p.help}</span>
                    </button>
                  );
                })}
              </div>
              {withdrawn ? <p className="text-app-meta text-[var(--text-tertiary)]">The applicant withdrew, so nothing new can be sent.</p> : null}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-app-meta font-medium text-[var(--text-primary)]">{PATHS.find((p) => p.key === path)?.label}</h4>
                <Button size="sm" variant="quiet" onClick={() => setPath(null)}>
                  Other paths
                </Button>
              </div>
              {path === "review" ? <ReviewPath data={data} req={req} mapped={mapped} onSaved={refresh} /> : null}
              {path === "ask" ? <AskPath data={data} req={req} mapping={mapping} onSaved={refresh} /> : null}
              {path === "invite" ? (
                <WorkSampleInviteForm
                  roleId={data.roleId}
                  applicationId={data.application.id}
                  requirement={req}
                  options={data.workSamples}
                  policyNote={policyNote}
                  onDone={() => setPath(null)}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Review an application one requirement at a time. Each requirement shows
 * the evidence already in hand beside three ways forward. Nothing here
 * requires a work sample; it is one option among three.
 */
export default function ApplicationReview({ data }: { data: ReviewData }) {
  if (data.requirements.length === 0) {
    return (
      <div className="rounded-[10px] border border-dashed border-[var(--border-default)] p-5 text-app-meta text-[var(--text-secondary)]">
        This role has no confirmed requirements, so there is nothing to review against yet. Add them from Edit role.
      </div>
    );
  }
  return (
    <ol className="grid gap-4">
      {data.requirements.map((r) => (
        <RequirementCard key={r.id} data={data} req={r} />
      ))}
    </ol>
  );
}
