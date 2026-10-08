"use client";

import { useEffect, useState } from "react";
import { CONTEXT_SAVED_EVENT } from "@/components/passport/ContributionContext";
import type { EvidenceStatus } from "@/lib/profile-evidence/store";
import { GUIDE_LABEL, RELATIONSHIPS, RELATIONSHIP_LABEL, type Relationship } from "@/lib/profile-evidence/contract";
import EvidenceSnapshotView from "./EvidenceSnapshotView";
import { request } from "./request";

const CONFIRMATION: Record<EvidenceStatus["confirmation"], string> = {
  unconfirmed: "You have not confirmed your contribution yet. Fydell never infers what you did from repository access or commits.",
  confirmed: "You confirmed your contribution as it reads now.",
  changed_since_confirmed: "You edited your contribution after confirming it. Confirm it again before publishing.",
};

function FeedbackForm({ projectKey, onSaved }: { projectKey: string; onSaved: () => Promise<void> }) {
  const [authorName, setAuthorName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("peer");
  const [relationshipNote, setRelationshipNote] = useState("");
  const [directlyObserved, setDirectlyObserved] = useState<"yes" | "no" | "">("");
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await request<{ feedback: { id: string } }>("/api/passport/feedback", "POST", {
      projectKey,
      authorName,
      relationship,
      relationshipNote,
      directlyObserved: directlyObserved === "" ? null : directlyObserved === "yes",
      statement,
    });
    setBusy(false);
    if (result.ok === false) return setError(result.error);
    setAuthorName("");
    setRelationshipNote("");
    setDirectlyObserved("");
    setStatement("");
    await onSaved();
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
          Their name
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} maxLength={120} required className="platform-input h-8 text-app-meta" />
        </label>
        <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
          How they worked with you
          <select value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)} className="platform-select h-8 text-app-meta">
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>{RELATIONSHIP_LABEL[r]}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
        Their role on the project (optional)
        <input value={relationshipNote} onChange={(e) => setRelationshipNote(e.target.value)} maxLength={200} className="platform-input h-8 text-app-meta" />
      </label>
      <fieldset className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
        <legend>Did they see the work directly?</legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="observed" checked={directlyObserved === "yes"} onChange={() => setDirectlyObserved("yes")} /> Yes
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="observed" checked={directlyObserved === "no"} onChange={() => setDirectlyObserved("no")} /> No, they heard about it
          </label>
        </div>
      </fieldset>
      <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
        What they said
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} maxLength={1500} rows={3} required className="platform-input min-h-[5rem] py-2 text-app-meta text-[var(--text-body)]" />
      </label>
      <p className="text-app-meta text-[var(--text-tertiary)]">Employers see that you added this and that Fydell has not verified it. Fydell does not contact the person.</p>
      <div>
        <button type="submit" disabled={busy || !authorName.trim() || !statement.trim() || directlyObserved === ""} className="btn btn-secondary h-8 px-3 text-app-meta">
          {busy ? "Saving" : "Add feedback"}
        </button>
      </div>
      {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
    </form>
  );
}

export default function EvidenceVersionPanel({ initial }: { initial: EvidenceStatus }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState<"confirm" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addingFeedback, setAddingFeedback] = useState(false);
  const projectKey = status.projectKey;

  useEffect(() => {
    async function reload() {
      try {
        const res = await fetch(`/api/passport/evidence?projectKey=${encodeURIComponent(projectKey)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { status?: EvidenceStatus };
        if (data.status) setStatus(data.status);
      } catch {
        // The next confirm or publish reports the error; nothing was lost.
      }
    }
    window.addEventListener(CONTEXT_SAVED_EVENT, reload);
    return () => window.removeEventListener(CONTEXT_SAVED_EVENT, reload);
  }, [projectKey]);

  async function refresh() {
    try {
      const res = await fetch(`/api/passport/evidence?projectKey=${encodeURIComponent(status.projectKey)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { status?: EvidenceStatus; error?: string };
      if (data.status) setStatus(data.status);
      else setError(data.error ?? "Could not reload this project. Refresh the page.");
    } catch {
      setError("Couldn't reach Fydell. Refresh the page.");
    }
  }

  async function act(action: "confirm" | "publish") {
    setBusy(action);
    setError(null);
    setNotice(null);
    const before = status.versions[0]?.version ?? 0;
    const result = await request<{ status: EvidenceStatus }>("/api/passport/evidence", "POST", { action, projectKey: status.projectKey });
    setBusy(null);
    if (result.ok === false) return setError(result.error);
    setStatus(result.data.status);
    if (action === "publish") {
      const top = result.data.status.versions[0]?.version ?? 0;
      setNotice(top > before ? `Published version ${top}.` : `Nothing changed since version ${result.data.status.currentVersion ?? top}, so no new version was made.`);
    }
  }

  async function withdrawFeedback(id: string) {
    setError(null);
    const result = await request<{ ok: true }>("/api/passport/feedback", "DELETE", { id });
    if (result.ok === false) return setError(result.error);
    await refresh();
  }

  const isSample = status.sourceKind === "work_sample";

  return (
    <section className="mt-10 border-t border-[var(--border-subtle)] pt-8" aria-labelledby="evidence-version-heading">
      <h2 id="evidence-version-heading" className="text-[16px] font-semibold text-[var(--text-primary)]">Prepare this project for applications</h2>
      <p className="mt-1 max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        Publishing stores what employers will see as a fixed version. Each application keeps the version it was sent with, and you choose which projects each application includes.
      </p>

      {!isSample ? (
        <div className="mt-5 grid gap-2">
          <p className="text-app-meta text-[var(--text-body)]">{CONFIRMATION[status.confirmation]}</p>
          {status.gaps.length > 0 ? (
            <p className="text-app-meta text-[var(--text-secondary)]">
              Not yet described: {status.gaps.map((g) => GUIDE_LABEL[g].toLowerCase()).join(", ")}. Employers will see these as not provided.
            </p>
          ) : null}
          {status.preview.provenance.generatedFields.length > 0 ? (
            <p className="text-app-meta text-[var(--text-secondary)]">
              Some text is still the draft Fydell wrote from the analysis. Employers see it marked as a draft you have not edited.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!isSample ? (
          <button
            type="button"
            onClick={() => act("confirm")}
            disabled={busy !== null || !status.canConfirm || status.confirmation === "confirmed"}
            className="btn btn-secondary h-8 px-3 text-app-meta"
          >
            {busy === "confirm" ? "Confirming" : status.confirmation === "confirmed" ? "Contribution confirmed" : "Confirm my contribution"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => act("publish")}
          disabled={busy !== null || (!isSample && status.confirmation !== "confirmed")}
          className="btn btn-primary h-8 px-3 text-app-meta"
        >
          {busy === "publish" ? "Publishing" : "Publish a version"}
        </button>
        {!isSample && !status.canConfirm ? <span className="text-app-meta text-[var(--text-tertiary)]">Describe what you worked on first.</span> : null}
      </div>
      {notice ? <p role="status" className="mt-2 text-app-meta text-[var(--text-body)]">{notice}</p> : null}
      {error ? <p role="alert" className="mt-2 text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}

      <h3 className="mt-8 text-[14px] font-semibold text-[var(--text-primary)]">Versions</h3>
      {status.versions.length === 0 ? (
        <p className="mt-2 text-app-meta text-[var(--text-secondary)]">None yet. A version is also made when you apply with this project.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {status.versions.map((v) => (
            <li key={v.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
              <p className="font-medium text-[var(--text-primary)]">
                Version {v.version}
                {status.currentVersion === v.version ? ", matches your profile now" : ""}
              </p>
              <p className="text-[var(--text-tertiary)]">
                {v.origin === "publish" ? "Published" : "Made when you applied"} {new Date(v.createdAt).toLocaleDateString()}
              </p>
              {v.applications.length > 0 ? (
                <ul className="mt-1 grid gap-0.5 text-[var(--text-secondary)]">
                  {v.applications.map((a) => (
                    <li key={a.id}>
                      <a href={`/app/candidate/applications/${a.id}`} className="underline underline-offset-4">{a.roleTitle}</a>, {a.organizationName}
                      {a.active ? "" : " (no longer shared)"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[var(--text-secondary)]">Not in any application.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isSample ? (
        <>
          <h3 className="mt-8 text-[14px] font-semibold text-[var(--text-primary)]">Feedback from people you worked with</h3>
          <p className="mt-1 max-w-[72ch] text-app-meta text-[var(--text-secondary)]">Optional. Each entry shows who said it, how they worked with you and whether they saw the work directly.</p>
          {status.preview.feedback.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {status.preview.feedback.map((f) => (
                <li key={f.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
                  <p className="font-medium text-[var(--text-primary)]">{f.authorName}</p>
                  <p className="text-[var(--text-tertiary)]">
                    {RELATIONSHIP_LABEL[f.relationship]}
                    {f.relationshipNote ? `, ${f.relationshipNote}` : ""}. {f.directlyObserved ? "Saw the work directly." : "Did not see the work directly."}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[var(--text-body)]">{f.statement}</p>
                  <button type="button" onClick={() => withdrawFeedback(f.id)} className="btn btn-ghost mt-2 h-7 px-2.5 text-app-meta">
                    Remove from future versions
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {addingFeedback ? (
            <FeedbackForm projectKey={status.projectKey} onSaved={async () => { setAddingFeedback(false); await refresh(); }} />
          ) : (
            <button type="button" onClick={() => setAddingFeedback(true)} className="btn btn-ghost mt-3 h-8 px-3 text-app-meta">
              Add feedback
            </button>
          )}
        </>
      ) : null}

      <details className="mt-8">
        <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-primary)]">Preview what an employer would see</summary>
        <div className="mt-4 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
          <EvidenceSnapshotView content={status.preview} version={status.currentVersion} publishedAt={null} headingLevel={3} />
        </div>
      </details>
    </section>
  );
}
