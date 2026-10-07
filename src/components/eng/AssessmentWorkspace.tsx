"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BellDot, Check, FileCode2, FileText, MessagesSquare, Upload as UploadIcon, type LucideIcon } from "lucide-react";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Textarea } from "@/components/ui/Field";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { CONTACT_MAILTO } from "@/lib/contact";
import { cn } from "@/lib/cn";
import type { CandidateView } from "@/lib/eng/candidate-view";
import { engFetch, formatBytes } from "./api";
import { BulletList, Disclosure, JourneyRail, PolicyDisclosures } from "./CandidateParts";
import { CommandBlock } from "./CommandBlock";
import { LocalTime } from "./LocalTime";
import type { DraftKey, DraftState } from "./useDrafts";

type View = CandidateView;
type Upload = View["uploads"][number];
type Message = View["messages"][number];

const TABS = ["brief", "team", "updates", "submit"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { brief: "Brief", team: "Team", updates: "Updates", submit: "Submit" };
const TAB_HINT: Record<Tab, string> = {
  brief: "Incident, requirements, files",
  team: "Ask the simulated team",
  updates: "Changes to the brief",
  submit: "ZIP and handoff",
};
const TAB_ICON: Record<Tab, LucideIcon> = { brief: FileText, team: MessagesSquare, updates: BellDot, submit: UploadIcon };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function StepTitle({ n, done, children }: { n: number; done: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[13px]",
          done ? "bg-[var(--fy-accent)] text-white" : "border border-[var(--fy-accent-line)] bg-[var(--fy-accent-field)] text-[var(--fy-accent-ink)]"
        )}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
      </span>
      {children}
      {done ? <span className="sr-only"> (done)</span> : null}
    </span>
  );
}

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
    <div
      role="timer"
      aria-live="off"
      className={cn(
        "min-w-[200px] rounded-[12px] border bg-[var(--surface-raised)] px-4 py-3 shadow-[0_1px_2px_rgba(19,32,56,0.04)]",
        late ? "border-[#f0d9a8]" : closed ? "border-[var(--fy-red-line)]" : "border-[var(--border-default)]"
      )}
    >
      <p className="text-[13px] font-medium text-[var(--text-tertiary)]">{closed ? "Closed" : late ? "Grace period" : "Time left"}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-[26px] font-medium leading-tight tracking-[-0.02em] tabular-nums",
          late ? "text-[var(--fy-amber-ink)]" : closed ? "text-[var(--fy-red-ink)]" : "text-[var(--text-primary)]"
        )}
      >
        {closed ? "0:00" : formatRemaining((late ? graceEnd : due) - now)}
      </p>
      <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">
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
      <PanelSection title="How the task runs">
        <ol className="grid border-y border-[var(--border-subtle)] text-app-body">
          {[
            { when: "At start", what: `${s.kickoffFrom} posts the kickoff in Team.`, done: Boolean(view.attempt.startedAt) },
            { when: `About ${s.updateAfterMinutes} min in`, what: "The team posts one requirement update. It adds to the requirements below.", done: Boolean(view.attempt.updateReleasedAt) },
            { when: "Any time", what: `Ask ${s.teammates.map((t) => t.name.split(" ")[0]).join(" or ")} in Team. Write down any call you make yourself in the handoff.`, done: false },
            { when: "By the deadline", what: `Upload a ZIP of the project and answer: ${s.handoffPrompts.map((p) => p.label).join(" ")}`, done: Boolean(view.attempt.submittedAt) },
          ].map((step) => (
            <li key={step.when} className="grid grid-cols-[130px_minmax(0,1fr)_20px] items-baseline gap-3 border-t border-[var(--border-subtle)] py-2.5 first:border-t-0">
              <span className="text-app-meta text-[var(--text-tertiary)]">{step.when}</span>
              <span className="text-[var(--text-primary)]">{step.what}</span>
              {step.done ? <Check aria-label="Done" className="h-4 w-4 text-[var(--fy-accent-ink)]" strokeWidth={2} /> : <span />}
            </li>
          ))}
        </ol>
      </PanelSection>
      <PanelSection title="Initial requirements" description="From INCIDENT.md. The team's update adds to these; it does not replace them.">
        <ol className="grid overflow-hidden rounded-[10px] border border-[var(--border-subtle)] text-app-body leading-[1.55]">
          {s.initialRequirements.map((r, i) => (
            <li key={r} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 border-t border-[var(--border-subtle)] px-3 py-2.5 first:border-t-0">
              <span className="font-mono text-[13px] leading-[1.9] text-[var(--fy-accent-ink)]">R{i + 1}</span>
              <span className="text-[var(--text-primary)]">{r}</span>
            </li>
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
        <ul className="grid overflow-hidden rounded-[10px] border border-[var(--border-subtle)] text-app-body">
          {s.resources.map((r) => (
            <li key={r.path} className="grid gap-1 border-t border-[var(--border-subtle)] px-3 py-2.5 first:border-t-0 sm:grid-cols-[260px_minmax(0,1fr)] sm:gap-4">
              <code className="flex items-center gap-2 font-mono text-[13px] text-[var(--text-primary)]">
                <FileCode2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.8} />
                {r.path}
              </code>
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
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {view.scenario.teammates.map((t) => (
            <li key={t.id} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-[var(--fy-accent-soft)] text-[13px] font-semibold text-[var(--fy-accent-ink)]">
                {initials(t.name)}
              </span>
              <span className="min-w-0">
                <span className="block text-app-body font-medium text-[var(--text-primary)]">
                  {t.name} <span className="font-normal text-[var(--text-tertiary)]">· {t.title}</span>
                </span>
                {t.askAbout ? <span className="block text-app-meta leading-[1.5] text-[var(--text-secondary)]">{t.askAbout}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-[68ch] text-app-meta leading-[1.55] text-[var(--text-tertiary)]">
          Simulated teammates. They reply to what you write, and every candidate gets the same decisions from them. If something has not been decided, they say so; note your assumption in the handoff.
        </p>
      </PanelSection>
      <PanelSection>
        <ol className="grid max-h-[52vh] min-h-[200px] content-start gap-2 overflow-auto pr-1" aria-live="polite" aria-label="Messages">
          {messages.map((m) => {
            const who = m.sender === "candidate" ? "You" : names[m.teammate_id ?? ""] ?? "Teammate";
            const mine = m.sender === "candidate";
            return (
              <li key={m.id} className="grid max-w-[80ch] grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-[10px] px-2 py-2 hover:bg-[var(--surface-panel)]">
                <span
                  aria-hidden
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold",
                    mine ? "bg-[var(--surface-selected)] text-[var(--text-secondary)]" : "bg-[var(--fy-accent-soft)] text-[var(--fy-accent-ink)]"
                  )}
                >
                  {mine ? "You" : initials(who)}
                </span>
                <div className="min-w-0">
                  <p className="text-app-meta">
                    <span className="font-medium text-[var(--text-primary)]">{who}</span>
                    <span className="ml-2 text-[var(--text-tertiary)]">
                      {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-body)]">{m.body}</p>
                </div>
              </li>
            );
          })}
          {pending ? (
            <li className="ml-[42px] rounded-[10px] bg-[var(--surface-panel)] px-3 py-2 opacity-70">
              <p className="text-app-meta text-[var(--text-tertiary)]">{error ? "Not sent" : "Waiting for a reply…"}</p>
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
    <Panel className="border-t-2 border-t-[var(--fy-red)]">
      <PanelSection
        title={
          <>
            <span className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[var(--fy-red-ink)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fy-red)]" />
              Requirement changed
            </span>
            {view.update.title}
          </>
        }
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
              <ul className="mt-1 grid max-h-48 gap-0.5 overflow-auto font-mono text-[13px]">
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
      <PanelSection title={<StepTitle n={1} done={Boolean(accepted)}>Upload your project</StepTitle>} description="One .zip of the whole project folder, up to 5 MB. You can replace it until you submit.">
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
      <PanelSection title={<StepTitle n={2} done={!missingChange}>Write the handoff</StepTitle>} description="Write it the way you would hand a change to a teammate. It saves as you type.">
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
      <PanelSection title={<StepTitle n={3} done={false}>Submit</StepTitle>} description="Seals the ZIP and handoff together. You cannot change either afterwards.">
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

  const accepted = uploads.some((u) => u.status === "accepted");
  const checklist: { label: string; done: boolean; tab: Tab }[] = [
    { label: accepted ? "Valid ZIP uploaded" : "Upload your project ZIP", done: accepted, tab: "submit" },
    { label: "Answer “What changed?”", done: Boolean(draftsApi.drafts.what_changed.body.trim()), tab: "submit" },
    view.update
      ? { label: view.attempt.updateAcknowledgedAt ? "Team update read" : "Read the team update", done: Boolean(view.attempt.updateAcknowledgedAt), tab: "updates" }
      : { label: `Team update due ~${view.scenario.updateAfterMinutes} min in`, done: false, tab: "updates" },
  ];

  return (
    <div className="grid gap-6">
      <CandidatePageHead
        eyebrow={[view.role.organizationName, view.role.title]}
        title={view.scenario.title}
        aside={<Countdown view={view} now={now} />}
        meta={[
          {
            label: "Connection",
            value: (
              <span role="status" className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-[var(--fy-green-ink)]" : "bg-[var(--fy-red)]")} />
                {online ? "Connected" : "Offline. Keep working; drafts save when you reconnect"}
              </span>
            ),
          },
          { label: "Team update", value: view.update ? (view.attempt.updateAcknowledgedAt ? "Read" : "Arrived, not read") : "Not yet" },
          {
            label: "Support",
            value: (
              <a href={CONTACT_MAILTO} className="text-[var(--fy-accent-ink)] hover:underline">
                Email Fydell
              </a>
            ),
          },
        ]}
        rail={<JourneyRail at="work" />}
      />

      {updateUnread && tab !== "updates" ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--fy-red-line)] bg-[var(--fy-red-field)] px-4 py-3"
        >
          <p className="flex items-center gap-2.5 text-app-body text-[var(--text-primary)]">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[var(--fy-red)]" />
            <span>
              <span className="font-medium">The requirement changed.</span> {view.update?.from} posted an update to the brief.
            </span>
          </p>
          <Button size="sm" variant="secondary" onClick={() => go("updates")}>
            Read the update
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[232px_minmax(0,1fr)]">
        <div className="grid content-start gap-4 md:sticky md:top-[84px] md:self-start">
          <nav aria-label="Task">
            <ul className="flex gap-1 overflow-x-auto md:grid">
              {TABS.map((t) => {
                const badge = t === "team" && unreadTeam > 0 ? String(unreadTeam) : t === "updates" && updateUnread ? "New" : null;
                const Icon = TAB_ICON[t];
                return (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => go(t)}
                      aria-current={tab === t ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors",
                        tab === t ? "bg-[var(--surface-raised)] shadow-[0_0_0_1px_var(--border-default),0_1px_2px_rgba(19,32,56,0.05)]" : "hover:bg-[var(--surface-hover)]"
                      )}
                    >
                      <Icon aria-hidden className={cn("h-4 w-4 shrink-0", tab === t ? "text-[var(--fy-accent)]" : "text-[var(--text-tertiary)]")} strokeWidth={1.8} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[13.5px] font-medium", tab === t ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{TAB_LABEL[t]}</span>
                        <span className="hidden text-[13px] text-[var(--text-tertiary)] md:block">{TAB_HINT[t]}</span>
                      </span>
                      {badge ? (
                        <span className={cn("rounded-full px-1.5 text-[11px] font-medium leading-[18px] text-white", t === "updates" ? "bg-[var(--fy-red)]" : "bg-[var(--fy-accent)]")}>
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
          <div className="hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4 md:block">
            <p className="text-[13px] font-medium text-[var(--text-tertiary)]">Before you submit</p>
            <ul className="mt-3 grid gap-2.5">
              {checklist.map((item) => (
                <li key={item.label}>
                  <button type="button" onClick={() => go(item.tab)} className="flex w-full items-start gap-2.5 text-left text-[13px] leading-[1.4]">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                        item.done ? "border-[var(--fy-accent)] bg-[var(--fy-accent)] text-white" : "border-[var(--border-strong)]"
                      )}
                    >
                      {item.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                    </span>
                    <span className={item.done ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)] hover:text-[var(--fy-accent-ink)]"}>
                      {item.label}
                      <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
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