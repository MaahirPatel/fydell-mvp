import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  api,
  ProvisionProgress,
  RecoveryOutcome,
  SessionInfo,
  SessionSummary,
  Receipt,
  VersionGate,
  isAuthRequired,
} from "./lib/tauri";
import {
  PROVISION_STEPS,
  provisionStepLabel,
  versionGateMessage,
} from "./lib/pure";
import Workspace from "./components/Workspace";
import { ProvenanceTag } from "./components/ui";

type Screen =
  | "loading"
  | "signin"
  | "signin-waiting"
  | "invite"
  | "consent"
  | "provisioning"
  | "update-required"
  | "locked"
  | "workspace"
  | "submitted";

/* ---------------- DESK-06: truthful provisioning progress ---------------- */

type StepState = "pending" | "started" | "ok" | "failed";

function Provisioning({
  onDone,
  onCancel,
}: {
  onDone: (s: SessionInfo) => void;
  onCancel: () => void;
}) {
  const [steps, setSteps] = useState<Record<string, StepState>>({});
  const [error, setError] = useState<string | null>(null);
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setFailedStep(null);
    setSteps(Object.fromEntries(PROVISION_STEPS.map((s) => [s.id, "pending"] as const)));
    const unlisten = await listen<ProvisionProgress>("provision-progress", (e) => {
      setSteps((prev) => ({ ...prev, [e.payload.step]: e.payload.state }));
      if (e.payload.state === "failed") {
        setFailedStep(e.payload.step);
        setError(e.payload.message ?? "Provisioning failed.");
      }
    });
    try {
      const s = await api.beginSession();
      onDone(s);
    } catch (e) {
      // The backend already emitted the failed step with its real message;
      // only fall back to the thrown error when no step reported failure.
      setError((prev) => prev ?? messageOf(e));
    } finally {
      unlisten();
      setRunning(false);
    }
  }, [onDone]);

  useEffect(() => {
    void run();
  }, [run]);

  const glyph = (st: StepState) =>
    st === "ok" ? "✓" : st === "failed" ? "✗" : st === "started" ? "…" : "○";

  return (
    <div className="screen">
      <div className="card">
        <div className="brand">
          Fydell<span className="dot">.</span>
        </div>
        <h1>Setting up your workspace</h1>
        <p className="muted">
          Your timer starts only after setup completes — a failed step never
          costs you assessment time.
        </p>
        <ul className="consent-list">
          {PROVISION_STEPS.map((s) => {
            const st = steps[s.id] ?? "pending";
            return (
              <li key={s.id}>
                <span className={st === "failed" ? "no" : st === "ok" ? "yes" : ""}>
                  {glyph(st)}
                </span>
                <span>
                  {provisionStepLabel(s.id)}
                  {st === "failed" && failedStep === s.id && error && (
                    <span className="muted"> — {error}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {error && failedStep && (
          <>
            <div className="error">{error}</div>
            <div className="row mt-4">
              <button className="btn ghost" onClick={onCancel} disabled={running}>
                Back
              </button>
              <div className="spacer" />
              <button className="btn" onClick={() => void run()} disabled={running}>
                {running ? "Retrying…" : "Retry"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [auth, setAuth] = useState<SessionSummary | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [inviteToken, setInviteToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [versionGate, setVersionGate] = useState<VersionGate | null>(null);
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);
  const [lockedPid, setLockedPid] = useState<number | null>(null);

  // Boot: check sign-in, then session state, then any recovery outcome.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await api.authSession();
        if (cancelled) return;
        setAuth(a);
        if (!a.signed_in) {
          setScreen("signin");
          return;
        }
        // DESK-11: refuse to open a session another live window holds.
        const r: RecoveryOutcome | null = await api.recoveryStatus().catch(() => null);
        if (cancelled) return;
        if (r?.kind === "locked") {
          setLockedPid(r.pid);
          setScreen("locked");
          return;
        }
        const s = await api.sessionStatus();
        if (cancelled) return;
        setSession(s);
        setScreen(
          s.status === "active"
            ? "workspace"
            : s.status === "submitted"
              ? "submitted"
              : s.status === "joined"
                ? "consent"
                : "invite"
        );
      } catch {
        if (!cancelled) setScreen("signin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auth callback events from the deep-link handler (src-tauri/src/auth.rs).
  useEffect(() => {
    const unlistens: Array<() => void> = [];
    listen<SessionSummary>("auth-changed", (e) => {
      setAuth(e.payload);
      if (e.payload.signed_in) {
        setError(null);
        setScreen("invite");
      } else {
        setSession(null);
        setScreen("signin");
      }
    }).then((u) => unlistens.push(u));
    listen<{ message: string }>("auth-error", (e) => {
      setError(e.payload.message);
      setScreen("signin");
    }).then((u) => unlistens.push(u));
    return () => {
      unlistens.forEach((u) => u());
    };
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await api.authSignIn();
      setScreen("signin-waiting");
    } catch (e: unknown) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.authSignOut().catch(() => {});
    setAuth({ signed_in: false, email: null, expires_at: null });
    setSession(null);
    setScreen("signin");
  }, []);

  const begin = useCallback((_s: SessionInfo) => {
    // Provisioning (DESK-06) runs on its own screen with per-step progress
    // and retry; the timer starts only when it completes.
    setScreen("provisioning");
  }, []);

  const recheckLocked = useCallback(async () => {
    setBusy(true);
    try {
      const r: RecoveryOutcome = await api.recoveryStatus();
      if (r.kind === "locked") {
        setLockedPid(r.pid);
      } else {
        // The other window closed; boot normally.
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const recheckVersion = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const gate = await api.checkClientVersion();
      setVersionGate(gate);
      if (gate.kind === "blocked") return;
      setScreen("consent");
    } catch (e: unknown) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const join = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await api.joinSession(inviteToken);
      setSession(s);
      if (s.consent_accepted) {
        await begin(s);
      } else {
        setScreen("consent");
      }
    } catch (e: unknown) {
      if (isAuthRequired(e)) {
        setScreen("signin");
        setError("Your sign-in expired — please sign in again.");
      } else {
        setError(messageOf(e));
      }
    } finally {
      setBusy(false);
    }
  }, [inviteToken, begin]);

  const acceptAndStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await api.acceptConsent();
      await begin(s);
    } catch (e: unknown) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [begin]);

  if (screen === "loading") {
    return (
      <div className="screen">
        <div className="muted">Loading…</div>
      </div>
    );
  }

  if (screen === "signin" || screen === "signin-waiting") {
    return (
      <div className="screen">
        <div className="card">
          <div className="brand">
            Fydell<span className="dot">.</span>
          </div>
          <h1>Sign in to Fydell</h1>
          {screen === "signin-waiting" ? (
            <>
              <p>
                A browser window opened for sign-in. Complete it there — this
                app will continue automatically when you're done.
              </p>
              <p className="muted">
                Your credentials never touch this app; the browser talks to
                Fydell directly and hands back a session.
              </p>
              <button className="btn ghost" onClick={() => setScreen("signin")}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <p>
                Sign in with your Fydell account in your browser. The app keeps
                your session in your OS keychain.
              </p>
              {error && <div className="error">{error}</div>}
              <button className="btn" disabled={busy} onClick={signIn}>
                {busy ? "Opening browser…" : "Sign in with Fydell"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (screen === "invite") {
    return (
      <div className="screen">
        <div className="card">
          <div className="brand">
            Fydell<span className="dot">.</span>
          </div>
          <div className="row mb-2">
            <span className="muted">{auth?.email}</span>
            <div className="spacer" />
            <button className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
          <h1>Join your simulation</h1>
          <p>
            Enter the invite code from your hiring task. The assignment's brief
            and workspace sync with the Fydell platform; your work stays on
            this computer until you submit.
          </p>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>Invite code</label>
            <input
              className="input mono"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="Paste your invite token"
              autoFocus
              spellCheck={false}
            />
          </div>
          <button className="btn" disabled={busy || !inviteToken.trim()} onClick={join}>
            {busy ? "Connecting…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  if (screen === "consent") {
    return (
      <div className="screen">
        <div className="card wide">
          <div className="brand">
            Fydell<span className="dot">.</span>
          </div>
          <h1>Before you start</h1>
          <p>
            This is a hiring simulation:{" "}
            <strong>{session?.title ?? "your assignment"}</strong>
            {session?.organization && (
              <>
                {" "}from <strong>{session.organization}</strong>
              </>
            )}
            {session?.duration_minutes && (
              <> · about {session.duration_minutes} minutes</>
            )}
            .
          </p>
          <p>Here's exactly what this app does and doesn't do:</p>
          <ul className="consent-list">
            <li>
              <span className="yes">✓</span>
              <span>Syncs your brief, files, and progress with the Fydell platform so nothing is lost. You can inspect the event trail anytime.</span>
            </li>
            <li>
              <span className="yes">✓</span>
              <span>Runs the scenario's test suite locally on your machine when the assignment declares one.</span>
            </li>
            <li>
              <span className="no">✕</span>
              <span>No keystroke logging, no screen recording, no monitoring of other apps or files. Teammates in the simulation are scripted and always labeled.</span>
            </li>
          </ul>
          {error && <div className="error">{error}</div>}
          <div className="row">
            <button className="btn ghost" onClick={() => setScreen("invite")}>
              Back
            </button>
            <div className="spacer" />
            <button className="btn" disabled={busy} onClick={acceptAndStart}>
              {busy ? "Starting…" : "Accept and start"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "submitted") {
    return (
      <div className="screen">
        <div className="card wide">
          <div className="brand">
            Fydell<span className="dot">.</span>
          </div>
          <h1>Submitted</h1>
          {receipt ? (
            <>
              <p>Your work and evidence trail were sent for review. Keep this receipt:</p>
              <div className="receipt-box">
                <div className="receipt-head">
                  <ProvenanceTag kind="observed" />
                  <span className="muted">This receipt describes your observed work.</span>
                </div>                <div><span className="k">submission </span>{receipt.submission_id}</div>
                <div><span className="k">sha256 </span><span className="hash">{receipt.sha256}</span></div>
                {receipt.server_receipt_hash && (
                  <div><span className="k">server receipt </span><span className="hash">{receipt.server_receipt_hash}</span></div>
                )}
                {receipt.title && <div><span className="k">assignment </span>{receipt.title}</div>}
                <div><span className="k">files </span>{receipt.file_count} <span className="k">events </span>{receipt.event_count}</div>
                <div><span className="k">at </span>{receipt.submitted_at}</div>
                {receipt.already_submitted && (
                  <div><span className="k">note </span>already submitted — the original submission stands</div>
                )}
              </div>
            </>
          ) : (
            <p className="muted">This assignment was already submitted. Your receipt is stored with the local workspace.</p>
          )}
          <p className="muted mt-4">
            A human reviews every submission — scores are never final without one.
          </p>
          <div className="row mt-4">
            <button className="btn ghost" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Workspace
      session={session!}
      onSubmitted={(r) => {
        setReceipt(r);
        setScreen("submitted");
      }}
    />
  );
}

export function messageOf(e: unknown): string {
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}
