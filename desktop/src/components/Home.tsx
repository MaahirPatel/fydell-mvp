import { useEffect, useState } from "react";
import {
  api,
  InboxInvitation,
  PassportView,
  SessionInfo,
} from "../lib/tauri";
import {
  invitationExpiryLabel,
  invitationUrgency,
  nextCompletenessStep,
  profileCompleteness,
} from "../lib/pure";
import { messageOf } from "../App";
import { EmptyState, ProvenanceTag } from "./ui";

/* ============================================================================
   Home — the candidate dashboard. Dense, confident hierarchy:
   active simulation first (if any), then invitations and profile as
   data-backed cards. Every number is real; every empty state is purposeful.
   ========================================================================== */

function timeRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Time expired";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m remaining`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m remaining`;
}

export default function Home({
  session,
  email,
  onContinueSession,
  onOpenInbox,
  onOpenProfile,
}: {
  session: SessionInfo | null;
  email: string | null;
  onContinueSession: () => void;
  onOpenInbox: () => void;
  onOpenProfile: () => void;
}) {
  const [invitations, setInvitations] = useState<InboxInvitation[] | null>(null);
  const [passport, setPassport] = useState<PassportView | null>(null);
  const [inboxError, setInboxError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [invsResult, ppResult] = await Promise.allSettled([
        api.listInvitations(),
        api.getPassport(),
      ]);
      if (cancelled) return;
      if (invsResult.status === "fulfilled") {
        setInvitations(invsResult.value);
      } else {
        setInboxError(messageOf(invsResult.reason));
      }
      // A passport failure is non-fatal: the profile card falls back to the
      // build prompt, which is the honest state for a missing passport.
      if (ppResult.status === "fulfilled") setPassport(ppResult.value);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasActiveSession =
    session != null &&
    (session.status === "active" || session.status === "joined") &&
    session.platform_session_id != null;

  const completeness = profileCompleteness(passport);
  const nextStep = nextCompletenessStep(passport);
  const latestInvites = (invitations ?? []).slice(0, 2);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Home</h1>
          <p className="page-sub">
            {email ? (
              <>Signed in as <span className="strong">{email}</span></>
            ) : (
              "Your hiring workspace"
            )}
          </p>
        </div>
      </header>

      {inboxError && <div className="error mb-3">{inboxError}</div>}

      {/* Active simulation — the single most important thing on this screen. */}
      <section className="dash-section" aria-label="Active simulation">
        <div className="section-label">Active simulation</div>
        {hasActiveSession ? (
          <div className="sim-card">
            <div className="sim-card-main">
              <div className="sim-card-top">
                <span className="eyebrow">{session!.organization ?? "Simulation"}</span>
                <ProvenanceTag
                  kind={session!.status === "active" ? "observed" : "attention"}
                />
              </div>
              <div className="sim-card-title">{session!.title ?? "Your assignment"}</div>
              <div className="sim-card-meta">
                {session!.status === "active" ? (
                  <span className="mono">{timeRemaining(session!.ends_at) ?? "In progress"}</span>
                ) : (
                  <span>Joined — consent and setup next</span>
                )}
                {session!.duration_minutes != null && (
                  <span className="dot-sep">·</span>
                )}
                {session!.duration_minutes != null && (
                  <span>{session!.duration_minutes} min assignment</span>
                )}
              </div>
            </div>
            <button className="btn" onClick={onContinueSession}>
              {session!.status === "active" ? "Continue working" : "Continue setup"}
            </button>
          </div>
        ) : (
          <EmptyState
            icon="file"
            title="No active simulation"
            body="When you accept an invitation, your assignment appears here with its timer and progress."
            actionLabel="View inbox"
            onAction={onOpenInbox}
          />
        )}
      </section>

      <div className="dash-grid">
        {/* Invitations */}
        <section className="dash-card" aria-label="Invitations">
          <div className="dash-card-head">
            <div className="section-label">Invitations</div>
            {invitations != null && invitations.length > 0 && (
              <span className="count-pill">{invitations.length}</span>
            )}
          </div>
          {invitations == null ? (
            inboxError ? (
              <p className="muted">Couldn't load invitations — {inboxError}</p>
            ) : (
              <p className="muted">Loading…</p>
            )
          ) : invitations.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="Inbox zero"
              body="No pending invitations. New hiring tasks from employers will land here."
              actionLabel="Open inbox"
              onAction={onOpenInbox}
            />
          ) : (
            <>
              <ul className="mini-list">
                {latestInvites.map((inv) => (
                  <li key={inv.id} className="mini-row">
                    <div className="mini-row-main">
                      <div className="mini-row-title">{inv.simulationTitle}</div>
                      <div className="mini-row-sub">
                        {inv.organizationName}
                        {inv.roleTitle && <> · {inv.roleTitle}</>}
                      </div>
                    </div>
                    <span
                      className={`expiry ${invitationUrgency(inv.expiresAt) === "soon" ? "soon" : ""}`}
                    >
                      {invitationExpiryLabel(inv.expiresAt)}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="btn ghost mt-3" onClick={onOpenInbox}>
                Open inbox
                {invitations.length > 2 && ` (${invitations.length})`}
              </button>
            </>
          )}
        </section>

        {/* Profile */}
        <section className="dash-card" aria-label="Candidate profile">
          <div className="dash-card-head">
            <div className="section-label">Candidate profile</div>
            <span className="count-pill">{completeness.percent}%</span>
          </div>
          <div className="completeness-bar" role="progressbar" aria-valuenow={completeness.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="completeness-fill" style={{ width: `${completeness.percent}%` }} />
          </div>
          {passport == null ? (
            <p className="muted mt-3">
              No profile yet. Add a GitHub repository and Fydell builds your
              evidence-backed profile from real work.
            </p>
          ) : nextStep ? (
            <p className="muted mt-3">
              Next: <span className="strong">{nextStep.label}</span> — {nextStep.hint}.
            </p>
          ) : (
            <p className="muted mt-3">
              Profile complete — {passport.projects.length} project
              {passport.projects.length === 1 ? "" : "s"},{" "}
              {passport.capabilities.length} capabilit
              {passport.capabilities.length === 1 ? "y" : "ies"} evidenced.
            </p>
          )}
          <button className="btn ghost mt-3" onClick={onOpenProfile}>
            {passport == null ? "Build profile" : "Open profile"}
          </button>
        </section>
      </div>
    </div>
  );
}
