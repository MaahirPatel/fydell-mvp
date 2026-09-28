import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  api,
  InboxInvitation,
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
import Home from "./components/Home";
import Inbox from "./components/Inbox";
import Profile from "./components/Profile";
import { BrandLockup } from "./components/Brand";
import { ProvenanceTag } from "./components/ui";

type Screen =
  | "loading"
  | "signin"
  | "signin-waiting"
  | "home"
  | "consent"
  | "provisioning"
  | "update-required"
  | "locked"
  | "workspace"
  | "submitted";

type HomeTab = "home" | "inbox" | "profile";

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
          <BrandLockup />
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
                <span
                  className={`step-glyph ${st === "failed" ? "no" : st === "ok" ? "yes" : st === "started" ? "started" : ""}`}
                  aria-hidden="true"
                >
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

/* ---------------- app shell: sidebar + home-area screens ----------------
   The signed-in candidate home. Linear-style: a quiet sidebar for
   navigation, the content area owns the information density. */

function NavIcon({ kind }: { kind: "home" | "inbox" | "profile" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  if (kind === "home")
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 11l8-7 8 7" />
        <path d="M6 9.5V20h12V9.5" />
        <path d="M10 20v-5h4v5" />
      </svg>
    );
  if (kind === "inbox")
    return (
      <svg {...common} aria-hidden="true">
        <path d="M22 12h-5l-2 3h-6l-2-3H2" />
        <path d="M5 5h14l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3-7z" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

function Shell({
  auth,
  session,
  onSignOut,
  onAcceptInvitationId,
  onAcceptInviteToken,
  onContinueSession,
}: {
  auth: SessionSummary | null;
  session: SessionInfo | null;
  onSignOut: () => void;
  onAcceptInvitationId: (inv: InboxInvitation) => void;
  onAcceptInviteToken: (token: string) => void;
  onContinueSession: () => void;
}) {
  const [tab, setTab] = useState<HomeTab>("home");
  const [inboxCount, setInboxCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listInvitations()
      .then((invs: InboxInvitation[]) => {
        if (!cancelled) setInboxCount(invs.length);
      })
      .catch(() => {
        if (!cancelled) setInboxCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSession =
    session != null &&
    (session.status === "active" || session.status === "joined") &&
    session.platform_session_id != null;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar-brand">
          <BrandLockup size={24} />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-eyebrow">Workspace</div>
          <button
            className={`nav-item ${tab === "home" ? "active" : ""}`}
            onClick={() => setTab("home")}
            aria-current={tab === "home" ? "page" : undefined}
          >
            <span className="nav-item-label">
              <span className="nav-icon"><NavIcon kind="home" /></span>
              Home
            </span>
          </button>
          <button
            className={`nav-item ${tab === "inbox" ? "active" : ""}`}
            onClick={() => setTab("inbox")}
            aria-current={tab === "inbox" ? "page" : undefined}
          >
            <span className="nav-item-label">
              <span className="nav-icon"><NavIcon kind="inbox" /></span>
              Inbox
            </span>
            {inboxCount != null && inboxCount > 0 && (
              <span className="nav-badge">{inboxCount}</span>
            )}
          </button>
          <button
            className={`nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
            aria-current={tab === "profile" ? "page" : undefined}
          >
            <span className="nav-item-label">
              <span className="nav-icon"><NavIcon kind="profile" /></span>
              Profile
            </span>
          </button>
        </nav>
        {hasSession && (
          <div className="sidebar-session">
            <div className="sidebar-session-label">Simulation</div>
            <div className="sidebar-session-title">
              {session!.title ?? "Your assignment"}
            </div>
            <button className="btn ghost sm" onClick={onContinueSession}>
              {session!.status === "active" ? "Continue" : "Continue setup"}
            </button>
          </div>
        )}
        <div className="spacer" />
        <div className="sidebar-foot">
          <div className="sidebar-email" title={auth?.email ?? ""}>
            {auth?.email ?? "Signed in"}
          </div>
          <button className="btn ghost sm" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="shell-main">
        {tab === "home" && (
          <Home
            session={session}
            email={auth?.email ?? null}
            onContinueSession={onContinueSession}
            onOpenInbox={() => setTab("inbox")}
            onOpenProfile={() => setTab("profile")}
          />
        )}
        {tab === "inbox" && (
          <Inbox onAcceptId={onAcceptInvitationId} onAcceptToken={onAcceptInviteToken} />
        )}
        {tab === "profile" && <Profile />}
      </main>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [auth, setAuth] = useState<SessionSummary | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
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
                : "home"
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
        setScreen("home");
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

  /** Shared post-accept entry: version gate, then consent or begin. */
  const enterSession = useCallback(
    async (s: SessionInfo) => {
      setSession(s);
      // DESK-19: check the version gate before anything timed starts.
      try {
        const gate = await api.checkClientVersion();
        setVersionGate(gate);
        if (gate.kind === "blocked") {
          setScreen("update-required");
          return;
        }
        if (gate.kind === "current" && gate.update_available) {
          setUpdateNotice(versionGateMessage(gate));
        }
      } catch {
        // Version check is advisory on failure: unknown gate, visible in UI.
      }
      if (s.consent_accepted) {
        begin(s);
      } else {
        setScreen("consent");
      }
    },
    [begin]
  );

  const join = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        const s = await api.joinSession(token);
        await enterSession(s);
      } catch (e: unknown) {
        if (isAuthRequired(e)) {
          setScreen("signin");
          setError("Your sign-in expired — please sign in again.");
        } else {
          setError(messageOf(e));
          setScreen("home");
        }
      } finally {
        setBusy(false);
      }
    },
    [enterSession]
  );

  const joinByInvitationId = useCallback(
    async (inv: InboxInvitation) => {
      setBusy(true);
      setError(null);
      try {
        const s = await api.acceptInvitationById(
          inv.id,
          inv.organizationName,
          inv.simulationTitle
        );
        await enterSession(s);
      } catch (e: unknown) {
        if (isAuthRequired(e)) {
          setScreen("signin");
          setError("Your sign-in expired — please sign in again.");
        } else {
          setError(messageOf(e));
          setScreen("home");
        }
      } finally {
        setBusy(false);
      }
    },
    [enterSession]
  );

  const continueSession = useCallback(() => {
    if (session?.status === "active") {
      setScreen("workspace");
    } else if (session?.status === "joined") {
      setScreen("consent");
    } else {
      setScreen("home");
    }
  }, [session]);

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
            <BrandLockup />
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

  if (screen === "home") {
    return (
      <Shell
        auth={auth}
        session={session}
        onSignOut={signOut}
        onAcceptInvitationId={(inv) => void joinByInvitationId(inv)}
        onAcceptInviteToken={(token) => void join(token)}
        onContinueSession={continueSession}
      />
    );
  }

  if (screen === "consent") {
    return (
      <div className="screen">
        <div className="card wide">
          <div className="brand">
            <BrandLockup />
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
          {updateNotice && (
            <div className="milestone-banner mt-4" role="status">
              <div className="milestone-text">
                <div className="milestone-title">Update available</div>
                <div className="milestone-body">{updateNotice}</div>
              </div>
            </div>
          )}
          <div className="row">
            <button className="btn ghost" onClick={() => setScreen("home")}>
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

  /* ---------------- DESK-19: blocked version ---------------- */

  if (screen === "update-required" && versionGate?.kind === "blocked") {
    return (
      <div className="screen">
        <div className="card">
          <div className="brand">
            <BrandLockup />
          </div>
          <h1>Update required</h1>
          <p>{versionGateMessage(versionGate)}</p>
          {versionGate.download_url && (
            <p className="muted">
              Latest release: <span className="mono">{versionGate.download_url}</span>
            </p>
          )}
          {error && <div className="error">{error}</div>}
          <div className="row mt-4">
            <div className="spacer" />
            <button className="btn" onClick={() => void recheckVersion()} disabled={busy}>
              {busy ? "Checking…" : "I've updated — check again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- DESK-11: session already open elsewhere ---------------- */

  if (screen === "locked") {
    return (
      <div className="screen">
        <div className="card">
          <div className="brand">
            <BrandLockup />
          </div>
          <h1>Already open</h1>
          <p>
            This assignment is already open in another Fydell window on this
            computer{lockedPid != null && <> (process {lockedPid})</>}. To
            protect your work, only one window may hold it at a time.
          </p>
          <p className="muted">
            Close it there first, then continue here. If the other window is
            gone (for example after a crash), its lock goes stale and you'll be
            let in automatically — your files are preserved.
          </p>
          <div className="row mt-4">
            <div className="spacer" />
            <button className="btn" onClick={() => void recheckLocked()} disabled={busy}>
              {busy ? "Checking…" : "Check again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- DESK-06: provisioning ---------------- */

  if (screen === "provisioning") {
    return (
      <Provisioning
        onDone={(s) => {
          setSession(s);
          setScreen("workspace");
        }}
        onCancel={() => setScreen("consent")}
      />
    );
  }

  if (screen === "submitted") {
    return (
      <div className="screen">
        <div className="card wide">
          <div className="brand">
            <BrandLockup />
          </div>
          <h1>Submitted</h1>
          {receipt ? (
            <>
              <p>Your work and evidence trail were sent for review. Keep this receipt:</p>
              <div className="receipt-box">
                <div className="receipt-head">
                  <ProvenanceTag kind="observed" />
                  <span className="muted">This receipt describes your observed work.</span>
                </div>
                <div><span className="k">submission </span>{receipt.submission_id}</div>
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
            <button className="btn ghost" onClick={() => setScreen("home")}>
              Home
            </button>
            <div className="spacer" />
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
  // DESK-20: every backend error carries a stable reference (FYDELL-Exxxx);
  // surface it so support can identify the failure without any logs.
  if (typeof e === "object" && e !== null && "message" in e) {
    const ref = (e as { ref?: unknown }).ref;
    const msg = String((e as { message: unknown }).message);
    return typeof ref === "string" && ref.length > 0 ? `${msg} (${ref})` : msg;
  }
  return String(e);
}
