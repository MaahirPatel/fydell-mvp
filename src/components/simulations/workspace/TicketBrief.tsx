"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { Button } from "@/components/ui/Button";
import { engFetch } from "@/components/eng/api";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";
import type { AuthoredCandidateView, PublicRunView } from "@/lib/eng/authored/types";
import { BriefContent, teammatesFor } from "./BriefContent";
import { slugify } from "./lib";
import { useSimPrefs } from "./prefs";
import { SettingsMenu } from "./SettingsMenu";
import { RunHeadline, TestList } from "./TestBits";
import { useCollaboration } from "./useCollaboration";

export function SimHeader({ children }: { children?: React.ReactNode }) {
  const { theme } = useSimPrefs();
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4">
      <FydellLogo height={18} tone={theme === "dark" ? "dark" : "light"} />
      <div className="ml-auto flex items-center gap-1">
        {children}
        <SettingsMenu showFontSize={false} />
      </div>
    </header>
  );
}

export function SupportLine() {
  return (
    <p className="text-[13px] text-[var(--text-tertiary)]">
      Something not working? Email{" "}
      <a href={CONTACT_MAILTO} className="text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]">
        {CONTACT_EMAIL}
      </a>{" "}
      with the time and what you saw.
    </p>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[8px] bg-[var(--sim-error-bg)] px-3 py-2 text-[13.5px] text-[var(--sim-error)]">
      {message}
    </p>
  );
}

function SetupRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-[13.5px]">
      <dt className="text-[var(--text-secondary)]">{label}</dt>
      <dd className="text-right text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

/**
 * The opening screen: the task as a ticket, with setup alongside. The timer
 * only starts when the candidate opens the workspace.
 */
export function TicketBrief({ view, base, onView }: { view: AuthoredCandidateView; base: string; onView: (view: AuthoredCandidateView) => void }) {
  const collab = useCollaboration(base, false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestCheck = view.publicRuns.latest?.purpose === "environment_check" ? view.publicRuns.latest : null;
  const [check, setCheck] = useState<PublicRunView | null>(latestCheck);
  const status = view.attempt.status;
  const consented = Boolean(view.attempt.consentedAt);
  const minutes = view.attempt.allowedMinutes + view.attempt.extensionMinutes;
  const unavailable = check?.status === "runner_unavailable" || check?.status === "infrastructure_error";
  const teammates = teammatesFor(view, collab.view?.teammates ?? null);

  const post = async (action: string, extra: Record<string, unknown> = {}): Promise<AuthoredCandidateView | null> => {
    const res = await engFetch<{ view: AuthoredCandidateView }>(base, { body: { action, ...extra } });
    if (res.ok === false) {
      setError(res.error);
      return null;
    }
    return res.data.view;
  };

  const consent = async () => {
    setBusy("consent");
    setError(null);
    const next = await post("consent");
    setBusy(null);
    if (next) onView(next);
  };

  const runCheck = async () => {
    setBusy("check");
    setError(null);
    const res = await engFetch<{ run: PublicRunView }>(`${base}/public-tests`, { body: { purpose: "environment_check", files: view.task.starterFiles } });
    setBusy(null);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setCheck(res.data.run);
  };

  const openWorkspace = async (continueWithoutCheck: boolean) => {
    setBusy("open");
    setError(null);
    if (view.attempt.status === "accepted") {
      const ready = await post("environment_ready", continueWithoutCheck ? { continueWithoutCheck: true } : {});
      if (!ready) {
        setBusy(null);
        return;
      }
      onView(ready);
    }
    const started = await post("start");
    setBusy(null);
    if (started) onView(started);
  };

  return (
    <div className="min-h-dvh">
      <SimHeader>
        <Link
          href="/app/candidate"
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft aria-hidden size={15} />
          Back to evaluations
        </Link>
      </SimHeader>

      {view.preview ? (
        <p className="border-b border-[var(--border-default)] bg-[var(--surface-band)] px-4 py-2 text-center text-[13.5px] text-[var(--text-secondary)]">
          You are previewing this task as a candidate would see it. It uses no quota and is not part of any hiring outcome.
        </p>
      ) : null}

      <main className="mx-auto grid max-w-[1180px] gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0">
          <header className="mb-9 grid gap-3 border-b border-[var(--border-default)] pb-7">
            <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em] text-[var(--text-primary)]">{view.task.title}</h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-[var(--text-secondary)]">
              <span className="rounded-[4px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-app-meta text-[var(--text-primary)]">
                {slugify(view.task.title)}
              </span>
              <span>
                {view.role.title} at {view.role.organizationName}
              </span>
              <span aria-hidden className="text-[var(--text-quaternary)]">
                ·
              </span>
              <span>{minutes} minutes</span>
              <span aria-hidden className="text-[var(--text-quaternary)]">
                ·
              </span>
              <span>{view.task.environment.label}</span>
            </p>
          </header>
          <BriefContent view={view} teammates={teammates} messagingAvailable={collab.state.status === "ready"} idBase="ticket" />
        </article>

        <aside className="lg:sticky lg:top-[72px] lg:self-start">
          <section aria-labelledby="setup-title" className="grid gap-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-5">
            <h2 id="setup-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
              {!consented ? "Before you start" : status === "preflight_passed" ? "Ready when you are" : "Setup"}
            </h2>

            {!consented ? (
              <div className="grid gap-4">
                <ul className="grid list-disc gap-1.5 pl-5 text-[14px] leading-[1.6] text-[var(--text-body)]">
                  <li>The task, what is out of scope and the AI and tool policy are in the brief. Read them before you start.</li>
                  <li>You have {minutes} minutes once you press Start. Setup comes next and is not timed.</li>
                  <li>Your files, test runs, messages with simulated teammates, assistant use and handoff answers are recorded.</li>
                  <li>
                    The hiring team at {view.role.organizationName} sees that record and the analysis of your submission. You see your report once they release it.
                  </li>
                </ul>
                <ErrorNote message={error} />
                <Button variant="primary" onClick={consent} loading={busy === "consent"}>
                  Agree and continue to setup
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {status === "accepted" ? (
                  <div className="grid gap-3">
                    <p className="text-[14px] leading-[1.6] text-[var(--text-body)]">
                      The environment check runs the starter project&apos;s public tests on the test runner, so you know the runner works before the timer starts. Failing tests are
                      expected at this point.
                    </p>
                    <div aria-live="polite" className="grid gap-2">
                      {check ? (
                        <div className="grid gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-3">
                          {check.status === "ran" ? (
                            <p className="text-[13.5px] font-medium text-[var(--sim-success)]">Setup check passed: the tests ran.</p>
                          ) : (
                            <RunHeadline run={check} />
                          )}
                          {check.status === "ran" ? (
                            <p className="text-[13px] text-[var(--text-secondary)]">
                              {check.tests.filter((t) => t.outcome === "passed").length} of {check.tests.length} starter tests pass{check.runnerLabel ? ` on ${check.runnerLabel}` : ""}.
                            </p>
                          ) : null}
                          {check.detail ? <p className="text-[13px] text-[var(--text-secondary)]">{check.detail}</p> : null}
                          {check.status === "ran" && check.tests.length ? (
                            <details>
                              <summary className="cursor-pointer text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Starter test results</summary>
                              <div className="sim-scroll mt-2 max-h-[200px] overflow-auto">
                                <TestList tests={check.tests} />
                              </div>
                            </details>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[13.5px] text-[var(--text-secondary)]">Not run yet.</p>
                      )}
                    </div>
                    {unavailable ? (
                      <p className="text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                        The test runner is not available right now. You can still do the task and submit; evaluation will wait until the runner is back.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[14px] leading-[1.6] text-[var(--text-body)]">
                    Setup is done{view.attempt.preflightRuntime ? `: ${view.attempt.preflightRuntime}` : ""}. The timer starts when you open the workspace.
                  </p>
                )}

                <dl className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                  <SetupRow label="Time allowed" value={`${minutes} minutes`} />
                  <SetupRow label="Timer starts" value="When you open the workspace" />
                  <SetupRow label="Public test runs" value={`Up to ${view.publicRuns.limit}`} />
                </dl>

                <ErrorNote message={error} />

                <div className="grid gap-2">
                  {status === "accepted" && check?.status !== "ran" ? (
                    <Button variant={unavailable ? "secondary" : "primary"} onClick={runCheck} loading={busy === "check"} disabled={busy !== null && busy !== "check"}>
                      {check ? "Run the check again" : "Run the environment check"}
                    </Button>
                  ) : null}
                  {status === "preflight_passed" || check?.status === "ran" ? (
                    <Button variant="primary" onClick={() => openWorkspace(false)} loading={busy === "open"} disabled={busy !== null && busy !== "open"}>
                      Open workspace
                    </Button>
                  ) : null}
                  {status === "accepted" && unavailable ? (
                    <Button variant="primary" onClick={() => openWorkspace(true)} loading={busy === "open"} disabled={busy !== null && busy !== "open"}>
                      Open workspace without the check
                    </Button>
                  ) : null}
                </div>

                <a
                  href={`${base}/starter`}
                  className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
                >
                  <Download aria-hidden size={14} />
                  Download the starter project (ZIP)
                </a>
              </div>
            )}
            <SupportLine />
          </section>
        </aside>
      </main>
    </div>
  );
}
