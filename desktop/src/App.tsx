import { useCallback, useEffect, useState } from "react";
import { api, SessionInfo, Receipt } from "./lib/tauri";
import Workspace from "./components/Workspace";

type Screen = "loading" | "invite" | "consent" | "workspace" | "submitted";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .sessionStatus()
      .then((s) => {
        setSession(s);
        setScreen(s.status === "active" ? "workspace" : s.status === "submitted" ? "submitted" : "invite");
      })
      .catch(() => setScreen("invite"));
  }, []);

  const join = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const s = await api.joinSession(inviteCode);
      setSession(s);
      setScreen("consent");
    } catch (e: unknown) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [inviteCode]);

  if (screen === "loading") {
    return (
      <div className="screen">
        <div className="muted">Loading…</div>
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
          <h1>Join your simulation</h1>
          <p>
            Enter the invite code from your hiring task. The scenario downloads
            to this computer and everything you do stays local until you submit.
          </p>
          {error && <div className="error">{error}</div>}
          <div className="field">
            <label>Invite code</label>
            <input
              className="input"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && join()}
              placeholder="FYDELL-…"
              autoFocus
              spellCheck={false}
            />
          </div>
          <button className="btn" disabled={busy || !inviteCode.trim()} onClick={join}>
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
            This is a hiring simulation for{" "}
            <strong>{session?.scenario_label ?? session?.scenario_id}</strong>.
            Here's exactly what this app does and doesn't do:
          </p>
          <ul className="consent-list">
            <li>
              <span className="yes">✓</span>
              <span>Records your file edits, test runs, and timing <em>inside this simulation only</em>, as an evidence trail you can inspect anytime.</span>
            </li>
            <li>
              <span className="yes">✓</span>
              <span>Runs the scenario's test suite locally on your machine. Nothing leaves your computer until you choose to submit.</span>
            </li>
            <li>
              <span className="no">✕</span>
              <span>No keystroke logging, no screen recording, no monitoring of other apps or files. Teammates in the simulation are scripted and always labeled.</span>
            </li>
          </ul>
          <div className="row">
            <button className="btn ghost" onClick={() => setScreen("invite")}>
              Back
            </button>
            <div className="spacer" />
            <button className="btn" onClick={() => setScreen("workspace")}>
              Start simulation
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "submitted" && receipt) {
    return (
      <div className="screen">
        <div className="card wide">
          <div className="brand">
            Fydell<span className="dot">.</span>
          </div>
          <h1>Submitted</h1>
          <p>Your work and evidence trail were sent for review. Keep this receipt:</p>
          <div className="receipt-box">
            <div><span className="k">submission </span>{receipt.submission_id}</div>
            <div><span className="k">sha256 </span><span className="hash">{receipt.sha256}</span></div>
            <div><span className="k">scenario </span>{receipt.scenario_id} v{receipt.scenario_version}</div>
            <div><span className="k">files </span>{receipt.file_count} <span className="k">events </span>{receipt.event_count}</div>
            <div><span className="k">at </span>{receipt.submitted_at}</div>
          </div>
          <p className="muted" style={{ marginTop: 14 }}>
            Submitted work is read-only. A human reviews every submission — scores are never final without one.
          </p>
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
