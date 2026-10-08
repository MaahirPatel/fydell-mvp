import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { engApi, isAuthRequired } from "../lib/tauri";
import {
  AI_USE_FIELD,
  EngAttemptDetail,
  EngLocalState,
  EngMessage,
  EngPackagePlan,
  EngUploadOutcome,
  EngUploadPhase,
  exclusionLabel,
  formatBytes,
  handoffBlockers,
  handoffFields,
  packageSummary,
  senderName,
  setupCommandFor,
  sortMessages,
  submittableUpload,
  uploadStatusText,
} from "../lib/eng";
import { messageOf } from "../App";
import { Dialog, EmptyState, ProvenanceTag } from "./ui";
import { Bullets, CopyLine, WorkspaceCard } from "./EngAssessment";

type Tab = "brief" | "team" | "submit";

/* ---------------- handoff drafts ----------------
   Saved to the platform (PUT drafts) as the candidate types, fenced by
   revision. A conflict (the same field edited elsewhere) is shown with both
   versions; nothing is overwritten without an explicit choice. */

interface DraftState {
  body: string;
  revision: number;
  status: "saved" | "dirty" | "saving" | "conflict" | "error";
  conflict: { body: string; revision: number } | null;
}

function useDrafts(attemptId: string, initial: Record<string, { body: string; revision: number }>, fields: string[]) {
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(
      fields.map((f) => [f, { body: initial[f]?.body ?? "", revision: initial[f]?.revision ?? 0, status: "saved", conflict: null }])
    )
  );
  const ref = useRef(drafts);
  const timers = useRef<Record<string, number>>({});
  const saveRef = useRef<(field: string) => Promise<void>>(async () => {});

  // The ref is the source of truth so save() sees a patch made in the same tick.
  const patch = useCallback((field: string, next: Partial<DraftState>) => {
    const merged = { ...ref.current, [field]: { ...ref.current[field], ...next } };
    ref.current = merged;
    setDrafts(merged);
  }, []);

  const save = useCallback(
    async (field: string) => {
      const d = ref.current[field];
      if (!d || d.status !== "dirty") return;
      const sent = d.body;
      patch(field, { status: "saving" });
      try {
        const r = await engApi.saveDraft(attemptId, field, sent, d.revision);
        if (r.kind === "conflict") {
          patch(field, { status: "conflict", conflict: { body: r.body, revision: r.revision } });
          return;
        }
        const still = ref.current[field].body === sent;
        patch(field, { revision: r.revision, status: still ? "saved" : "dirty" });
        if (!still) timers.current[field] = window.setTimeout(() => void saveRef.current(field), 800);
      } catch {
        patch(field, { status: "error" });
      }
    },
    [attemptId, patch]
  );
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const change = useCallback(
    (field: string, body: string) => {
      const cur = ref.current[field];
      patch(field, { body, status: cur?.status === "conflict" ? "conflict" : "dirty" });
      window.clearTimeout(timers.current[field]);
      if (cur?.status !== "conflict") timers.current[field] = window.setTimeout(() => void save(field), 1000);
    },
    [patch, save]
  );

  const keepMine = useCallback(
    (field: string) => {
      const c = ref.current[field]?.conflict;
      if (!c) return;
      patch(field, { revision: c.revision, conflict: null, status: "dirty" });
      void save(field);
    },
    [patch, save]
  );

  const takeSaved = useCallback(
    (field: string) => {
      const c = ref.current[field]?.conflict;
      if (!c) return;
      patch(field, { body: c.body, revision: c.revision, conflict: null, status: "saved" });
    },
    [patch]
  );

  const retry = useCallback(
    (field: string) => {
      patch(field, { status: "dirty" });
      void save(field);
    },
    [patch, save]
  );

  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  return { drafts, change, keepMine, takeSaved, retry };
}

function draftStatusText(s: DraftState["status"]): string {
  switch (s) {
    case "saved":
      return "Saved to Fydell";
    case "dirty":
      return "Unsaved";
    case "saving":
      return "Saving…";
    case "conflict":
      return "Changed elsewhere";
    case "error":
      return "Not saved";
  }
}

/* ---------------- team thread ---------------- */

function TeamThread({ detail, messages, onMessages }: { detail: EngAttemptDetail; messages: EngMessage[]; onMessages: (m: EngMessage[]) => void }) {
  const { view } = detail;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => sortMessages(messages), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [sorted.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      onMessages(await engApi.sendMessage(view.attempt.id, body));
      setText("");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="eng-thread">
      <p className="muted">
        The team is simulated. Replies are written by the Fydell server from the task’s scenario,
        and your messages are part of what the hiring team reviews.
      </p>
      {view.scenario.teammates.length > 0 && (
        <ul className="eng-roster">
          {view.scenario.teammates.map((t) => (
            <li key={t.id}>
              <span className="strong">{t.name}</span> <span className="muted">· {t.title}</span>
              {t.askAbout && <div className="muted">Ask about: {t.askAbout}</div>}
            </li>
          ))}
        </ul>
      )}
      <div className="eng-thread-scroll" aria-live="polite">
        {sorted.length === 0 ? (
          <EmptyState icon="chat" title="No messages yet" body="Your lead's kickoff appears here when the task starts." />
        ) : (
          sorted.map((m) => (
            <div key={m.id} className={`msg ${m.sender === "candidate" ? "me" : "simulated"}`}>
              <div className="who">
                <span>{senderName(m, view.scenario.teammates)}</span>
                {m.sender !== "candidate" && <ProvenanceTag kind="generated" />}
                <span className="msg-time">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="bubble eng-pre">{m.body}</div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      {error && <div className="error mt-3">{error}</div>}
      <div className="composer">
        <textarea
          className="textarea"
          rows={3}
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
          placeholder="Message the team (Ctrl+Enter to send)"
          aria-label="Message to the team"
        />
        <button className="btn" disabled={!text.trim() || busy} onClick={() => void send()}>
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- package, upload, handoff, submit ---------------- */

function PackageSection({
  detail,
  onUploaded,
}: {
  detail: EngAttemptDetail;
  onUploaded: (o: EngUploadOutcome) => void;
}) {
  const attemptId = detail.view.attempt.id;
  const [plan, setPlan] = useState<EngPackagePlan | null>(null);
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState<EngUploadPhase | null>(null);
  const [outcome, setOutcome] = useState<EngUploadOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      setPlan(await engApi.packagePreview(attemptId));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setChecking(false);
    }
  }, [attemptId]);

  const upload = async () => {
    setError(null);
    setOutcome(null);
    setPhase("packaging");
    const unlisten = await listen<{ attempt_id: string; phase: EngUploadPhase }>("eng-upload-progress", (e) => {
      if (e.payload.attempt_id === attemptId) setPhase(e.payload.phase);
    });
    try {
      const o = await engApi.uploadPackage(attemptId);
      setOutcome(o);
      onUploaded(o);
      void check();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      unlisten();
      setPhase(null);
    }
  };

  if (!detail.local) {
    return (
      <div>
        <p className="muted">
          This computer does not have the project folder for this task yet. Download the starter
          here, or upload from the web if you worked in a folder you set up there.
        </p>
        <p className="muted">
          Downloading again creates a fresh copy of the starter; it does not contain changes you made
          elsewhere.
        </p>
      </div>
    );
  }

  const latest = detail.view.uploads[0] ?? null;
  const phaseText = phase === "packaging" ? "Packaging…" : phase === "uploading" ? "Uploading…" : phase === "validating" ? "Fydell is checking the ZIP…" : null;

  return (
    <div>
      <p className="muted">
        Check the package to see exactly which files from the project folder would be uploaded and
        which are left out. Uploading does not submit; you can upload again until you submit.
      </p>
      <div className="row mt-3">
        <button className="btn ghost" disabled={checking || phase != null} onClick={() => void check()}>
          {checking ? "Checking…" : plan ? "Check again" : "Check package"}
        </button>
        <button className="btn" disabled={!plan || plan.problems.length > 0 || phase != null} onClick={() => void upload()}>
          {phaseText ?? "Upload package"}
        </button>
      </div>
      {error && <div className="error mt-3">{error}</div>}

      {plan && (
        <div className="eng-plan mt-3">
          <div className="strong">{packageSummary(plan)}</div>
          {plan.problems.length > 0 && (
            <div className="error mt-2">
              <Bullets items={plan.problems} />
            </div>
          )}
          <details className="eng-disclosure">
            <summary>Included files ({plan.included.length})</summary>
            <ul className="eng-files">
              {plan.included.map((f) => (
                <li key={f.path}>
                  <span className="mono">{plan.root}/{f.path}</span>
                  <span className={`chip ${f.change === "unchanged" ? "" : "chip-warn"}`}>{f.change}</span>
                  <span className="muted">{formatBytes(f.bytes)}</span>
                </li>
              ))}
            </ul>
          </details>
          {plan.excluded.length > 0 && (
            <details className="eng-disclosure">
              <summary>Left out ({plan.excluded.length})</summary>
              <ul className="eng-files">
                {plan.excluded.map((f) => (
                  <li key={f.path}>
                    <span className="mono">{f.path}</span>
                    <span className="muted">{exclusionLabel(f.reason)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {plan.removedFromStarter.length > 0 && (
            <details className="eng-disclosure">
              <summary>Starter files you removed ({plan.removedFromStarter.length})</summary>
              <Bullets items={plan.removedFromStarter} />
            </details>
          )}
        </div>
      )}

      {outcome ? (
        <div className={`eng-upload mt-3 ${outcome.upload.status === "accepted" ? "ok" : "bad"}`} role="status">
          <div className="strong">{uploadStatusText(outcome.upload)}</div>
          <div className="muted">
            {outcome.fileCount} files · {formatBytes(outcome.localBytes)} · SHA-256{" "}
            <span className="mono">{outcome.localSha256.slice(0, 16)}…</span>
          </div>
          {outcome.upload.status === "accepted" && !outcome.matchesLocal && (
            <div className="error mt-2">
              Fydell’s copy has a different SHA-256 than the archive built here. Upload again before submitting.
            </div>
          )}
        </div>
      ) : (
        latest && (
          <div className={`eng-upload mt-3 ${latest.status === "accepted" ? "ok" : "bad"}`}>
            <div className="strong">Latest upload: {uploadStatusText(latest)}</div>
            <div className="muted">
              {new Date(latest.created_at).toLocaleString()}
              {latest.byte_size != null && <> · {formatBytes(latest.byte_size)}</>}
              {latest.sha256 && (
                <>
                  {" "}· SHA-256 <span className="mono">{latest.sha256.slice(0, 16)}…</span>
                </>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function EngWork({
  detail,
  onDetail,
  onLocal,
  onRefresh,
  onAuthExpired,
}: {
  detail: EngAttemptDetail;
  onDetail: (d: EngAttemptDetail) => void;
  onLocal: (l: EngLocalState) => void;
  onRefresh: () => Promise<void>;
  onAuthExpired: () => void;
}) {
  const { view } = detail;
  const attemptId = view.attempt.id;
  const [tab, setTab] = useState<Tab>("brief");
  const [messages, setMessages] = useState<EngMessage[]>(view.messages);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [seenMessages, setSeenMessages] = useState(view.messages);
  if (seenMessages !== view.messages) {
    setSeenMessages(view.messages);
    setMessages((prev) => (view.messages.length >= prev.length ? view.messages : prev));
  }

  const fields = useMemo(() => handoffFields(view.scenario.handoffPrompts), [view.scenario.handoffPrompts]);
  const { drafts, change, keepMine, takeSaved, retry } = useDrafts(attemptId, view.drafts, fields);
  const answers = useMemo(() => Object.fromEntries(fields.map((f) => [f, drafts[f]?.body ?? ""])), [fields, drafts]);
  const blockers = handoffBlockers(view.scenario.handoffPrompts, answers);
  const chosen = submittableUpload(view.uploads, detail.local);
  const updatePending = view.update != null && !view.attempt.updateAcknowledgedAt;

  const acknowledge = async () => {
    setAckBusy(true);
    setAckError(null);
    try {
      await engApi.acknowledgeUpdate(attemptId);
      await onRefresh();
    } catch (e) {
      setAckError(messageOf(e));
    } finally {
      setAckBusy(false);
    }
  };

  const submit = async () => {
    if (!chosen) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await engApi.submit(attemptId, chosen.upload.id, answers);
      setConfirming(false);
      onDetail(await engApi.openAttempt(attemptId));
    } catch (e) {
      if (isAuthRequired(e)) {
        onAuthExpired();
        return;
      }
      setSubmitError(messageOf(e));
      setConfirming(false);
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {view.update && (
        <div className={`milestone-banner mb-3 ${updatePending ? "" : "eng-update-read"}`} role="status">
          <div className="milestone-text">
            <div className="milestone-title">
              Requirement update from {view.update.from}: {view.update.title}
            </div>
            <div className="milestone-body eng-pre">{view.update.body}</div>
            {ackError && <div className="error mt-2">{ackError}</div>}
          </div>
          {updatePending ? (
            <button className="btn sm" disabled={ackBusy} onClick={() => void acknowledge()}>
              {ackBusy ? "Saving…" : "Mark as read"}
            </button>
          ) : (
            <span className="muted">Read</span>
          )}
        </div>
      )}

      <div className="panel-tabs" role="tablist">
        {(["brief", "team", "submit"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`panel-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "brief" ? "Brief" : t === "team" ? `Team (${messages.length})` : "Package & submit"}
          </button>
        ))}
      </div>

      <div className="eng-tab-body">
        {tab === "brief" && (
          <div className="eng-brief">
            <WorkspaceCard attemptId={attemptId} local={detail.local} plannedDir={detail.plannedProjectDir} allowPrepare onPrepared={onLocal} />
            <h3 className="eng-h3">The task</h3>
            <Bullets items={view.scenario.candidateBrief} />
            <h3 className="eng-h3">Requirements</h3>
            <Bullets items={view.scenario.initialRequirements} />
            {view.update && (
              <p className="muted">The requirement update above also applies.</p>
            )}
            {view.scenario.resources.length > 0 && (
              <>
                <h3 className="eng-h3">In the project</h3>
                <ul className="eng-files">
                  {view.scenario.resources.map((r) => (
                    <li key={r.path}>
                      <span className="mono">{r.path}</span>
                      <span className="muted">{r.description}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h3 className="eng-h3">Run the public tests</h3>
            <CopyLine label="Test command" text={setupCommandFor(detail.os, view.scenario.testCommands)} />
            {view.scenario.knownIssues.length > 0 && (
              <details className="eng-disclosure">
                <summary>Known issues</summary>
                <Bullets items={view.scenario.knownIssues} />
              </details>
            )}
            <details className="eng-disclosure">
              <summary>Allowed tools and AI use</summary>
              <Bullets items={view.scenario.aiPolicy} />
            </details>
          </div>
        )}

        {tab === "team" && <TeamThread detail={detail} messages={messages} onMessages={setMessages} />}

        {tab === "submit" && (
          <div className="eng-submit">
            <section>
              <h3 className="eng-h3">1. Package your project</h3>
              {view.scenario.packaging.length > 0 && <Bullets items={view.scenario.packaging} />}
              <PackageSection detail={detail} onUploaded={() => void onRefresh()} />
            </section>

            <section>
              <h3 className="eng-h3">2. Handoff</h3>
              <p className="muted">Saved to Fydell as you type, so you can close the app and come back.</p>
              {view.scenario.handoffPrompts.map((p) => (
                <HandoffField
                  key={p.field}
                  label={p.label}
                  help={p.help}
                  draft={drafts[p.field]}
                  onChange={(b) => change(p.field, b)}
                  onKeepMine={() => keepMine(p.field)}
                  onUseSaved={() => takeSaved(p.field)}
                  onRetry={() => retry(p.field)}
                />
              ))}
              <HandoffField
                label="AI assistance (optional)"
                help="If you used an AI assistant, say how. This is recorded as your statement; it is not checked or scored on its own."
                draft={drafts[AI_USE_FIELD]}
                onChange={(b) => change(AI_USE_FIELD, b)}
                onKeepMine={() => keepMine(AI_USE_FIELD)}
                onUseSaved={() => takeSaved(AI_USE_FIELD)}
                onRetry={() => retry(AI_USE_FIELD)}
              />
            </section>

            <section>
              <h3 className="eng-h3">3. Submit</h3>
              {!chosen && <p className="muted">Upload a package that passes Fydell’s checks first.</p>}
              {chosen && !chosen.verifiedLocally && (
                <p className="muted">
                  The accepted upload was not built by this app on this computer (or its fingerprint does
                  not match what was built here). It will be submitted as Fydell stored it.
                </p>
              )}
              {blockers.length > 0 && <Bullets items={blockers} />}
              {submitError && <div className="error mt-2">{submitError}</div>}
              <div className="row mt-3">
                <button className="btn" disabled={!chosen || blockers.length > 0 || submitting} onClick={() => setConfirming(true)}>
                  Review and submit
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {confirming && chosen && (
        <Dialog
          title="Submit this work?"
          onClose={() => !submitting && setConfirming(false)}
          actions={[
            { label: "Keep working", kind: "ghost", onClick: () => setConfirming(false), disabled: submitting },
            { label: "Submit", onClick: () => void submit(), disabled: submitting, busyLabel: "Submitting…" },
          ]}
        >
          <p>You can submit once. After this, the ZIP and your answers are sealed and sent for review.</p>
          <div className="receipt-box">
            <div>
              <span className="k">archive </span>
              {chosen.upload.byte_size != null ? formatBytes(chosen.upload.byte_size) : "size unknown"} ·{" "}
              {chosen.upload.file_list.length} files
            </div>
            {chosen.upload.sha256 && (
              <div>
                <span className="k">sha256 </span>
                <span className="hash">{chosen.upload.sha256}</span>
              </div>
            )}
            <div>
              <span className="k">uploaded </span>
              {new Date(chosen.upload.created_at).toLocaleString()}
            </div>
          </div>
          <p className="muted">If you changed files after this upload, keep working and upload again first.</p>
        </Dialog>
      )}
    </div>
  );
}

function HandoffField({
  label,
  help,
  draft,
  onChange,
  onKeepMine,
  onUseSaved,
  onRetry,
}: {
  label: string;
  help: string;
  draft: DraftState | undefined;
  onChange: (body: string) => void;
  onKeepMine: () => void;
  onUseSaved: () => void;
  onRetry: () => void;
}) {
  if (!draft) return null;
  return (
    <div className="eng-field">
      <div className="row">
        <label className="strong">{label}</label>
        <div className="spacer" />
        {draft.status === "error" ? (
          <button className="btn ghost sm" onClick={onRetry}>
            Not saved — retry
          </button>
        ) : (
          <span className="muted">{draftStatusText(draft.status)}</span>
        )}
      </div>
      {help && <div className="muted">{help}</div>}
      <textarea
        className="textarea mt-2"
        rows={4}
        value={draft.body}
        maxLength={8000}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      />
      {draft.conflict && (
        <div className="milestone-banner mt-2" role="alert">
          <div className="milestone-text">
            <div className="milestone-title">This answer was changed in another window</div>
            <div className="milestone-body eng-pre">{draft.conflict.body || "(empty)"}</div>
          </div>
          <div className="row">
            <button className="btn ghost sm" onClick={onUseSaved}>
              Use that version
            </button>
            <button className="btn sm" onClick={onKeepMine}>
              Keep mine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
