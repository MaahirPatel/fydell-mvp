import { useCallback, useEffect, useState } from "react";
import { api, InboxInvitation } from "../lib/tauri";
import { invitationExpiryLabel, invitationUrgency } from "../lib/pure";
import { messageOf } from "../App";
import { EmptyState } from "./ui";

/* ============================================================================
   Inbox — pending hiring invitations, received in-app. Accept feeds the
   existing join flow (the token is freshly minted per listing; accepting
   here refreshes the emailed link, like a resend). The paste-token path
   stays for codes shared out-of-band.
   ========================================================================== */

export default function Inbox({ onAccept }: { onAccept: (token: string) => void }) {
  const [invitations, setInvitations] = useState<InboxInvitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setInvitations(await api.listInvitations());
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = useCallback(
    (inv: InboxInvitation) => {
      setAcceptingId(inv.id);
      onAccept(inv.token);
    },
    [onAccept]
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Inbox</h1>
          <p className="page-sub">
            Hiring invitations addressed to you. Accepting starts the join
            flow — nothing is timed until you consent and press Start.
          </p>
        </div>
        <button className="btn ghost" onClick={() => void load()} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && <div className="error mb-3">{error}</div>}

      {invitations == null ? (
        <p className="muted">Loading invitations…</p>
      ) : invitations.length === 0 ? (
        <div className="inbox-empty">
          <EmptyState
            icon="inbox"
            title="No pending invitations"
            body="When an employer invites you to a work simulation, it appears here with the role, the assignment, and its expiry."
            actionLabel="Refresh"
            onAction={() => void load()}
          />
        </div>
      ) : (
        <ul className="invite-list">
          {invitations.map((inv) => {
            const urgent = invitationUrgency(inv.expiresAt) === "soon";
            return (
              <li key={inv.id} className="invite-row">
                <div className="invite-main">
                  <div className="eyebrow">{inv.organizationName}</div>
                  <div className="invite-title">{inv.simulationTitle}</div>
                  <div className="invite-meta">
                    {inv.roleTitle && <span className="chip">{inv.roleTitle}</span>}
                    <span className={`expiry ${urgent ? "soon" : ""}`}>
                      {invitationExpiryLabel(inv.expiresAt)}
                    </span>
                    {inv.status === "opened" && (
                      <span className="muted">· opened</span>
                    )}
                  </div>
                </div>
                <button
                  className="btn"
                  disabled={acceptingId != null}
                  onClick={() => accept(inv)}
                >
                  {acceptingId === inv.id ? "Accepting…" : "Accept"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paste-token fallback — for codes shared out-of-band. */}
      <section className="fallback-box">
        <div className="section-label">Have an invite code?</div>
        <p className="muted">
          Paste a code shared outside the inbox (chat, email forward). Codes
          for a different email address won't work here.
        </p>
        <div className="row">
          <input
            className="input mono"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualToken.trim()) onAccept(manualToken.trim());
            }}
            placeholder="Paste invite code"
            spellCheck={false}
            aria-label="Invite code"
          />
          <button
            className="btn ghost"
            disabled={!manualToken.trim() || acceptingId != null}
            onClick={() => onAccept(manualToken.trim())}
          >
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}
