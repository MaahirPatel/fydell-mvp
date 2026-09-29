"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { CONTACT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/cn";
import type { CandidateView } from "@/lib/eng/candidate-view";
import { engFetch, formatBytes } from "./api";
import { BulletList, Disclosure, PolicyDisclosures } from "./CandidateParts";
import { CommandBlock } from "./CommandBlock";
import { LocalTime } from "./LocalTime";
import type { DraftKey, DraftState } from "./useDrafts";

type View = CandidateView;
type Upload = View["uploads"][number];
type Message = View["messages"][number];

const TABS = ["brief", "team", "updates", "submit"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { brief: "Brief", team: "Team", updates: "Updates", submit: "Submit" };

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function newId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export interface DraftsApi {
  drafts: Record<DraftKey, DraftState>;
  change: (key: DraftKey, body: string) => void;
  resolve: (key: DraftKey, keep: "mine" | "theirs") => void;
  dirtyKeys: DraftKey[];
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function Countdown({ view, now }: { view: View; now: number }) {
  if (!view.attempt.dueAt) return null;
  const due = new Date(view.attempt.dueAt).getTime();
  const graceEnd = due + view.scenario.submissionGraceMinutes * 60000;
  const late = now > due && now <= graceEnd;
  const closed = now > graceEnd;
  return (
    <div role="timer" aria-live="off" className="sm:text-right">
      <p className={cn("font-mono text-[18px] tabular-nums", late ? "text-[var(--fydell-changed)]" : closed ? "text-[var(--fydell-risk)]" : "text-[var(--text-primary)]")}>
        {closed ? "0:00" : formatRemaining((late ? graceEnd : due) - now)}
      </p>
      <p className="text-app-meta text-[var(--text-tertiary)]">
        {closed ? "Submission closed" : late ? "Late uploads still accepted" : (
          <>
            Due <LocalTime iso={view.attempt.dueAt} />
          </>
        )}
        {view.attempt.extensionMinutes ? ` · includes ${view.attempt.extensionMinutes} min extension` : ""}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brief                                                               */
/* ------------------------------------------------------------------ */

function BriefTab({ view }: { view: View }) {
  const s = view.scenario;
  return (
    <Panel>
      <PanelSection title="Incident" description={s.summary}>
        <BulletList items={s.candidateBrief} className="text-app-body text-[var(--text-secondary)]" />
      </PanelSection>
      <PanelSection title="Initial requirements" description="From INCIDENT.md. The team's update adds to these; it does not replace them.">
        <ol className="grid list-decimal gap-1.5 pl-5 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          {s.initialRequirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </PanelSection>
      <PanelSection
        title="In the project"
        action={
          <a
            href={`/api/eng/attempts/${view.attempt.id}/starter`}
            download
            className="inline-flex h-8 items-center rounded-[8px] px-3 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            Download {s.starterRoot}.zip again
          </a>
        }
      >
        <ul className="grid gap-2 text-app-body">
          {s.resources.map((r) => (
            <li key={r.path} className="grid gap-0.5 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-4">
              <code className="font-mono text-[12.5px] text-[var(--text-primary)]">{r.path}</code>
              <span className="text-[var(--text-secondary)]">{r.description}</span>
            </li>
          ))}
        </ul>
      </PanelSection>
      <PanelSection title="Run the public tests" description="From the project folder. Several fail until the incident is fixed; Fydell runs further checks of its own after you submit.">
        <CommandBlock label="Public test command" commands={s.testCommands} />
      </PanelSection>
      <PanelSection>
        <PolicyDisclosures aiPolicy={s.aiPolicy} accommodations={s.accommodations} />
      </PanelSection>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

function TeamTab({
  view,
  messages,
  setMessages,
  disabled,
  draftsApi,
}: {
  view: View;
  messages: Message[];
  setMessages: (m: Message[]) => void;
  disabled: boolean;
  draftsApi: DraftsApi;
}) {
  const [pending, setPending] = useState<{ id: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const names = useMemo(() => Object.fromEntries(view.scenario.teammates.map((t) => [t.id, t.name])), [view.scenario.teammates]);
  const text = draftsApi.drafts.message.body;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, pending]);

  async function send(body: string, id: string) {
    setError(null);
    setPending({ id, body });
    const res = await engFetch<{ messages: Message[] }>(`/api/eng/attempts/${view.attempt.id}/messages`, { body: { body, clientMsgId: id } });
    if (res.ok === false) {
      setError(res.status === 0 ? "Not sent: you appear to be offline. Retry when the connection is back; it will not be sent twice." : res.error);
      return;
    }
    setPending(null);
    setMessages(res.data.messages);
  }

  return (
    <Panel>
      <PanelSection title="Team thread">
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-app-body">
          {view.scenario.teammates.map((t) => (
            <li key={t.id}>
              <span className="text-[var(--text-primary)]">{t.name}</span> <span className="text-[var(--text-secondary)]">· {t.title}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 max-w-[68ch] text-app-meta leading-[1.55] text-[var(--text-tertiary)]">
          Simulated teammates. They answer from a fixed set of facts about this incident, the same for every candidate. If a question is not covered, they say so; note your assumption in the handoff.
        </p>
      </PanelSection>
      <PanelSection>
        <ol className="grid max-h-[52vh] min-h-[200px] content-start gap-2 overflow-auto pr-1" aria-live="polite" aria-label="Messages">
          {messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "max-w-[80ch] rounded-[var(--radius-panel)] px-3 py-2",
                m.sender === "candidate" ? "ml-10 bg-[var(--surface-hover)]" : "mr-10 border border-[var(--border-subtle)]"
              )}
            >
              <p className="text-app-meta">
                <span className="font-medium text-[var(--text-primary)]">{m.sender === "candidate" ? "You" : names[m.teammate_id ?? ""] ?? "Teammate"}</span>
                <span className="ml-2 text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.55] text-[var(--text-secondary)]">{m.body}</p>
            </li>
          ))}
          {pending ? (
            <li className="ml-10 rounded-[var(--radius-panel)] bg-[var(--surface-hover)] px-3 py-2 opacity-70">
              <p className="text-app-meta text-[var(--text-tertiary)]">{error ? "Not sent" : "Sending…"}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-app-body text-[var(--text-secondary)]">{pending.body}</p>
            </li>
          ) : null}
          {messages.length === 0 && !pending ? <li className="text-app-meta text-[var(--text-tertiary)]">No messages yet. Ask what you would ask a teammate on a real incident.</li> : null}
          <div ref={endRef} />
        </ol>
      </PanelSection>
      <PanelSection>
        <FormError>{error}</FormError>
        {pending && error ? (
          <div className="mb-2">
            <Button size="sm" variant="secondary" onClick={() => send(pending.body, pending.id)}>
              Retry sending
            </Button>
          </div>
        ) : null}
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const body = text.trim();
            if (!body || pending) return;
            draftsApi.change("message", "");
            void send(body, newId());
          }}
        >
          <Textarea
            aria-label="Message the team"
            value={text}
            onChange={(e) => draftsApi.change("message", e.target.value)}
            rows={3}
            maxLength={4000}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }}
            placeholder={disabled ? "The thread is closed." : "Ask a question. Ctrl+Enter to send."}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="md" variant="secondary" disabled={disabled || !text.trim() || Boolean(pending)}>
              Send
            </Button>
            <span className="text-app-meta text-[var(--text-tertiary)]">Unsent text is saved, so a refresh will not lose it.</span>
          </div>
        </form>
      </PanelSection>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Updates                                                             */
/* ------------------------------------------------------------------ */

function UpdatesTab({ view, onAcknowledged }: { view: View; onAcknowledged: (at: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expected = view.attempt.startedAt ? new Date(new Date(view.attempt.startedAt).getTime() + view.scenario.updateAfterMinutes * 60000).toISOString() : null;
  if (!view.update) {
    return (
      <Panel>
        <PanelSection title="Updates" description="One requirement update from the team arrives during the task.">
          <p className="max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
            Nothing yet. It is due about {view.scenario.updateAfterMinutes} minutes after you started{expected ? <> (around <LocalTime iso={expected} />)</> : null}. When it arrives you will see a
            notice on this page and a message in the team thread. No browser permission is needed. If you try to submit before then, it is posted first so you can respond to it.
          </p>
        </PanelSection>
      </Panel>
    );
  }
  return (
    <Panel>
      <PanelSection
        title={view.update.title}
        description={
          <>
            From {view.update.from}
            {view.attempt.updateReleasedAt ? (
              <>
                {" · "}
                <LocalTime iso={view.attempt.updateReleasedAt} />
              </>
            ) : null}
          </>
        }
      >
        <p className="max-w-[72ch] whitespace-pre-wrap text-app-body leading-[1.65] text-[var(--text-primary)]">{view.update.body}</p>
        <div className="mt-4">
          {view.attempt.updateAcknowledgedAt ? (
            <p className="text-app-meta text-[var(--text-tertiary)]">
              You marked this as read <LocalTime iso={view.attempt.updateAcknowledgedAt} />.
            </p>
          ) : (
            <div className="grid gap-2">
              <FormError>{error}</FormError>
              <div>
                <Button
                  variant="secondary"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    const res = await engFetch<{ acknowledgedAt: string }>(`/api/eng/attempts/${view.attempt.id}/acknowledge-update`, { body: {} });
                    setBusy(false);
                    if (res.ok === false) setError(res.error);
                    else onAcknowledged(res.data.acknowledgedAt);
                  }}
                >
                  Mark as read
                </Button>
              </div>
            </div>
          )}
        </div>
      </PanelSection>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Submit                                                              */
/* ------------------------------------------------------------------ */

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const MAX_BYTES = 5 * 1024 * 1024;

function putWithProgress(url: string, file: File, onProgress: (fraction: number) => void): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", file);
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    if (ANON_KEY) xhr.setRequestHeader("apikey", ANON_KEY);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    xhr.onerror = () => resolve({ ok: false, status: 0 });
    xhr.onabort = () => resolve({ ok: false, status: 0 });
    xhr.send(form);
  });
}

function UploadCard({ attemptId, uploads, onUploaded, disabled }: { attemptId: string; uploads: Upload[]; onUploaded: (u: Upload) => void; disabled: boolean }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "validating">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = uploads[0] ?? null;

  async function handle(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Choose a .zip file of your project folder.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. The limit is 5 MB; leave out virtual environments, caches and .git.`);
      return;
    }
    setPhase("uploading");
    setProgress(0);
    const init = await engFetch<{ uploadId: string; signedUrl: string }>(`/api/eng/attempts/${attemptId}/uploads`, { body: { fileName: file.name, byteSize: file.size } });
    if (init.ok === false) {
      setPhase("idle");
      setProgress(null);
      setError(init.error);
      return;
    }
    const put = await putWithProgress(init.data.signedUrl, file, setProgress);
    setPhase("validating");
    const fin = await engFetch<{ upload: Upload }>(`/api/eng/attempts/${attemptId}/uploads/${init.data.uploadId}/finalize`, { body: {} });
    setPhase("idle");
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (fin.ok === false) {
      setError(put.ok ? fin.error : "The upload was interrupted. Nothing was submitted; choose the file again.");
      return;
    }
    onUploaded(fin.data.upload);
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          id="archive-input"
          disabled={disabled || phase !== "idle"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handle(file);
          }}
        />
        <Button variant="secondary" disabled={disabled || phase !== "idle"} onClick={() => inputRef.current?.click()}>
          {latest?.status === "accepted" ? "Replace ZIP" : "Choose ZIP file"}
        </Button>
        {phase === "uploading" && progress !== null ? (
          <div className="flex min-w-[220px] items-center gap-2" role="progressbar" aria-label="Uploading" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className="text-app-meta text-[var(--text-secondary)]">Uploading</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <div className="h-full bg-[var(--fydell-brand-blue)] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="text-app-meta tabular-nums text-[var(--text-secondary)]">{Math.round(progress * 100)}%</span>
          </div>
        ) : null}
        {phase === "validating" ? (
          <span role="status" className="text-app-meta text-[var(--text-secondary)]">
            Validating the ZIP…
          </span>
        ) : null}
      </div>
      <FormError>{error}</FormError>
      {latest && phase === "idle" ? (
        latest.status === "accepted" ? (
          <FormSuccess>
            {latest.original_filename ?? "ZIP"} is valid: {latest.file_list.length} files, {formatBytes(latest.byte_size)}. It is not submitted yet.
            <details className="mt-1">
              <summary className="cursor-pointer text-app-meta">Files included</summary>
              <ul className="mt-1 grid max-h-48 gap-0.5 overflow-auto font-mono text-[11.5px]">
                {latest.file_list.map((f) => (
                  <li key={f.path}>
                    {f.path} <span className="opacity-70">({formatBytes(f.size)})</span>
                  </li>
                ))}
              </ul>
            </details>
          </FormSuccess>
        ) : latest.status === "rejected" || latest.status === "failed" ? (
          <FormError>
            {latest.original_filename ?? "The ZIP"} was not accepted: {latest.rejection_detail ?? "it could not be checked"}. Fix it and choose the file again.
          </FormError>
        ) : null
      ) : null}
    </div>
  );
}

function SubmitTab({
  view,
  uploads,
  setUploads,
  windowClosed,
  draftsApi,
  onSubmit,
  submitting,
  submitError,
}: {
  view: View;
  uploads: Upload[];
  setUploads: (fn: (prev: Upload[]) => Upload[]) => void;
  windowClosed: boolean;
  draftsApi: DraftsApi;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const { drafts, change, resolve } = draftsApi;
  const accepted = uploads.find((u) => u.status === "accepted") ?? null;
  const handoffDirty = draftsApi.dirtyKeys.some((k) => k !== "message");
  const missingChange = !drafts.what_changed.body.trim();
  const blocker = windowClosed
    ? "The submission window has closed."
    : !accepted
      ? "Upload a valid ZIP first."
      : missingChange
        ? "Answer “What changed?” first."
        : handoffDirty
          ? "Saving your handoff…"
          : null;

  return (
    <Panel>
      <PanelSection title="1. Upload your project" description="One .zip of the whole project folder, up to 5 MB. You can replace it until you submit.">
        <div className="grid gap-4">
          {windowClosed ? (
            <FormError>The submission window has closed. Contact the employer if you need an extension; extensions appear here automatically.</FormError>
          ) : (
            <UploadCard attemptId={view.attempt.id} uploads={uploads} onUploaded={(u) => setUploads((prev) => [u, ...prev])} disabled={windowClosed} />
          )}
          <div>
            <Disclosure summary="How to make the ZIP">
              <BulletList
                items={[
                  `Windows 11: right-click the ${view.scenario.starterRoot} folder, choose Compress to, then ZIP File.`,
                  `macOS: right-click the ${view.scenario.starterRoot} folder and choose Compress.`,
                  `Linux: zip -r ${view.scenario.starterRoot}.zip ${view.scenario.starterRoot}`,
                ]}
              />
            </Disclosure>
            <Disclosure summary="What to include and what is refused">
              <BulletList items={view.scenario.packaging} />
            </Disclosure>
          </div>
        </div>
      </PanelSection>
      <PanelSection title="2. Handoff" description="Write it the way you would hand a change to a teammate. It saves as you type.">
        <div className="grid gap-5">
          {view.scenario.handoffPrompts.map((p) => (
            <div key={p.field}>
              <Field label={p.label} htmlFor={`handoff-${p.field}`} help={p.help} optional={p.field !== "what_changed"}>
                <Textarea id={`handoff-${p.field}`} value={drafts[p.field].body} onChange={(e) => change(p.field, e.target.value)} rows={p.field === "what_changed" ? 5 : 3} maxLength={8000} />
              </Field>
              <DraftLine field={drafts[p.field]} onResolve={(keep) => resolve(p.field, keep)} />
            </div>
          ))}
          <div>
            <Field
              label="AI assistance"
              htmlFor="handoff-ai_use"
              optional
              help="Which AI tools you used, if any, and for what. Recorded as your own statement; permitted tools never count against you."
            >
              <Textarea id="handoff-ai_use" value={drafts.ai_use.body} onChange={(e) => change("ai_use", e.target.value)} rows={2} maxLength={4000} />
            </Field>
            <DraftLine field={drafts.ai_use} onResolve={(keep) => resolve("ai_use", keep)} />
          </div>
        </div>
      </PanelSection>
      <PanelSection title="3. Submit">
        <div className="grid gap-3">
          {!view.update ? (
            <p className="max-w-[68ch] text-app-meta leading-[1.55] text-[var(--text-secondary)]">
              The team update has not arrived yet. If you submit now, it is posted first and you can respond to it before submitting again.
            </p>
          ) : null}
          <FormError>{submitError}</FormError>
          {confirming && !blocker ? (
            <div className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--border-default)] px-4 py-3">
              <p className="text-app-body text-[var(--text-primary)]">Submit {accepted?.original_filename ?? "your ZIP"} and your handoff? You cannot change either afterwards.</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="accent"
                  loading={submitting}
                  onClick={() => {
                    setConfirming(false);
                    onSubmit();
                  }}
                >
                  Confirm and submit
                </Button>
                <Button variant="quiet" onClick={() => setConfirming(false)} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="accent" size="lg" loading={submitting} disabled={Boolean(blocker)} onClick={() => setConfirming(true)}>
                Submit
              </Button>
              <span className="text-app-meta text-[var(--text-secondary)]">{blocker ?? "Submits the valid ZIP above and your handoff."}</span>
            </div>
          )}
        </div>
      </PanelSection>
    </Panel>
  );
}

function DraftLine({ field, onResolve }: { field: DraftState; onResolve: (keep: "mine" | "theirs") => void }) {
  let status: React.ReactNode = null;
  if (field.status === "saving") status = <span className="text-[var(--text-tertiary)]">Saving…</span>;
  else if (field.status === "error") status = <span className="text-[var(--fydell-risk)]">Not saved yet. It retries when you are back online.</span>;
  else if (field.status === "conflict")
    status = (
      <span className="flex flex-wrap items-center gap-2 text-[var(--text-secondary)]">
        This answer was changed in another tab.
        <Button size="sm" variant="quiet" onClick={() => onResolve("theirs")}>
          Load that version
        </Button>
        <Button size="sm" variant="quiet" onClick={() => onResolve("mine")}>
          Keep this version
        </Button>
      </span>
    );
  else if (field.body !== field.saved) status = <span className="text-[var(--text-tertiary)]">Unsaved</span>;
  else if (field.revision > 0) status = <span className="text-[var(--text-tertiary)]">Saved</span>;
  return status ? <div className="mt-1 text-app-meta">{status}</div> : null;
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export function AssessmentWorkspace({
  view,
  now,
  online,
  messages,
  setMessages,
  uploads,
  setUploads,
  draftsApi,
  onAcknowledged,
  onSubmit,
  submitting,
  submitError,
}: {
  view: View;
  now: number;
  online: boolean;
  messages: Message[];
  setMessages: (m: Message[]) => void;
  uploads: Upload[];
  setUploads: (fn: (prev: Upload[]) => Upload[]) => void;
  draftsApi: DraftsApi;
  onAcknowledged: (at: string) => void;
  onSubmit: (goToUpdates: () => void) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const tab: Tab = TABS.find((t) => t === hash) ?? "brief";
  const teammateCount = messages.filter((m) => m.sender === "teammate").length;
  const [seenTeammates, setSeenTeammates] = useState(teammateCount);
  const unreadTeam = tab === "team" ? 0 : Math.max(0, teammateCount - seenTeammates);
  const updateUnread = Boolean(view.update && !view.attempt.updateAcknowledgedAt);

  const graceEnd = view.attempt.dueAt ? new Date(view.attempt.dueAt).getTime() + view.scenario.submissionGraceMinutes * 60000 : 0;
  const windowClosed = view.attempt.dueAt !== null && now > graceEnd;

  function go(next: Tab) {
    if (tab === "team" || next === "team") setSeenTeammates(teammateCount);
    if (next !== tab) window.location.hash = next;
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="min-w-0">
          <p className="text-app-meta text-[var(--text-tertiary)]">
            {view.role.organizationName} · {view.role.title}
          </p>
          <h1 className="mt-1 text-[24px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{view.scenario.title}</h1>
          <p className="mt-1 flex items-center gap-3 text-app-meta text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5" role="status">
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-[var(--fydell-good)]" : "bg-[var(--fydell-risk)]")} />
              {online ? "Connected" : "Offline: keep working locally; drafts save when you reconnect"}
            </span>
            <a href={CONTACT_MAILTO} className="underline underline-offset-2 hover:text-[var(--text-primary)]">
              Support
            </a>
          </p>
        </div>
        <Countdown view={view} now={now} />
      </header>

      {updateUnread && tab !== "updates" ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-2.5">
          <p className="text-app-body text-[var(--text-primary)]">
            <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--fydell-brand-blue)]" />
            New requirement update from {view.update?.from}.
          </p>
          <Button size="sm" variant="secondary" onClick={() => go("updates")}>
            Read update
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Task" className="md:sticky md:top-5 md:self-start">
          <ul className="flex gap-1 overflow-x-auto md:grid">
            {TABS.map((t) => {
              const badge = t === "team" && unreadTeam > 0 ? String(unreadTeam) : t === "updates" && updateUnread ? "New" : null;
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => go(t)}
                    aria-current={tab === t ? "page" : undefined}
                    className={cn(
                      "flex h-9 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 text-left text-[13.5px]",
                      tab === t ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {TAB_LABEL[t]}
                    {badge ? (
                      <span className="rounded-full bg-[var(--fydell-brand-blue)] px-1.5 text-[11px] font-medium leading-[18px] text-white">
                        {badge}
                        <span className="sr-only">{t === "team" ? " unread messages" : " update"}</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">
          {tab === "brief" ? <BriefTab view={view} /> : null}
          {tab === "team" ? <TeamTab view={view} messages={messages} setMessages={setMessages} disabled={windowClosed} draftsApi={draftsApi} /> : null}
          {tab === "updates" ? <UpdatesTab view={view} onAcknowledged={onAcknowledged} /> : null}
          {tab === "submit" ? (
            <SubmitTab
              view={view}
              uploads={uploads}
              setUploads={setUploads}
              windowClosed={windowClosed}
              draftsApi={draftsApi}
              onSubmit={() => onSubmit(() => go("updates"))}
              submitting={submitting}
              submitError={submitError}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}