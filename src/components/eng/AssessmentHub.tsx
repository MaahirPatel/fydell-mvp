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
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { Mono, WorkReceipt } from "@/components/evidence/Evidence";
import { BulletList, JourneyRail } from "./CandidateParts";
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
      return { index: 4, note: "Reviewed. Your report is below. The employer decides what happens next and contacts you directly.", delayed: false };
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
  const reviewed = r.processing === "ready";
  const checked = r.processing === "ready" || r.processing === "human_review";
  return (
    <div className="grid gap-6">
      <CandidatePageHead
        eyebrow={[view.role.organizationName, view.role.title]}
        title="Submitted. Nothing more is needed from you."
        lead={`${view.scenario.title}. Keep this receipt: it identifies exactly what you sent, down to the byte.`}
        rail={<JourneyRail at="review" complete={reviewed} value={checked ? "With the team" : "Checks running"} />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <PanelSection title="Where your submission is" description={<span role="status">{progress.note}</span>}>
            <ol aria-label="Submission progress" className="grid gap-3 sm:grid-cols-5">
              {RECEIPT_STAGES.map((stage, i) => {
                const done = i < progress.index || (i === 4 && progress.index === 4);
                const current = i === progress.index && !done;
                return (
                  <li key={stage} aria-current={current ? "step" : undefined} className="grid gap-2">
                    <span
                      className={cn(
                        "h-1 rounded-full",
                        done ? "bg-[var(--fy-accent)]" : current ? (progress.delayed ? "bg-[var(--fy-red)]" : "bg-[var(--fy-accent-line)]") : "bg-[var(--border-default)]"
                      )}
                    />
                    <span className={cn("text-app-meta", done || current ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>{stage}</span>
                  </li>
                );
              })}
            </ol>
          </PanelSection>
          <PanelSection title="What happens next">
            <BulletList
              className="text-app-body text-[var(--text-secondary)]"
              items={[
                "Fydell runs the public tests and its own hidden checks against your ZIP in an isolated environment.",
                "The hiring team reads the results alongside your code, the team thread and your handoff, and writes a report.",
                "When they release it, the same report appears on this page for you, without their private notes or interview questions. You can inspect the evidence, add context or flag an error.",
                "The employer decides what happens next and contacts you directly.",
              ]}
            />
          </PanelSection>
          <PanelSection title="Fingerprint" description="The SHA-256 of the accepted ZIP. If anyone asks what you submitted, it identifies the exact archive.">
            <p className="break-all rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 font-mono text-app-meta leading-[1.6] text-[var(--text-primary)]">
              {r.archiveSha256}
            </p>
          </PanelSection>
        </Panel>

        <WorkReceipt
          title={view.scenario.title}
          subtitle={`${view.role.organizationName} · ${view.role.title}`}
          verified={checked}
          rows={[
            { label: "Submitted", value: <LocalTime iso={r.submittedAt} /> },
            { label: "Archive", value: <Mono>{formatBytes(r.archiveBytes)}</Mono> },
            { label: "On time", value: r.late ? <StatusTag tone="changed">Late</StatusTag> : "Yes" },
          ]}
          checks={[
            { label: "ZIP validated and sealed", state: "pass" },
            { label: "Handoff recorded", state: "pass" },
            { label: checked ? "Checks finished" : "Checks running", state: checked ? "pass" : "note" },
            { label: reviewed ? "Reviewed by the hiring team" : "Awaiting team review", state: reviewed ? "pass" : "note" },
          ]}
          reference={<>ref {r.submissionId.slice(0, 8)} · sha256:{r.archiveSha256.slice(0, 10)}</>}
        />
      </div>
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
      <CandidatePageHead
        eyebrow={[view.role.organizationName, view.role.title]}
        title={status === "withdrawn" ? "The employer withdrew this task" : "This task has expired"}
        lead="Nothing more is needed from you. If you think this is a mistake, contact the employer directly."
      />
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

  const minutes = view.attempt.allowedMinutes + view.attempt.extensionMinutes;
  return (
    <div className="grid gap-6">
      <CandidatePageHead
        eyebrow={[view.role.organizationName, view.role.title]}
        title={view.scenario.title}
        lead={view.scenario.summary}
        meta={[
          { label: "Step", value: status === "preflight_passed" ? "Ready to start" : view.attempt.consentedAt ? "Setup check" : "Ground rules" },
          { label: "Window", value: `${minutes} min, from Start` },
          { label: "Effort", value: `About ${view.scenario.targetMinutes} min` },
        ]}
        rail={
          status === "preflight_passed" ? (
            <JourneyRail at="work" value="Ready to start" />
          ) : (
            <JourneyRail at="setup" value={view.attempt.consentedAt ? "Setup check" : "Ground rules"} />
          )
        }
      />
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
