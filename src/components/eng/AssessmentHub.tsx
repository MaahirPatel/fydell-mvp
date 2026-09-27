"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/Field";
import { Panel, PanelLabel, PanelSection } from "@/components/ui/Panel";
import { StatusTag } from "@/components/ui/StatusTag";
import { engFetch, formatBytes, formatDateTime } from "./api";
import type { CandidateView } from "@/lib/eng/candidate-view";

type View = CandidateView;
type Upload = View["uploads"][number];

function newId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 grid list-disc gap-1.5 pl-4 text-app-body leading-[1.6] text-[var(--text-secondary)]">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Clock                                                               */
/* ------------------------------------------------------------------ */

/** Ticks on the server's clock, so a wrong device clock cannot move the deadline. */
function useServerClock(serverNow: string) {
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    const offset = new Date(serverNow).getTime() - Date.now();
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [serverNow]);
  return now;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function DeadlineBar({ view, now }: { view: View; now: number }) {
  if (!view.attempt.dueAt || !view.attempt.startedAt) return null;
  const due = new Date(view.attempt.dueAt).getTime();
  const graceEnd = due + view.scenario.submissionGraceMinutes * 60000;
  const remaining = due - now;
  const late = remaining <= 0 && now <= graceEnd;
  const closed = now > graceEnd;
  return (
    <div
      role="timer"
      aria-live="off"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3"
    >
      <div>
        <p className="text-app-meta text-[var(--text-tertiary)]">
          {closed ? "Submission window closed" : late ? "Past the deadline: late uploads accepted for" : "Time remaining"}
        </p>
        <p className="font-mono text-[22px] tabular-nums text-[var(--text-primary)]">
          {closed ? "0:00" : late ? formatRemaining(graceEnd - now) : formatRemaining(remaining)}
        </p>
      </div>
      <div className="text-right text-app-meta text-[var(--text-secondary)]">
        <p>Due {formatDateTime(view.attempt.dueAt)}</p>
        {view.attempt.extensionMinutes ? <p>Includes a {view.attempt.extensionMinutes}-minute extension from the employer</p> : null}
        <p>Suggested effort about {view.scenario.targetMinutes} minutes</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Before starting                                                     */
/* ------------------------------------------------------------------ */

function TermsStep({ view, onView }: { view: View; onView: (v: View) => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Panel>
      <PanelSection title="1. Read the brief and the rules" description="Nothing is timed yet.">
        <PanelLabel>The task</PanelLabel>
        <List items={view.scenario.candidateBrief} />
        <PanelLabel className="mt-5">AI and tools</PanelLabel>
        <List items={view.scenario.aiPolicy} />
        <PanelLabel className="mt-5">Time and accommodations</PanelLabel>
        <List items={view.scenario.accommodations} />
        <PanelLabel className="mt-5">What you will upload</PanelLabel>
        <List items={view.scenario.packaging} />
        <PanelLabel className="mt-5">What is recorded</PanelLabel>
        <List
          items={[
            "Your messages in the team thread, the setup code, your uploaded archive, your handoff and timestamps of these actions.",
            "Your archive is run against trusted checks in an isolated environment. A qualified person reviews the results and writes the findings the employer sees.",
            "The employer makes the hiring decision. Fydell does not.",
          ]}
        />
        {view.scenario.knownIssues.length ? (
          <>
            <PanelLabel className="mt-5">Known issues</PanelLabel>
            <List items={view.scenario.knownIssues} />
          </>
        ) : null}
        <div className="mt-6 grid gap-3">
          <FormError>{error}</FormError>
          <label className="flex items-start gap-2 text-app-body text-[var(--text-primary)]">
            <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            I have read the brief, the AI policy and what is recorded, and I will do this task myself.
          </label>
          <div>
            <Button
              variant="accent"
              disabled={!agree}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await engFetch<{ view: View }>(`/api/eng/attempts/${view.attempt.id}/consent`, { body: {} });
                setBusy(false);
                if (res.ok === false) setError(res.error);
                else onView(res.data.view);
              }}
            >
              Continue to setup
            </Button>
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}

function SetupStep({ view, onView }: { view: View; onView: (v: View) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Panel>
      <PanelSection title="2. Set up on your machine" description="Setup time does not count. The timer starts only when you press Start.">
        <ol className="grid list-decimal gap-3 pl-4 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          <li>
            Download the starter project and unzip it anywhere.
            <div className="mt-2">
              <ButtonLink href={`/api/eng/attempts/${view.attempt.id}/starter`} variant="secondary" prefetch={false}>
                Download {view.scenario.starterRoot}.zip
              </ButtonLink>
            </div>
          </li>
          <li>
            Open a terminal in the <code className="font-mono text-[12.5px]">{view.scenario.starterRoot}</code> folder and run{" "}
            <code className="rounded bg-[var(--surface-hover)] px-1 font-mono text-[12.5px]">python preflight.py</code> (or <code className="font-mono text-[12.5px]">python3</code>).
          </li>
          <li>Paste the line that starts with the setup code below.</li>
        </ol>
        <div className="mt-5 grid gap-3">
          <FormError>{error}</FormError>
          <Field label="Setup code" htmlFor="setup-code" help="It proves Python works on your machine before the clock starts.">
            <Input id="setup-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="HWR-XXXXXXXX" autoComplete="off" spellCheck={false} />
          </Field>
          <div>
            <Button
              variant="accent"
              loading={busy}
              disabled={!code.trim()}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await engFetch<{ view: View }>(`/api/eng/attempts/${view.attempt.id}/preflight`, { body: { code } });
                setBusy(false);
                if (res.ok === false) setError(res.error);
                else onView(res.data.view);
              }}
            >
              Check setup code
            </Button>
          </div>
        </div>
        <PanelLabel className="mt-6">Supported setups</PanelLabel>
        <ul className="mt-2 grid gap-1.5 text-app-meta text-[var(--text-secondary)]">
          {view.scenario.supportedEnvironments.map((env) => (
            <li key={env.label}>
              <span className="text-[var(--text-primary)]">{env.label}</span> ({env.status}): {env.note}
            </li>
          ))}
        </ul>
      </PanelSection>
    </Panel>
  );
}

function StartStep({ view, onView }: { view: View; onView: (v: View) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Panel>
      <PanelSection title="3. Start when you are ready" description={`Setup check passed on ${view.attempt.preflightRuntime ?? "your machine"}.`}>
        <p className="text-app-body leading-[1.6] text-[var(--text-secondary)]">
          Pressing Start begins a {view.attempt.allowedMinutes + view.attempt.extensionMinutes}-minute window for about {view.scenario.targetMinutes} minutes of work. The team thread
          opens, and a requirement update arrives partway through. You can close this page and come back; the timer is kept on the server.
        </p>
        <div className="mt-5 grid gap-3">
          <FormError>{error}</FormError>
          <div>
            <Button
              variant="accent"
              size="lg"
              loading={busy}
              onClick={async () => {
                if (!window.confirm("Start the timer now?")) return;
                setBusy(true);
                setError(null);
                const res = await engFetch<{ view: View }>(`/api/eng/attempts/${view.attempt.id}/start`, { body: {} });
                setBusy(false);
                if (res.ok === false) setError(res.error);
                else onView(res.data.view);
              }}
            >
              Start
            </Button>
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Team thread                                                         */
/* ------------------------------------------------------------------ */

function Thread({
  view,
  messages,
  setMessages,
  disabled,
}: {
  view: View;
  messages: View["messages"];
  setMessages: (m: View["messages"]) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{ id: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const names = useMemo(() => Object.fromEntries(view.scenario.teammates.map((t) => [t.id, t.name])), [view.scenario.teammates]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, pending]);

  async function send(body: string, id: string) {
    setError(null);
    setPending({ id, body });
    const res = await engFetch<{ messages: View["messages"] }>(`/api/eng/attempts/${view.attempt.id}/messages`, { body: { body, clientMsgId: id } });
    if (res.ok === false) {
      setError(res.status === 0 ? "Not sent: you appear to be offline. Retry when the connection is back; it will not be duplicated." : res.error);
      return;
    }
    setPending(null);
    setMessages(res.data.messages);
  }

  return (
    <Panel>
      <PanelSection
        title="Team thread"
        description={`${view.scenario.teammates.map((t) => `${t.name}, ${t.title}`).join(". ")}. Ask what you would ask a real teammate.`}
      >
        <ol className="grid max-h-[460px] gap-2 overflow-auto pr-1" aria-live="polite">
          {messages.map((m) => (
            <li key={m.id} className={`rounded-[var(--radius-control)] px-3 py-2 ${m.sender === "candidate" ? "ml-8 bg-[var(--surface-hover)]" : "mr-8 border border-[var(--border-subtle)]"}`}>
              <p className="text-app-meta">
                <span className="font-medium text-[var(--text-primary)]">{m.sender === "candidate" ? "You" : names[m.teammate_id ?? ""] ?? "Teammate"}</span>
                <span className="ml-2 text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.55] text-[var(--text-secondary)]">{m.body}</p>
            </li>
          ))}
          {pending ? (
            <li className="ml-8 rounded-[var(--radius-control)] bg-[var(--surface-hover)] px-3 py-2 opacity-70">
              <p className="text-app-meta text-[var(--text-tertiary)]">{error ? "Not sent" : "Sending…"}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-app-body text-[var(--text-secondary)]">{pending.body}</p>
            </li>
          ) : null}
          {messages.length === 0 && !pending ? <li className="text-app-meta text-[var(--text-tertiary)]">No messages yet.</li> : null}
          <div ref={endRef} />
        </ol>
        <FormError>{error}</FormError>
        {pending && error ? (
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={() => send(pending.body, pending.id)}>
              Retry sending
            </Button>
          </div>
        ) : null}
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const body = text.trim();
            if (!body || pending) return;
            setText("");
            void send(body, newId());
          }}
        >
          <Textarea
            aria-label="Message the team"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={4000}
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
            }}
            placeholder={disabled ? "The thread is closed." : "Ask a question. Ctrl+Enter to send."}
          />
          <div>
            <Button type="submit" size="sm" variant="secondary" disabled={disabled || !text.trim() || Boolean(pending)}>
              Send
            </Button>
          </div>
        </form>
      </PanelSection>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Handoff drafts                                                      */
/* ------------------------------------------------------------------ */

type FieldKey = "what_changed" | "testing" | "risks" | "next_steps" | "ai_use";
interface DraftState {
  body: string;
  revision: number;
  saved: string;
  status: "idle" | "saving" | "error" | "conflict";
  conflict?: { body: string; revision: number };
}

function useDrafts(attemptId: string, initial: View["drafts"], keys: FieldKey[]) {
  const [drafts, setDrafts] = useState<Record<FieldKey, DraftState>>(() => {
    const out = {} as Record<FieldKey, DraftState>;
    for (const k of keys) {
      const d = initial[k];
      out[k] = { body: d?.body ?? "", revision: d?.revision ?? 0, saved: d?.body ?? "", status: "idle" };
    }
    return out;
  });
  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  const timers = useRef<Partial<Record<FieldKey, number>>>({});

  const save = useCallback(
    async (key: FieldKey, overrideRevision?: number) => {
      const current = draftsRef.current[key];
      if (current.body === current.saved && overrideRevision === undefined) return;
      const body = current.body;
      const baseRevision = overrideRevision ?? current.revision;
      setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], status: "saving" } }));
      const res = await engFetch<{ revision: number }>(`/api/eng/attempts/${attemptId}/drafts`, { method: "PUT", body: { field: key, body, baseRevision } });
      setDrafts((prev) => {
        const field = prev[key];
        if (res.ok === true) return { ...prev, [key]: { ...field, revision: res.data.revision, saved: body, status: field.body === body ? "idle" : field.status, conflict: undefined } };
        if (res.ok === false && res.status === 409 && res.body && typeof res.body.current === "object" && res.body.current) {
          const c = res.body.current as { body: string; revision: number };
          return { ...prev, [key]: { ...field, status: "conflict", conflict: c } };
        }
        return { ...prev, [key]: { ...field, status: "error" } };
      });
    },
    [attemptId]
  );

  const change = useCallback(
    (key: FieldKey, body: string) => {
      setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], body, status: prev[key].status === "conflict" ? "conflict" : "idle" } }));
      window.clearTimeout(timers.current[key]);
      timers.current[key] = window.setTimeout(() => {
        if (draftsRef.current[key].status !== "conflict") void save(key);
      }, 900);
    },
    [save]
  );

  const resolve = useCallback(
    (key: FieldKey, keep: "mine" | "theirs") => {
      const field = draftsRef.current[key];
      if (!field.conflict) return;
      if (keep === "theirs") {
        setDrafts((prev) => ({ ...prev, [key]: { body: field.conflict!.body, revision: field.conflict!.revision, saved: field.conflict!.body, status: "idle" } }));
      } else {
        void save(key, field.conflict.revision);
      }
    },
    [save]
  );

  const retryAll = useCallback(() => {
    for (const k of keys) {
      const f = draftsRef.current[k];
      if (f.status === "error" || (f.body !== f.saved && f.status !== "conflict" && f.status !== "saving")) void save(k);
    }
  }, [keys, save]);

  const dirty = keys.some((k) => drafts[k].body !== drafts[k].saved);
  return { drafts, change, resolve, retryAll, dirty };
}

function DraftStatus({ field }: { field: DraftState }) {
  if (field.status === "saving") return <span className="text-app-meta text-[var(--text-tertiary)]">Saving…</span>;
  if (field.status === "error") return <span className="text-app-meta text-[var(--fydell-risk)]">Not saved. Retrying when you are back online.</span>;
  if (field.status === "conflict") return null;
  if (field.body !== field.saved) return <span className="text-app-meta text-[var(--text-tertiary)]">Unsaved</span>;
  if (field.revision > 0) return <span className="text-app-meta text-[var(--text-tertiary)]">Saved</span>;
  return null;
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
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
  const [phase, setPhase] = useState<"idle" | "uploading" | "checking">("idle");
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
    setPhase("checking");
    const fin = await engFetch<{ upload: Upload }>(`/api/eng/attempts/${attemptId}/uploads/${init.data.uploadId}/finalize`, { body: {} });
    setPhase("idle");
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (fin.ok === false) {
      setError(put.ok ? fin.error : "The upload was interrupted. Your work is not lost; upload the file again.");
      return;
    }
    onUploaded(fin.data.upload);
  }

  return (
    <div className="grid gap-3">
      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          id="archive-input"
          disabled={disabled || phase !== "idle"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handle(file);
          }}
        />
        <Button variant="secondary" disabled={disabled || phase !== "idle"} onClick={() => inputRef.current?.click()}>
          {latest ? "Upload a new version" : "Choose ZIP file"}
        </Button>
        {phase === "uploading" && progress !== null ? (
          <div className="flex min-w-[200px] items-center gap-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <div className="h-full bg-[var(--fydell-brand-blue)] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="text-app-meta tabular-nums text-[var(--text-secondary)]">{Math.round(progress * 100)}%</span>
          </div>
        ) : null}
        {phase === "checking" ? <span className="text-app-meta text-[var(--text-secondary)]">Checking the archive…</span> : null}
      </div>
      {latest ? (
        latest.status === "accepted" ? (
          <FormSuccess>
            {latest.original_filename ?? "Archive"} passed the checks: {latest.file_list.length} files, {formatBytes(latest.byte_size)}. SHA-256 {latest.sha256?.slice(0, 12)}…
            <details className="mt-1">
              <summary className="cursor-pointer text-app-meta">Files included</summary>
              <ul className="mt-1 grid gap-0.5 font-mono text-[11.5px]">
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
            {latest.original_filename ?? "The archive"} was not accepted: {latest.rejection_detail ?? "it could not be checked"}. Fix it and upload again.
          </FormError>
        ) : null
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Submitted                                                           */
/* ------------------------------------------------------------------ */

const PROCESSING_LABEL: Record<string, string> = {
  not_queued: "Queued",
  queued: "Queued for checks",
  running: "Checks running",
  retryable_failure: "Delayed by a platform issue, retrying automatically",
  blocked: "Delayed by a platform issue; Fydell will follow up",
  human_review: "Checks finished; with a human reviewer",
  ready: "Reviewed and sent to the employer",
  canceled: "Cancelled",
};

function ReceiptPanel({ view }: { view: View }) {
  const r = view.receipt;
  if (!r) return null;
  return (
    <Panel>
      <PanelSection title="Submitted" description="Keep this receipt. It identifies exactly what you sent.">
        <dl className="grid gap-3 text-app-body sm:grid-cols-2">
          <div>
            <dt className="text-app-meta text-[var(--text-tertiary)]">Submitted</dt>
            <dd className="text-[var(--text-primary)]">
              {formatDateTime(r.submittedAt)} {r.late ? <StatusTag tone="changed">Late</StatusTag> : null}
            </dd>
          </div>
          <div>
            <dt className="text-app-meta text-[var(--text-tertiary)]">Receipt</dt>
            <dd className="font-mono text-[12.5px] text-[var(--text-primary)]">{r.submissionId}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-app-meta text-[var(--text-tertiary)]">Archive SHA-256 ({formatBytes(r.archiveBytes)})</dt>
            <dd className="break-all font-mono text-[12.5px] text-[var(--text-primary)]">{r.archiveSha256}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-app-meta text-[var(--text-tertiary)]">Status</dt>
            <dd className="text-[var(--text-primary)]">{PROCESSING_LABEL[r.processing] ?? r.processing}</dd>
          </div>
        </dl>
        <p className="mt-5 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          Next, your archive runs against the trusted checks in an isolated environment. The hiring team then reviews the results, your code, the thread and your handoff. If
          the checks environment fails, that is a platform problem and is never counted against you. The employer decides what happens next and contacts you directly.
        </p>
      </PanelSection>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Hub                                                                 */
/* ------------------------------------------------------------------ */

export default function AssessmentHub({ initial }: { initial: View }) {
  const [view, setView] = useState(initial);
  const [messages, setMessages] = useState(initial.messages);
  const [uploads, setUploads] = useState(initial.uploads);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const now = useServerClock(view.serverNow);
  const attemptId = view.attempt.id;
  const status = view.attempt.status;

  const applyView = useCallback((next: View) => {
    setView(next);
    setMessages(next.messages);
    setUploads(next.uploads);
  }, []);

  const handoffKeys = useMemo<FieldKey[]>(() => [...view.scenario.handoffPrompts.map((p) => p.field), "ai_use"], [view.scenario.handoffPrompts]);
  const { drafts, change, resolve, retryAll, dirty } = useDrafts(attemptId, initial.drafts, handoffKeys);

  useEffect(() => {
    window.addEventListener("online", retryAll);
    return () => window.removeEventListener("online", retryAll);
  }, [retryAll]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // While working, the server is polled so the requirement update, extensions
  // and evaluation progress appear without a manual refresh. Drafts are not
  // replaced by polling; they are reconciled by revision when saved.
  useEffect(() => {
    if (status !== "in_progress" && status !== "submitted") return;
    const interval = status === "in_progress" ? 20000 : 30000;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const res = await engFetch<{ view: View }>(`/api/eng/attempts/${attemptId}`);
      if (res.ok) applyView(res.data.view);
    }, interval);
    return () => window.clearInterval(id);
  }, [attemptId, status, applyView]);

  const [ackBusy, setAckBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accepted = uploads.find((u) => u.status === "accepted") ?? null;
  const graceEnd = view.attempt.dueAt ? new Date(view.attempt.dueAt).getTime() + view.scenario.submissionGraceMinutes * 60000 : 0;
  const windowClosed = status === "in_progress" && view.attempt.dueAt !== null && now > graceEnd;

  async function submit() {
    if (!accepted) return;
    if (!drafts.what_changed.body.trim()) {
      setSubmitError("Describe what you changed before submitting.");
      return;
    }
    if (!window.confirm("Submit now? You cannot change the archive or handoff afterwards.")) return;
    setSubmitting(true);
    setSubmitError(null);
    const body: Record<string, string> = { uploadId: accepted.id };
    for (const k of handoffKeys) body[k] = drafts[k].body;
    const res = await engFetch<{ receipt: View["receipt"] }>(`/api/eng/attempts/${attemptId}/submit`, { body });
    setSubmitting(false);
    if (res.ok === false) {
      setSubmitError(res.error);
      return;
    }
    const refreshed = await engFetch<{ view: View }>(`/api/eng/attempts/${attemptId}`);
    if (refreshed.ok) applyView(refreshed.data.view);
    else setView((v) => ({ ...v, attempt: { ...v.attempt, status: "submitted" }, receipt: res.data.receipt }));
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-app-meta text-[var(--text-tertiary)]">
          {view.role.organizationName} · {view.role.title}
        </p>
        <h1 className="mt-1 text-[24px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{view.scenario.title}</h1>
        <p className="mt-2 max-w-[72ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">{view.scenario.summary}</p>
      </header>

      {!online ? (
        <p role="status" className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-2.5 text-app-body text-[var(--text-primary)]">
          You are offline. Keep working locally; unsaved notes are kept on this page and saved when the connection returns.
        </p>
      ) : null}

      {status === "withdrawn" || status === "expired" ? (
        <Panel>
          <PanelSection title={status === "withdrawn" ? "The employer withdrew this invitation" : "This attempt has expired"} description="Nothing more is needed from you. Contact the employer if you think this is a mistake." />
        </Panel>
      ) : null}

      {status === "accepted" && !view.attempt.consentedAt ? <TermsStep view={view} onView={applyView} /> : null}
      {status === "accepted" && view.attempt.consentedAt ? <SetupStep view={view} onView={applyView} /> : null}
      {status === "preflight_passed" ? <StartStep view={view} onView={applyView} /> : null}

      {status === "in_progress" ? (
        <>
          <DeadlineBar view={view} now={now} />
          {view.update ? (
            <div
              role="region"
              aria-label="Requirement update"
              className="rounded-[var(--radius-panel)] border border-[rgba(233,185,73,0.35)] bg-[rgba(233,185,73,0.07)] px-4 py-3"
            >
              <p className="text-app-body font-medium text-[var(--text-primary)]">{view.update.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-secondary)]">{view.update.body}</p>
              {view.attempt.updateAcknowledgedAt ? (
                <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">Acknowledged {formatDateTime(view.attempt.updateAcknowledgedAt)}</p>
              ) : (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={ackBusy}
                    onClick={async () => {
                      setAckBusy(true);
                      const res = await engFetch<{ acknowledgedAt: string }>(`/api/eng/attempts/${attemptId}/acknowledge-update`, { body: {} });
                      setAckBusy(false);
                      if (res.ok) setView((v) => ({ ...v, attempt: { ...v.attempt, updateAcknowledgedAt: res.data.acknowledgedAt } }));
                    }}
                  >
                    I have read this
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Thread view={view} messages={messages} setMessages={setMessages} disabled={windowClosed} />
            <Panel>
              <PanelSection title="The brief" description={`Project download: ${view.scenario.starterRoot}.zip`}>
                <List items={view.scenario.candidateBrief} />
                <div className="mt-4">
                  <ButtonLink href={`/api/eng/attempts/${attemptId}/starter`} variant="quiet" size="sm" prefetch={false}>
                    Download the starter again
                  </ButtonLink>
                </div>
                <PanelLabel className="mt-5">Packaging</PanelLabel>
                <List items={view.scenario.packaging} />
              </PanelSection>
            </Panel>
          </div>

          <Panel>
            <PanelSection title="Handoff" description="Write it the way you would hand a change to a teammate. It saves as you type.">
              <div className="grid gap-4">
                {view.scenario.handoffPrompts.map((p) => (
                  <div key={p.field}>
                    <Field label={p.label} htmlFor={`handoff-${p.field}`} help={p.help} optional={p.field !== "what_changed"}>
                      <Textarea id={`handoff-${p.field}`} value={drafts[p.field].body} onChange={(e) => change(p.field, e.target.value)} rows={p.field === "what_changed" ? 5 : 3} maxLength={8000} />
                    </Field>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <DraftStatus field={drafts[p.field]} />
                      {drafts[p.field].status === "conflict" ? (
                        <span className="flex flex-wrap items-center gap-2 text-app-meta text-[var(--text-secondary)]">
                          This field was changed in another tab.
                          <Button size="sm" variant="quiet" onClick={() => resolve(p.field, "theirs")}>
                            Load that version
                          </Button>
                          <Button size="sm" variant="quiet" onClick={() => resolve(p.field, "mine")}>
                            Keep this version
                          </Button>
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div>
                  <Field
                    label="AI assistance"
                    htmlFor="handoff-ai_use"
                    optional
                    help="Describe any AI tools you used and for what. Using permitted tools does not count against you. This is recorded as your statement."
                  >
                    <Textarea id="handoff-ai_use" value={drafts.ai_use.body} onChange={(e) => change("ai_use", e.target.value)} rows={2} maxLength={4000} />
                  </Field>
                  <div className="mt-1">
                    <DraftStatus field={drafts.ai_use} />
                  </div>
                </div>
              </div>
            </PanelSection>
            <PanelSection title="Upload and submit" description="Upload a ZIP of the whole project folder. You can upload again until you submit; the latest accepted upload is the one submitted.">
              {windowClosed ? (
                <FormError>The submission window has closed. Contact the employer if you need an extension; extensions appear here automatically.</FormError>
              ) : (
                <UploadCard attemptId={attemptId} uploads={uploads} onUploaded={(u) => setUploads((prev) => [u, ...prev])} disabled={windowClosed} />
              )}
              <div className="mt-5 grid gap-3 border-t border-[var(--border-subtle)] pt-5">
                <FormError>{submitError}</FormError>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="accent" size="lg" loading={submitting} disabled={!accepted || windowClosed || dirty} onClick={submit}>
                    Submit
                  </Button>
                  <span className="text-app-meta text-[var(--text-secondary)]">
                    {!accepted ? "Upload an archive that passes the checks first." : dirty ? "Waiting for your handoff to save…" : "Submits the latest accepted archive and your handoff."}
                  </span>
                </div>
              </div>
            </PanelSection>
          </Panel>
        </>
      ) : null}

      {status === "submitted" ? <ReceiptPanel view={view} /> : null}
    </div>
  );
}
