import { useCallback, useEffect, useState } from "react";
import { engApi, isAuthRequired } from "../lib/tauri";
import { EngTaskList, taskStatusLabel } from "../lib/eng";
import { invitationExpiryLabel, invitationUrgency } from "../lib/pure";
import { messageOf } from "../App";
import { EmptyState, Skeleton } from "./ui";

/* ============================================================================
   Engineering tasks — the candidate's own attempts and pending engineering
   invitations, from GET /api/eng/attempts. Accepting goes through the
   platform's accept-by-id route; nothing is timed until Start.
   ========================================================================== */

export default function EngTasks({
  onOpen,
  onAuthExpired,
}: {
  onOpen: (attemptId: string, kind: "authored" | "standard") => void;
  onAuthExpired: () => void;
}) {
  const [tasks, setTasks] = useState<EngTaskList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setTasks(await engApi.listTasks());
    } catch (e) {
      if (isAuthRequired(e)) onAuthExpired();
      else setError(messageOf(e));
    } finally {
      setRefreshing(false);
    }
  }, [onAuthExpired]);

  useEffect(() => {
    let live = true;
    engApi.listTasks().then(
      (t) => live && setTasks(t),
      (e: unknown) => {
        if (!live) return;
        if (isAuthRequired(e)) onAuthExpired();
        else setError(messageOf(e));
      },
    );
    return () => {
      live = false;
    };
  }, [onAuthExpired]);

  const accept = useCallback(
    async (invitationId: string) => {
      setAcceptingId(invitationId);
      setError(null);
      try {
        const attemptId = await engApi.acceptInvitation(invitationId);
        const fresh = await engApi.listTasks().catch(() => null);
        const kind = fresh?.attempts.find((a) => a.id === attemptId)?.kind === "authored" ? "authored" : "standard";
        onOpen(attemptId, kind);
      } catch (e) {
        if (isAuthRequired(e)) onAuthExpired();
        else setError(messageOf(e));
      } finally {
        setAcceptingId(null);
      }
    },
    [onOpen, onAuthExpired]
  );

  const empty = tasks != null && tasks.attempts.length === 0 && tasks.invitations.length === 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Engineering tasks</h1>
          <p className="page-sub">
            Practical backend tasks you work on in your own editor. Setup is
            never timed; the clock starts only when you press Start.
          </p>
        </div>
        <button className="btn ghost" onClick={() => void load()} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && <div className="error mb-3">{error}</div>}

      {tasks == null ? (
        <ul className="invite-list" aria-busy="true" aria-label="Loading engineering tasks">
          {[0, 1].map((i) => (
            <li key={i} className="invite-row" aria-hidden="true">
              <div className="invite-main">
                <Skeleton width="30%" height={10} />
                <div className="mt-2">
                  <Skeleton width="55%" height={14} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : empty ? (
        <EmptyState
          icon="file"
          title="No engineering tasks"
          body="When an employer invites you to an engineering task, it appears here. Invitations go to the email you signed in with."
          actionLabel="Refresh"
          onAction={() => void load()}
        />
      ) : (
        <>
          {tasks.invitations.length > 0 && (
            <section className="dash-section" aria-label="Pending invitations">
              <div className="section-label">Waiting for you</div>
              <ul className="invite-list">
                {tasks.invitations.map((inv) => (
                  <li key={inv.id} className="invite-row">
                    <div className="invite-main">
                      <div className="eyebrow">{inv.organizationName || "Employer"}</div>
                      <div className="invite-title">{inv.roleTitle}</div>
                      <div className="invite-meta">
                        <span className="chip">{inv.allowedMinutes} min window</span>
                        <span className={`expiry ${invitationUrgency(inv.expiresAt) === "soon" ? "soon" : ""}`}>
                          {invitationExpiryLabel(inv.expiresAt)}
                        </span>
                      </div>
                    </div>
                    <button className="btn" disabled={acceptingId != null} onClick={() => void accept(inv.id)}>
                      {acceptingId === inv.id ? "Accepting…" : "Accept"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {tasks.attempts.length > 0 && (
            <section className="dash-section" aria-label="Your engineering tasks">
              <div className="section-label">Your tasks</div>
              <ul className="invite-list">
                {tasks.attempts.map((a) => (
                  <li key={a.id} className="invite-row">
                    <div className="invite-main">
                      <div className="eyebrow">{a.organizationName || "Employer"}</div>
                      <div className="invite-title">{a.roleTitle}</div>
                      <div className="invite-meta">
                        <span className={`chip ${a.status === "submitted" ? "chip-ok" : a.status === "in_progress" ? "chip-warn" : ""}`}>
                          {taskStatusLabel(a.status)}
                        </span>
                        <span className="muted">{a.allowedMinutes} min window</span>
                      </div>
                    </div>
                    <button className={`btn ${a.status === "in_progress" ? "" : "ghost"}`} onClick={() => onOpen(a.id, a.kind === "authored" ? "authored" : "standard")}>
                      {a.status === "in_progress" ? "Continue" : a.status === "submitted" ? "View" : "Open"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
