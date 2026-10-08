import { useCallback, useEffect, useState } from "react";
import { engApi, isAuthRequired } from "../lib/tauri";
import {
  DESKTOP_DISCLOSURE,
  EngAttemptDetail,
  EngLocalState,
  RECORDED_ITEMS,
  consentFacts,
  engStage,
  serverOffsetMs,
  setupCommandFor,
  startFacts,
  timeLeft,
  windowNote,
  type Fact,
} from "../lib/eng";
import { messageOf } from "../App";
import { Skeleton } from "./ui";
import EngWork from "./EngWork";
import { EngReceiptView, EngReportView } from "./EngResult";

/* ============================================================================
   One engineering attempt, from ground rules to report. The platform is the
   source of truth for every state change; this screen re-reads the
   candidate view after each action and on a short poll while timed.
   ========================================================================== */

export function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="eng-facts">
      {items.map((f) => (
        <div key={f.label} className="eng-fact">
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bullets({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="eng-bullets">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function CopyLine({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="eng-command">
      <code aria-label={label}>{text}</code>
      <button
        className="btn ghost sm"
        onClick={() => {
          navigator.clipboard.writeText(text).then(
            () => setState("copied"),
            () => setState("failed")
          );
        }}
      >
        {state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : "Copy"}
      </button>
    </div>
  );
}

export function WorkspaceCard({
  attemptId,
  local,
  plannedDir,
  allowPrepare,
  onPrepared,
  prepareWith,
  verifiedNote = "verified against SHA-256",
  plannedNote = "The starter project will be downloaded, checked against the hash Fydell sends, and extracted to:",
  prepareLabel = "Download starter",
}: {
  attemptId: string;
  local: EngLocalState | null;
  plannedDir: string;
  allowPrepare: boolean;
  onPrepared: (l: EngLocalState) => void;
  prepareWith?: (attemptId: string) => Promise<EngLocalState>;
  verifiedNote?: string;
  plannedNote?: string;
  prepareLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prepare = async () => {
    setBusy(true);
    setError(null);
    try {
      onPrepared(await (prepareWith ?? engApi.prepareWorkspace)(attemptId));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    setError(null);
    try {
      await engApi.openWorkspace(attemptId);
    } catch (e) {
      setError(messageOf(e));
    }
  };

  return (
    <div className="eng-workspace">
      {local ? (
        <>
          <div className="eng-workspace-row">
            <div className="eng-workspace-main">
              <div className="section-label">Project folder</div>
              <div className="mono eng-path">{local.projectDir}</div>
              <div className="muted">
                {local.starterFiles.length} starter files · {verifiedNote}{" "}
                <span className="mono">{local.starterSha256.slice(0, 12)}…</span>
              </div>
            </div>
            <button className="btn ghost" onClick={() => void open()}>
              Open folder
            </button>
          </div>
        </>
      ) : (
        <div className="eng-workspace-row">
          <div className="eng-workspace-main">
            <div className="section-label">Project folder</div>
            <div className="muted">{plannedNote}</div>
            <div className="mono eng-path">{plannedDir}</div>
          </div>
          <button className="btn" disabled={busy || !allowPrepare} onClick={() => void prepare()}>
            {busy ? "Preparing…" : prepareLabel}
          </button>
        </div>
      )}
      {error && <div className="error mt-3">{error}</div>}
    </div>
  );
}

function ConsentStep({ detail, onDetail }: { detail: EngAttemptDetail; onDetail: (d: EngAttemptDetail) => void }) {
  const { view } = detail;
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="eng-panel">
      <h2 className="eng-panel-title">Before you set up</h2>
      <p className="muted">Nothing is timed yet. These are the ground rules for the task.</p>
      <Facts items={consentFacts(view)} />
      <details className="eng-disclosure">
        <summary>Allowed tools and AI use</summary>
        <Bullets items={view.scenario.aiPolicy} />
      </details>
      <details className="eng-disclosure">
        <summary>What Fydell records</summary>
        <Bullets items={RECORDED_ITEMS} />
      </details>
      <details className="eng-disclosure">
        <summary>What this desktop app does</summary>
        <Bullets items={DESKTOP_DISCLOSURE} />
      </details>
      {view.scenario.accommodations.length > 0 && (
        <details className="eng-disclosure">
          <summary>Accessibility, extensions and support</summary>
          <Bullets items={view.scenario.accommodations} />
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
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              onDetail(await engApi.recordConsent(view.attempt.id));
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Continue to setup"}
        </button>
      </div>
    </section>
  );
}

const TROUBLESHOOTING = [
  "“python is not recognized” (Windows): try py preflight.py. If that also fails, install Python 3.12 from python.org and tick “Add python.exe to PATH”, then open a new terminal.",
  "“command not found: python” (macOS or Linux): use python3 preflight.py.",
  "“not supported for this task”: install Python 3.11, 3.12 or 3.13 and run the check again.",
  "“public tests could not be collected”: the terminal is in the wrong folder. Open the project folder that contains preflight.py and run it there.",
  "You can paste the whole line or just the code. Trying again never creates a new attempt.",
];

function SetupStep({
  detail,
  onDetail,
  onLocal,
}: {
  detail: EngAttemptDetail;
  onDetail: (d: EngAttemptDetail) => void;
  onLocal: (l: EngLocalState) => void;
}) {
  const { view, local } = detail;
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      onDetail(await engApi.confirmSetup(view.attempt.id, code));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="eng-panel">
      <h2 className="eng-panel-title">Set up on your computer</h2>
      <p className="muted">Setup time does not count. The timer starts only when you press Start.</p>
      <ol className="eng-steps">
        <li>
          <div className="eng-step-title">Download the starter project</div>
          <WorkspaceCard
            attemptId={view.attempt.id}
            local={local}
            plannedDir={detail.plannedProjectDir}
            allowPrepare
            onPrepared={onLocal}
          />
        </li>
        <li>
          <div className="eng-step-title">Open the folder in your editor and run the setup check</div>
          <p className="muted">
            Open the project folder (the one containing <span className="mono">preflight.py</span>) in
            your editor, open a terminal there and run:
          </p>
          <CopyLine label="Setup check command" text={setupCommandFor(detail.os, view.scenario.setupCommands)} />
          {view.scenario.prerequisites.length > 0 && <Bullets items={view.scenario.prerequisites} />}
          <p className="muted">
            Some public tests fail at this point. That is the incident you will fix, not a setup
            problem. This app does not run the check for you.
          </p>
        </li>
        <li>
          <div className="eng-step-title">Paste the setup result</div>
          <p className="muted">
            Copy the last line the check prints, which starts with <span className="mono">Setup code:</span>.
          </p>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim() && !busy) void confirm();
            }}
          >
            <input
              className="input mono"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Setup code: …"
              aria-label="Setup result"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn" type="submit" disabled={!code.trim() || busy}>
              {busy ? "Checking…" : "Confirm setup"}
            </button>
          </form>
          {error && <div className="error mt-3">{error}</div>}
          <details className="eng-disclosure" open={Boolean(error)}>
            <summary>Troubleshooting</summary>
            <Bullets items={TROUBLESHOOTING} />
            <p className="muted">Setup problems are never held against you.</p>
          </details>
        </li>
      </ol>
      {view.scenario.supportedEnvironments.length > 0 && (
        <div className="mt-4">
          <div className="section-label">Supported setups</div>
          <ul className="eng-envs">
            {view.scenario.supportedEnvironments.map((env) => (
              <li key={env.label}>
                <span className="strong">{env.label}</span>
                <span className={`chip ${env.status === "validated" ? "chip-ok" : env.status === "unsupported" ? "chip-warn" : ""}`}>
                  {env.status === "validated" ? "Confirmed" : env.status === "unsupported" ? "Not supported" : "Should work"}
                </span>
                <span className="muted">{env.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ReadyStep({
  detail,
  onDetail,
  onLocal,
}: {
  detail: EngAttemptDetail;
  onDetail: (d: EngAttemptDetail) => void;
  onLocal: (l: EngLocalState) => void;
}) {
  const { view } = detail;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runtime = view.attempt.preflightRuntime?.replace("python", "Python");
  return (
    <section className="eng-panel">
      <h2 className="eng-panel-title">Ready to start</h2>
      <p className="muted">Setup confirmed{runtime ? ` on ${runtime}` : ""}.</p>
      <Facts items={startFacts(view)} />
      <WorkspaceCard
        attemptId={view.attempt.id}
        local={detail.local}
        plannedDir={detail.plannedProjectDir}
        allowPrepare
        onPrepared={onLocal}
      />
      <p className="muted mt-3">
        Your project files stay on your computer. Fydell saves your team messages and handoff drafts
        as you type, but it does not back up code you have not uploaded.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="row mt-3">
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              onDetail(await engApi.start(view.attempt.id));
            } catch (e) {
              setError(messageOf(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Starting…" : "Start the task"}
        </button>
      </div>
    </section>
  );
}

export default function EngAssessment({
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
  const [detail, setDetail] = useState<EngAttemptDetail | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((d: EngAttemptDetail) => {
    setDetail(d);
    setOffset(serverOffsetMs(d.view.serverNow, Date.now()));
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await engApi.openAttempt(attemptId));
    } catch (e) {
      if (isAuthRequired(e)) onAuthExpired();
      else setError(messageOf(e));
    }
  }, [attemptId, apply, onAuthExpired]);

  useEffect(() => {
    let live = true;
    engApi.openAttempt(attemptId).then(
      (d) => live && apply(d),
      (e: unknown) => {
        if (!live) return;
        if (isAuthRequired(e)) onAuthExpired();
        else setError(messageOf(e));
      },
    );
    return () => {
      live = false;
    };
  }, [attemptId, apply, onAuthExpired]);

  const stage = detail ? engStage(detail.view) : null;

  useEffect(() => {
    onTimedChange(stage === "working");
  }, [stage, onTimedChange]);
  useEffect(() => () => onTimedChange(false), [onTimedChange]);

  useEffect(() => {
    if (stage !== "working" && stage !== "submitted") return;
    const id = window.setInterval(() => void refresh(), stage === "working" ? 20_000 : 60_000);
    return () => window.clearInterval(id);
  }, [stage, refresh]);

  useEffect(() => {
    if (stage !== "working") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [stage]);

  const setLocal = useCallback((local: EngLocalState) => {
    setDetail((d) => (d ? { ...d, local } : d));
  }, []);

  if (!detail) {
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

  const { view } = detail;
  const left = stage === "working" ? timeLeft(view.attempt.dueAt, now + offset) : null;
  const late = stage === "working" ? windowNote(view.attempt.window, view.scenario.submissionGraceMinutes) : null;

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
          <h1 className="page-title">{view.scenario.title}</h1>
          <p className="page-sub">{view.scenario.summary}</p>
        </div>
      </header>

      {error && <div className="error mb-3">{error}</div>}
      {late && <div className="milestone-banner mb-3" role="status"><div className="milestone-text"><div className="milestone-body">{late}</div></div></div>}

      {stage === "withdrawn" || stage === "expired" ? (
        <section className="eng-panel">
          <h2 className="eng-panel-title">
            {stage === "withdrawn" ? "The employer withdrew this task" : "This task has expired"}
          </h2>
          <p className="muted">Nothing more is needed from you. If you think this is a mistake, contact the employer directly.</p>
        </section>
      ) : stage === "consent" ? (
        <ConsentStep detail={detail} onDetail={apply} />
      ) : stage === "setup" ? (
        <SetupStep detail={detail} onDetail={apply} onLocal={setLocal} />
      ) : stage === "ready" ? (
        <ReadyStep detail={detail} onDetail={apply} onLocal={setLocal} />
      ) : stage === "working" ? (
        <EngWork detail={detail} onDetail={apply} onLocal={setLocal} onRefresh={refresh} onAuthExpired={onAuthExpired} />
      ) : (
        <>
          <EngReceiptView view={view} local={detail.local} />
          <EngReportView attemptId={view.attempt.id} processing={view.receipt?.processing ?? null} />
        </>
      )}
    </div>
  );
}
