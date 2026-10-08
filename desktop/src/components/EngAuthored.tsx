import { useCallback, useEffect, useRef, useState } from "react";
import { engApi, engAuthoredApi, isAuthRequired } from "../lib/tauri";
import { exclusionLabel, formatBytes, packageSummary, serverOffsetMs, timeLeft, type EngLocalState, type EngPackagePlan, type Fact } from "../lib/eng";
import {
  authoredHandoffBlockers,
  authoredStage,
  environmentCheckState,
  evaluationNote,
  newClientMsgId,
  outcomeLabel,
  runHeadline,
  type AuthoredReport,
  type AuthoredView,
  type Collaboration,
  type PublicRun,
} from "../lib/eng-authored";
import { messageOf } from "../App";
import { EmptyState, ProvenanceTag, Skeleton } from "./ui";
import { Bullets, CopyLine, Facts, WorkspaceCard } from "./EngAssessment";

/* ============================================================================
   One employer-authored work sample, from ground rules to report. The
   platform is the source of truth: every action returns the candidate view,
   and this screen polls while the task is timed. The project folder lives on
   this computer; the app reads it only to run the public tests or submit.
   ========================================================================== */

const AUTHORED_DISCLOSURE: readonly string[] = [
  "This app writes the starter project into one folder on this computer and never changes it afterwards.",
  "It reads that folder only when you run the public tests or submit, and shows you every file it would send first.",
  "It never runs your code itself and never watches your editor, screen or other files. Public tests run on Fydell’s test runner.",
];

const RECORDED: readonly string[] = [
  "Your messages to the simulated team and when you sent them.",
  "When you start, each public test run and its result, and when you submit.",
  "The project files you submit and your handoff answers.",
  "Fydell does not see your screen, editor or AI tools. Anything you say about them is recorded as your statement.",
];

function minutesOf(view: AuthoredView): number {
  return view.attempt.allowedMinutes + view.attempt.extensionMinutes;
}

function consentFacts(view: AuthoredView): Fact[] {
  return [
    { label: "Window", value: `${minutesOf(view)} minutes once you press Start, for about ${view.task.environment.taskMinutes} minutes of work` },
    { label: "Setup", value: `About ${view.task.environment.setupMinutes} minutes, never timed` },
    { label: "Environment", value: view.task.environment.label },
    { label: "The employer receives", value: "Your submitted files, handoff, team messages and test results" },
    { label: "You receive", value: "The report once the hiring team releases it, without their private notes" },
  ];
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, run, setError };
}

function RunResult({ run }: { run: PublicRun }) {
  return (
    <div className="eng-plan mt-3">
      <div className="strong">{runHeadline(run)}</div>
      {run.runnerLabel && (
        <div className="muted">
          {run.runnerLabel}
          {run.isolated === false ? " · not isolated" : ""}
          {run.durationMs != null ? ` · ${(run.durationMs / 1000).toFixed(1)} s` : ""}
        </div>
      )}
      {run.tests.length > 0 && (
        <ul className="eng-files mt-2">
          {run.tests.map((t) => (
            <li key={t.name}>
              <span className="mono">{t.name}</span>
              <span className={`chip ${t.outcome === "passed" ? "chip-ok" : t.outcome === "failed" || t.outcome === "error" ? "chip-warn" : ""}`}>{outcomeLabel(t.outcome)}</span>
            </li>
          ))}
        </ul>
      )}
      {run.output && (
        <details className="eng-disclosure">
          <summary>Runner output</summary>
          <pre className="eng-pre">{run.output}</pre>
        </details>
      )}
    </div>
  );
}

/* ---------------- consent ---------------- */

function ConsentStep({ view, onView }: { view: AuthoredView; onView: (v: AuthoredView) => void }) {
  const [agree, setAgree] = useState(false);
  const { busy, error, run } = useAction();
  return (
    <section className="eng-panel">
      <h2 className="eng-panel-title">Before you set up</h2>
      <p className="muted">Nothing is timed yet. These are the ground rules for the task.</p>
      <Facts items={consentFacts(view)} />
      <details className="eng-disclosure" open>
        <summary>Allowed tools and AI use</summary>
        <p className="eng-pre">{view.task.aiPolicy}</p>
      </details>
      {view.task.howReviewed.length > 0 && (
        <details className="eng-disclosure">
          <summary>How your work is reviewed</summary>
          <ul className="eng-bullets">
            {view.task.howReviewed.map((h) => (
              <li key={h.label}>
                <span className="strong">{h.label}.</span> {h.explanation}
              </li>
            ))}
          </ul>
        </details>
      )}
      <details className="eng-disclosure">
        <summary>What Fydell records</summary>
        <Bullets items={RECORDED} />
      </details>
      <details className="eng-disclosure">
        <summary>What this desktop app does</summary>
        <Bullets items={AUTHORED_DISCLOSURE} />
      </details>
      {view.task.accommodations.length > 0 && (
        <details className="eng-disclosure">
          <summary>Accessibility and extensions</summary>
          <Bullets items={view.task.accommodations} />
        </details>
      )}
      {error && <div className="error">{error}</div>}
      <label className="eng-check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        I have read the rules above and will do this task myself.
      </label>
      <div className="row mt-3">
        <button
          className="btn"
          disabled={!agree || busy}
          onClick={() => void run(async () => onView(await engAuthoredApi.action(view.attempt.id, "consent")))}
        >
          {busy ? "Saving…" : "Continue to setup"}
        </button>
      </div>
    </section>
  );
}

/* ---------------- setup ---------------- */

function SetupStep({
  view,
  local,
  plannedDir,
  onView,
  onLocal,
}: {
  view: AuthoredView;
  local: EngLocalState | null;
  plannedDir: string;
  onView: (v: AuthoredView) => void;
  onLocal: (l: EngLocalState) => void;
}) {
  const check = useAction();
  const confirm = useAction();
  const [run, setRun] = useState<PublicRun | null>(view.publicRuns.latest?.purpose === "environment_check" ? view.publicRuns.latest : null);
  const state = environmentCheckState(run);
  const env = view.task.environment;
  return (
    <section className="eng-panel">
      <h2 className="eng-panel-title">Set up on your computer</h2>
      <p className="muted">Setup time does not count. The timer starts only when you press Start.</p>
      <ol className="eng-steps">
        <li>
          <div className="eng-step-title">Create the project folder</div>
          <WorkspaceCard
            attemptId={view.attempt.id}
            local={local}
            plannedDir={plannedDir}
            allowPrepare
            onPrepared={onLocal}
            prepareWith={engAuthoredApi.prepare}
            prepareLabel="Create project"
            plannedNote="The published starter files will be written to:"
            verifiedNote="written from the published task"
          />
        </li>
        <li>
          <div className="eng-step-title">Open it in your editor and install what it needs</div>
          <Bullets items={view.task.setupInstructions} />
          {env.setupCommands.map((c) => (
            <CopyLine key={c} label="Setup command" text={c} />
          ))}
          <p className="muted">Run the public tests locally whenever you like:</p>
          <CopyLine label="Test command" text={env.publicTestCommand || env.testCommand} />
        </li>
        <li>
          <div className="eng-step-title">Check the test environment</div>
          <p className="muted">
            Runs the public tests against the untouched starter on Fydell’s test runner. Some tests are expected to fail
            before you start; this only confirms the tests can run.
          </p>
          <div className="row mt-2">
            <button
              className="btn ghost"
              disabled={check.busy}
              onClick={() => void check.run(async () => setRun(await engAuthoredApi.runTests(view.attempt.id, "environment_check")))}
            >
              {check.busy ? "Checking…" : run ? "Check again" : "Run environment check"}
            </button>
          </div>
          {check.error && <div className="error mt-3">{check.error}</div>}
          {run && <RunResult run={run} />}
        </li>
      </ol>
      {confirm.error && <div className="error">{confirm.error}</div>}
      <div className="row mt-3">
        <button
          className="btn"
          disabled={confirm.busy || (state !== "ran" && state !== "unavailable") || !local}
          onClick={() =>
            void confirm.run(async () => onView(await engAuthoredApi.action(view.attempt.id, "environment_ready", state === "unavailable")))
          }
        >
          {confirm.busy ? "Saving…" : state === "unavailable" ? "Continue without the check" : "Finish setup"}
        </button>
        {!local && <span className="muted">Create the project folder first.</span>}
      </div>
    </section>
  );
}

/* ---------------- ready ---------------- */

function ReadyStep({ view, local, plannedDir, onView, onLocal }: { view: AuthoredView; local: EngLocalState | null; plannedDir: string; onView: (v: AuthoredView) => void; onLocal: (l: EngLocalState) => void }) {
  const { busy, error, run } = useAction();
  return (
    <section className="eng-panel">
      <h2 className="eng-panel-title">Ready to start</h2>
      <p className="muted">{view.attempt.preflightRuntime ?? "Setup finished."}</p>
      <Facts
        items={[
          { label: "Window", value: `${minutesOf(view)} minutes from when you press Start` },
          { label: "You will submit", value: "Your project folder and short handoff answers" },
          { label: "Leaving the app", value: "The timer keeps running on the server. Reopening never restarts it" },
        ]}
      />
      <WorkspaceCard
        attemptId={view.attempt.id}
        local={local}
        plannedDir={plannedDir}
        allowPrepare
        onPrepared={onLocal}
        prepareWith={engAuthoredApi.prepare}
        prepareLabel="Create project"
        plannedNote="The published starter files will be written to:"
        verifiedNote="written from the published task"
      />
      {error && <div className="error">{error}</div>}
      <div className="row mt-3">
        <button className="btn" disabled={busy} onClick={() => void run(async () => onView(await engAuthoredApi.action(view.attempt.id, "start")))}>
          {busy ? "Starting…" : "Start the task"}
        </button>
      </div>
    </section>
  );
}

/* ---------------- working ---------------- */

function Brief({ view }: { view: AuthoredView }) {
  const t = view.task;
  return (
    <div className="eng-brief">
      <h3 className="eng-h3">Context</h3>
      <p className="eng-pre">{t.context}</p>
      <h3 className="eng-h3">Your task</h3>
      <p className="eng-pre">{t.task}</p>
      {t.outcomes.length > 0 && (
        <>
          <h3 className="eng-h3">Required outcomes</h3>
          <Bullets items={t.outcomes} />
        </>
      )}
      <h3 className="eng-h3">Acceptance criteria</h3>
      <ul className="eng-bullets">
        {t.acceptanceCriteria.map((c) => (
          <li key={c.id}>
            <span className="mono">{c.id}</span> {c.text}
          </li>
        ))}
      </ul>
      {t.constraints.length > 0 && (
        <>
          <h3 className="eng-h3">Constraints</h3>
          <Bullets items={t.constraints} />
        </>
      )}
      {t.outOfScope.length > 0 && (
        <>
          <h3 className="eng-h3">Out of scope</h3>
          <Bullets items={t.outOfScope} />
        </>
      )}
      {t.interface && (
        <>
          <h3 className="eng-h3">Interface</h3>
          <pre className="eng-pre">{t.interface}</pre>
        </>
      )}
      <details className="eng-disclosure">
        <summary>AI policy</summary>
        <p className="eng-pre">{t.aiPolicy}</p>
      </details>
    </div>
  );
}

function TestsPanel({ view, onRun }: { view: AuthoredView; onRun: () => void }) {
  const { busy, error, run } = useAction();
  const [latest, setLatest] = useState<PublicRun | null>(view.publicRuns.latest?.purpose === "workspace" ? view.publicRuns.latest : null);
  const left = Math.max(0, view.publicRuns.limit - view.publicRuns.used);
  return (
    <div className="eng-brief">
      <p className="muted">
        Runs the public tests against your project folder as it is now, on Fydell’s test runner. The employer also runs
        evaluation tests you cannot see after you submit. {left} of {view.publicRuns.limit} runs left.
      </p>
      <CopyLine label="Test command" text={view.task.environment.publicTestCommand || view.task.environment.testCommand} />
      <div className="row mt-3">
        <button
          className="btn"
          disabled={busy || left === 0}
          onClick={() =>
            void run(async () => {
              setLatest(await engAuthoredApi.runTests(view.attempt.id, "workspace"));
              onRun();
            })
          }
        >
          {busy ? "Running…" : "Run public tests"}
        </button>
      </div>
      {error && <div className="error mt-3">{error}</div>}
      {latest && <RunResult run={latest} />}
    </div>
  );
}

function TeamPanel({ attemptId }: { attemptId: string }) {
  const [collab, setCollab] = useState<Collaboration | null>(null);
  const [to, setTo] = useState<string>("");
  const [text, setText] = useState("");
  const { busy, error, run, setError } = useAction();
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const c = await engAuthoredApi.collaboration(attemptId);
      setCollab(c);
      setTo((cur) => cur || c.teammates[0]?.id || "");
    } catch (e) {
      setError(messageOf(e));
    }
  }, [attemptId, setError]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [collab?.messages.length]);

  if (!collab) return <Skeleton height={120} />;
  if (collab.teammates.length === 0) return <p className="muted">This task has no simulated teammates.</p>;
  const name = (id: string | null) => collab.teammates.find((t) => t.id === id)?.name ?? "Team";
  const send = () =>
    void run(async () => {
      setCollab(await engAuthoredApi.sendTeam(attemptId, to, text, newClientMsgId()));
      setText("");
    });

  return (
    <div className="eng-thread">
      <p className="muted">The team is simulated. Replies come from the task’s scenario, and your messages are part of what the hiring team reviews.</p>
      <ul className="eng-roster">
        {collab.teammates.map((t) => (
          <li key={t.id}>
            <span className="strong">{t.name}</span> <span className="muted">· {t.title}</span>
            {t.topics.length > 0 && <div className="muted">Ask about: {t.topics.join(", ")}</div>}
          </li>
        ))}
      </ul>
      <div className="eng-thread-scroll" aria-live="polite">
        {collab.messages.length === 0 ? (
          <EmptyState icon="chat" title="No messages yet" body="Ask a teammate when something in the brief is unclear." />
        ) : (
          [...collab.messages]
            .sort((a, b) => a.seq - b.seq)
            .map((m) => (
              <div key={m.id} className={`msg ${m.sender === "candidate" ? "me" : "simulated"}`}>
                <div className="who">
                  <span>{m.sender === "candidate" ? `You to ${name(m.toTeammateId)}` : name(m.teammateId)}</span>
                  {m.sender !== "candidate" && <ProvenanceTag kind="generated" />}
                  <span className="msg-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="bubble eng-pre">{m.body}</div>
              </div>
            ))
        )}
        <div ref={endRef} />
      </div>
      {error && <div className="error mt-3">{error}</div>}
      {collab.open ? (
        <div className="composer">
          {collab.teammates.length > 1 && (
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Send to">
              {collab.teammates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <textarea
            className="textarea"
            rows={3}
            value={text}
            maxLength={4000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim() && !busy) send();
            }}
            placeholder={`Message ${name(to)} (Ctrl+Enter to send)`}
            aria-label="Message to the team"
          />
          <button className="btn" disabled={!text.trim() || !to || busy} onClick={send}>
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      ) : (
        <p className="muted">The thread is closed. It stays readable.</p>
      )}
    </div>
  );
}

function SubmitPanel({ view, onView }: { view: AuthoredView; onView: () => Promise<void> }) {
  const prompts = view.task.submission.handoffPrompts;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [aiUse, setAiUse] = useState("");
  const [plan, setPlan] = useState<EngPackagePlan | null>(null);
  const [confirming, setConfirming] = useState(false);
  const preview = useAction();
  const submit = useAction();
  const blockers = authoredHandoffBlockers(prompts, answers, aiUse);
  const planProblems = plan?.problems ?? [];

  return (
    <div className="eng-submit">
      {view.task.submission.requirements.length > 0 && (
        <>
          <h3 className="eng-h3">What to submit</h3>
          <Bullets items={view.task.submission.requirements} />
        </>
      )}
      <h3 className="eng-h3">Files</h3>
      <p className="muted">Check exactly which files from your project folder would be sent. Caches, environments and likely credentials are always left out.</p>
      <div className="row mt-2">
        <button className="btn ghost" disabled={preview.busy} onClick={() => void preview.run(async () => setPlan(await engApi.packagePreview(view.attempt.id)))}>
          {preview.busy ? "Checking…" : plan ? "Check again" : "Check files"}
        </button>
        {plan && <span className="muted">{packageSummary(plan)}</span>}
      </div>
      {preview.error && <div className="error mt-3">{preview.error}</div>}
      {plan && (
        <div className="eng-plan mt-3">
          {planProblems.length > 0 && <div className="error">{planProblems.join(" ")}</div>}
          <ul className="eng-files">
            {plan.included
              .filter((f) => f.change !== "unchanged")
              .map((f) => (
                <li key={f.path}>
                  <span className="mono">{f.path}</span>
                  <span className="muted">{f.change === "added" ? "Added" : "Changed"} · {formatBytes(f.bytes)}</span>
                </li>
              ))}
          </ul>
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
        </div>
      )}

      <h3 className="eng-h3">Handoff</h3>
      {prompts.map((p) => (
        <label key={p.id} className="eng-field">
          <span className="strong">{p.label}</span>
          {p.help && <span className="muted">{p.help}</span>}
          <textarea className="textarea mt-2" rows={4} maxLength={8000} value={answers[p.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [p.id]: e.target.value }))} />
        </label>
      ))}
      <label className="eng-field">
        <span className="strong">AI assistance</span>
        <span className="muted">Which AI tools you used and for what. Recorded as your statement.</span>
        <textarea className="textarea mt-2" rows={3} maxLength={4000} value={aiUse} onChange={(e) => setAiUse(e.target.value)} />
      </label>

      {submit.error && <div className="error mt-3">{submit.error}</div>}
      {blockers.length > 0 && <p className="muted mt-2">{blockers.join(" ")}</p>}
      <div className="row mt-3">
        {confirming ? (
          <>
            <span className="strong">Submit now? You cannot change your work afterwards.</span>
            <div className="spacer" />
            <button className="btn ghost" disabled={submit.busy} onClick={() => setConfirming(false)}>
              Keep working
            </button>
            <button
              className="btn"
              disabled={submit.busy}
              onClick={() =>
                void submit.run(async () => {
                  await engAuthoredApi.submit(view.attempt.id, answers, aiUse);
                  await onView();
                })
              }
            >
              {submit.busy ? "Submitting…" : "Submit"}
            </button>
          </>
        ) : (
          <button className="btn" disabled={blockers.length > 0 || !plan || planProblems.length > 0} onClick={() => setConfirming(true)}>
            Submit work
          </button>
        )}
        {!plan && !confirming && <span className="muted">Check your files first.</span>}
      </div>
    </div>
  );
}

function Working({ view, local, plannedDir, onLocal, refresh }: { view: AuthoredView; local: EngLocalState | null; plannedDir: string; onLocal: (l: EngLocalState) => void; refresh: () => Promise<void> }) {
  const [tab, setTab] = useState<"brief" | "tests" | "team" | "submit">("brief");
  return (
    <section className="eng-panel">
      <WorkspaceCard
        attemptId={view.attempt.id}
        local={local}
        plannedDir={plannedDir}
        allowPrepare
        onPrepared={onLocal}
        prepareWith={engAuthoredApi.prepare}
        prepareLabel="Create project"
        plannedNote="The published starter files will be written to:"
        verifiedNote="written from the published task"
      />
      <div className="panel-tabs mt-3" role="tablist">
        {(["brief", "tests", "team", "submit"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`panel-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "brief" ? "Brief" : t === "tests" ? "Public tests" : t === "team" ? "Team" : "Submit"}
          </button>
        ))}
      </div>
      <div className="eng-tab-body">
        {tab === "brief" && <Brief view={view} />}
        {tab === "tests" && <TestsPanel view={view} onRun={() => void refresh()} />}
        {tab === "team" && <TeamPanel attemptId={view.attempt.id} />}
        {tab === "submit" && <SubmitPanel view={view} onView={refresh} />}
      </div>
    </section>
  );
}

/* ---------------- submitted ---------------- */

function Submitted({ view }: { view: AuthoredView }) {
  const [report, setReport] = useState<AuthoredReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (view.evaluation !== "released") return;
    engAuthoredApi.report(view.attempt.id).then(setReport, (e: unknown) => setError(messageOf(e)));
  }, [view.attempt.id, view.evaluation]);
  const r = view.receipt;
  return (
    <>
      <section className="eng-panel">
        <h2 className="eng-panel-title">Submitted</h2>
        {r && (
          <div className="receipt-box">
            <div className="receipt-head">
              <span className="strong">Receipt</span>
              {r.late && <span className="chip chip-warn">Late</span>}
            </div>
            <dl className="eng-facts">
              <div className="eng-fact">
                <dt>Submitted</dt>
                <dd>{new Date(r.submittedAt).toLocaleString()}</dd>
              </div>
              <div className="eng-fact">
                <dt>Files</dt>
                <dd>{formatBytes(r.archiveBytes)} archive</dd>
              </div>
              <div className="eng-fact">
                <dt>SHA-256</dt>
                <dd className="mono hash">{r.archiveSha256}</dd>
              </div>
            </dl>
          </div>
        )}
        <p className="muted mt-3">{evaluationNote(String(view.evaluation))}</p>
      </section>
      {error && <div className="error mt-3">{error}</div>}
      {report && (
        <section className="eng-panel eng-report">
          <h2 className="eng-panel-title">Your report</h2>
          <p className="eng-pre">{report.summary}</p>
          {report.reviewerNote && (
            <>
              <h3 className="eng-h3">Note from the reviewer</h3>
              <p className="eng-pre">{report.reviewerNote}</p>
            </>
          )}
          <h3 className="eng-h3">Acceptance criteria</h3>
          <ul className="eng-files">
            {report.acceptance.map((a) => (
              <li key={a.id}>
                <span>
                  <span className="mono">{a.id}</span> {a.text}
                </span>
                <span className={`chip ${a.state === "confirmed" ? "chip-ok" : a.state === "not_confirmed" ? "chip-warn" : ""}`}>
                  {a.state === "confirmed" ? "Confirmed" : a.state === "not_confirmed" ? "Not confirmed" : "No result"}
                </span>
              </li>
            ))}
          </ul>
          <h3 className="eng-h3">Assessment</h3>
          <ul className="eng-list">
            {report.criteria.map((c) => (
              <li key={c.id}>
                <div className="strong">
                  {c.label} · {c.stateLabel}
                </div>
                <p className="muted">{c.rationale}</p>
              </li>
            ))}
          </ul>
          {report.limitations.length > 0 && (
            <details className="eng-disclosure">
              <summary>Limitations</summary>
              <Bullets items={report.limitations} />
            </details>
          )}
        </section>
      )}
    </>
  );
}

/* ---------------- screen ---------------- */

export default function EngAuthored({
  attemptId,
  onBack,
  onAuthExpired,
  onTimedChange,
}: {
  attemptId: string;
  onBack: () => void;
  onAuthExpired: () => void;
  onTimedChange: (timed: boolean) => void;
}) {
  const [view, setView] = useState<AuthoredView | null>(null);
  const [local, setLocal] = useState<EngLocalState | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [plannedDir, setPlannedDir] = useState("");

  const apply = useCallback((v: AuthoredView) => {
    setView(v);
    setOffset(serverOffsetMs(v.serverNow, Date.now()));
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await engAuthoredApi.view(attemptId));
    } catch (e) {
      if (isAuthRequired(e)) onAuthExpired();
      else setError(messageOf(e));
    }
  }, [attemptId, apply, onAuthExpired]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stage = view ? authoredStage(view) : null;

  useEffect(() => {
    engAuthoredApi.local(attemptId).then(
      (r) => {
        setLocal(r.local);
        setPlannedDir(r.plannedProjectDir);
      },
      (e: unknown) => setError(messageOf(e)),
    );
  }, [attemptId]);

  useEffect(() => {
    onTimedChange(stage === "working");
  }, [stage, onTimedChange]);
  useEffect(() => () => onTimedChange(false), [onTimedChange]);

  useEffect(() => {
    if (stage !== "working" && stage !== "submitted") return;
    const id = window.setInterval(() => void refresh(), stage === "working" ? 30_000 : 60_000);
    return () => window.clearInterval(id);
  }, [stage, refresh]);

  useEffect(() => {
    if (stage !== "working") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  if (!view) {
    return (
      <div className="page eng-page">
        <button className="btn ghost sm" onClick={onBack}>
          ← Engineering tasks
        </button>
        {error ? (
          <div className="error mt-4">{error}</div>
        ) : (
          <div className="mt-4" aria-busy="true" aria-label="Loading task">
            <Skeleton width="40%" height={14} />
            <div className="mt-3">
              <Skeleton height={80} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const left = stage === "working" ? timeLeft(view.attempt.dueAt, now + offset) : null;

  return (
    <div className="page eng-page">
      <div className="row">
        <button className="btn ghost sm" onClick={onBack}>
          ← Engineering tasks
        </button>
        <div className="spacer" />
        {left && (
          <span className={`eng-timer ${left.tone}`} role="timer" aria-live="off">
            {left.label}
          </span>
        )}
      </div>
      <header className="page-head mt-3">
        <div>
          <div className="eyebrow">
            {view.role.organizationName}
            {view.role.organizationName && " · "}
            {view.role.title}
          </div>
          <h1 className="page-title">{view.task.title}</h1>
          <p className="page-sub">{view.task.summary}</p>
        </div>
      </header>

      {error && <div className="error mb-3">{error}</div>}
      {view.attempt.window === "late" && stage === "working" && (
        <div className="milestone-banner mb-3" role="status">
          <div className="milestone-text">
            <div className="milestone-body">The time window has passed. You can still submit during the grace period; it will be marked late.</div>
          </div>
        </div>
      )}

      {stage === "withdrawn" || stage === "expired" ? (
        <section className="eng-panel">
          <h2 className="eng-panel-title">{stage === "withdrawn" ? "The employer withdrew this task" : "This task has expired"}</h2>
          <p className="muted">Nothing more is needed from you. If you think this is a mistake, contact the employer directly.</p>
        </section>
      ) : stage === "consent" ? (
        <ConsentStep view={view} onView={apply} />
      ) : stage === "setup" ? (
        <SetupStep view={view} local={local} plannedDir={plannedDir} onView={apply} onLocal={setLocal} />
      ) : stage === "ready" ? (
        <ReadyStep view={view} local={local} plannedDir={plannedDir} onView={apply} onLocal={setLocal} />
      ) : stage === "working" ? (
        <Working view={view} local={local} plannedDir={plannedDir} onLocal={setLocal} refresh={refresh} />
      ) : (
        <Submitted view={view} />
      )}
    </div>
  );
}
