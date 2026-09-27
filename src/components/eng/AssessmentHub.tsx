"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { StatusTag } from "@/components/ui/StatusTag";
import { cn } from "@/lib/cn";
import type { CandidateView } from "@/lib/eng/candidate-view";
import { engFetch, formatBytes } from "./api";
import { ConsentStep, SetupStep, StartStep } from "./AssessmentSetup";
import { AssessmentWorkspace } from "./AssessmentWorkspace";
import { StageProgress } from "./CandidateParts";
import { LocalTime } from "./LocalTime";
import { useDrafts, type DraftKey } from "./useDrafts";

type View = CandidateView;

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

/* ------------------------------------------------------------------ */
/* Receipt                                                             */
/* ------------------------------------------------------------------ */

const RECEIPT_STAGES = ["Uploaded", "Validated", "Submitted", "Evaluating", "Completed"] as const;

function receiptProgress(processing: NonNullable<View["receipt"]>["processing"]): { index: number; note: string; delayed: boolean } {
  switch (processing) {
    case "human_review":
      return { index: 4, note: "Checks finished. The hiring team is reviewing your work.", delayed: false };
    case "ready":
      return { index: 4, note: "Reviewed. The employer has the report and will contact you directly.", delayed: false };
    case "retryable_failure":
    case "blocked":
      return { index: 3, note: "Evaluation is delayed by a platform problem. It retries automatically and is never counted against you.", delayed: true };
    case "canceled":
      return { index: 3, note: "Evaluation was stopped by Fydell. Your submission is kept exactly as sent.", delayed: true };
    default:
      return { index: 3, note: "Your ZIP is being tested in an isolated environment.", delayed: false };
  }
}

function ReceiptPanel({ view }: { view: View }) {
  const r = view.receipt;
  if (!r) return null;
  const progress = receiptProgress(r.processing);
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-app-meta text-[var(--text-tertiary)]">
          {view.role.organizationName} · {view.role.title}
        </p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">Submitted</h1>
        <p className="mt-2 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">{view.scenario.title}. Keep this receipt; it identifies exactly what you sent.</p>
      </header>
      <Panel>
        <PanelSection>
          <ol aria-label="Submission progress" className="grid gap-2 sm:grid-cols-5">
            {RECEIPT_STAGES.map((stage, i) => {
              const done = i < progress.index || (i === 4 && progress.index === 4);
              const current = i === progress.index && !done;
              return (
                <li key={stage} aria-current={current ? "step" : undefined} className="grid gap-1.5">
                  <span
                    className={cn(
                      "h-1 rounded-full",
                      done ? "bg-[var(--fydell-brand-blue)]" : current ? (progress.delayed ? "bg-[var(--fydell-changed)]" : "bg-[var(--fydell-evidence)] opacity-60") : "bg-[var(--surface-selected)]"
                    )}
                  />
                  <span className={cn("text-app-meta", done || current ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>{stage}</span>
                </li>
              );
            })}
          </ol>
          <p role="status" className="mt-3 text-app-body text-[var(--text-secondary)]">
            {progress.note}
          </p>
        </PanelSection>
        <PanelSection>
          <dl className="grid gap-x-8 gap-y-3 text-app-body sm:grid-cols-2">
            <div>
              <dt className="text-app-meta text-[var(--text-tertiary)]">Submitted</dt>
              <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-[var(--text-primary)]">
                <LocalTime iso={r.submittedAt} /> {r.late ? <StatusTag tone="changed">Late</StatusTag> : null}
              </dd>
            </div>
            <div>
              <dt className="text-app-meta text-[var(--text-tertiary)]">Submission reference</dt>
              <dd className="mt-0.5 break-all font-mono text-[12.5px] text-[var(--text-primary)]">{r.submissionId}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-app-meta text-[var(--text-tertiary)]">Accepted ZIP ({formatBytes(r.archiveBytes)}), SHA-256</dt>
              <dd className="mt-0.5 break-all font-mono text-[12.5px] text-[var(--text-primary)]">{r.archiveSha256}</dd>
            </div>
          </dl>
        </PanelSection>
        <PanelSection>
          <p className="max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
            Next: the hiring team reviews the test results, your code, the team thread and your handoff. The employer decides what happens next and contacts you directly. Nothing more is needed from you.
          </p>
        </PanelSection>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hub                                                                 */
/* ------------------------------------------------------------------ */

export default function AssessmentHub({ initial }: { initial: View }) {
  const router = useRouter();
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

  const draftKeys = useMemo<DraftKey[]>(() => [...view.scenario.handoffPrompts.map((p) => p.field), "ai_use", "message"], [view.scenario.handoffPrompts]);
  const { drafts, change, resolve, retryAll, dirtyKeys } = useDrafts(attemptId, initial.drafts, draftKeys);

  useEffect(() => {
    window.addEventListener("online", retryAll);
    return () => window.removeEventListener("online", retryAll);
  }, [retryAll]);

  const dirty = dirtyKeys.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // The server is polled while working so the requirement update, extensions
  // and evaluation progress appear without a manual refresh. Drafts are not
  // replaced by polling; they are reconciled by revision when saved.
  useEffect(() => {
    if (status !== "in_progress" && status !== "submitted") return;
    const interval = status === "in_progress" ? 20000 : 30000;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await engFetch<{ view: View }>(`/api/eng/attempts/${attemptId}`);
      if (res.ok) applyView(res.data.view);
    };
    const id = window.setInterval(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [attemptId, status, applyView]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit(goToUpdates: () => void) {
    const accepted = uploads.find((u) => u.status === "accepted");
    if (!accepted) return;
    setSubmitting(true);
    setSubmitError(null);
    const body: Record<string, string> = { uploadId: accepted.id };
    for (const k of draftKeys) if (k !== "message") body[k] = drafts[k].body;
    const res = await engFetch<{ receipt: View["receipt"] }>(`/api/eng/attempts/${attemptId}/submit`, { body });
    const refreshed = await engFetch<{ view: View }>(`/api/eng/attempts/${attemptId}`);
    setSubmitting(false);
    if (res.ok === false) {
      setSubmitError(res.status === 0 ? "Not submitted: you appear to be offline. Try again when the connection is back; it will not be submitted twice." : res.error);
      if (refreshed.ok) {
        const updateJustArrived = !view.update && refreshed.data.view.update;
        applyView(refreshed.data.view);
        if (updateJustArrived) goToUpdates();
      }
      return;
    }
    if (refreshed.ok) applyView(refreshed.data.view);
    else setView((v) => ({ ...v, attempt: { ...v.attempt, status: "submitted" }, receipt: res.data.receipt }));
    router.refresh();
  }

  if (status === "withdrawn" || status === "expired") {
    return (
      <Panel>
        <PanelSection
          title={status === "withdrawn" ? "The employer withdrew this invitation" : "This attempt has expired"}
          description="Nothing more is needed from you. Contact the employer if you think this is a mistake."
        />
      </Panel>
    );
  }

  if (status === "submitted") return <ReceiptPanel view={view} />;

  if (status === "in_progress") {
    return (
      <AssessmentWorkspace
        view={view}
        now={now}
        online={online}
        messages={messages}
        setMessages={setMessages}
        uploads={uploads}
        setUploads={setUploads}
        draftsApi={{ drafts, change, resolve, dirtyKeys }}
        onAcknowledged={(at) => setView((v) => ({ ...v, attempt: { ...v.attempt, updateAcknowledgedAt: at } }))}
        onSubmit={submit}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <StageProgress current={status === "preflight_passed" ? "Start" : "Setup"} />
      <header>
        <p className="text-app-meta text-[var(--text-tertiary)]">
          {view.role.organizationName} · {view.role.title}
        </p>
        <h1 className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{view.scenario.title}</h1>
        <p className="mt-2 max-w-[68ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">{view.scenario.summary}</p>
      </header>
      {!online ? (
        <p role="status" className="text-app-body text-[var(--fydell-risk)]">
          You are offline. Reconnect to continue setup.
        </p>
      ) : null}
      {status === "accepted" && !view.attempt.consentedAt ? <ConsentStep view={view} onView={applyView} /> : null}
      {status === "accepted" && view.attempt.consentedAt ? <SetupStep view={view} onView={applyView} /> : null}
      {status === "preflight_passed" ? <StartStep view={view} onView={applyView} onStarted={() => router.refresh()} /> : null}
    </div>
  );
}
