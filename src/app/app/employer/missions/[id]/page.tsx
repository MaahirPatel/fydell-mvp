"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Check, Lock, ExternalLink } from "lucide-react";
import { defaultPrimaryDimensions } from "@/lib/fde/evaluation-contract";

type Mission = {
  id: string;
  title: string;
  objective: string;
  customer_context: string;
  success_measures: string;
  status: string;
  invitation_limit: number;
  mode?: string;
};

type Invite = {
  id: string;
  invited_email: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  under_review: "Validated (under review)",
  active: "Published",
  paused: "Paused",
  closed: "Closed",
  archived: "Archived",
};

const INVITE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  revoked: "Revoked",
};

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [hasSessions, setHasSessions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [emailDelivery, setEmailDelivery] = useState<"queued" | "not_configured" | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishOk, setPublishOk] = useState(false);

  const load = useCallback(async () => {
    try {
      const [missionRes, invitesRes] = await Promise.all([
        fetch(`/api/fde/missions/${id}`, { cache: "no-store" }),
        fetch(`/api/fde/invites?missionId=${id}`, { cache: "no-store" }),
      ]);
      const missionData = await missionRes.json();
      const invitesData = await invitesRes.json();
      if (!missionRes.ok) throw new Error(missionData.error || "Could not load simulation");
      setMission(missionData.mission);
      setHasSessions(Boolean(missionData.hasSessions));
      setInvites(invitesRes.ok ? invitesData.invites || [] : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load simulation");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#invite") {
      document.getElementById("invite")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [mission?.status]);

  async function publishSimulation() {
    setPublishBusy(true);
    setPublishError(null);
    setPublishOk(false);
    try {
      const res = await fetch(`/api/fde/missions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not publish");
      setMission(data.mission);
      setPublishOk(true);
      requestAnimationFrame(() => {
        document.getElementById("invite")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("invite-email")?.focus();
      });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setPublishBusy(false);
    }
  }

  async function setMode(mode: "demo" | "shadow_pilot") {
    setPublishBusy(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/fde/missions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_mode", mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not change mode");
      setMission(data.mission);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Could not change mode");
    } finally {
      setPublishBusy(false);
    }
  }

  async function missionAction(action: "archive" | "restore" | "duplicate") {
    setPublishBusy(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/fde/missions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Could not ${action}`);
      if (action === "duplicate" && data.mission?.id) {
        window.location.href = `/app/employer/missions/${data.mission.id}`;
        return;
      }
      setMission(data.mission);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : `Could not ${action}`);
    } finally {
      setPublishBusy(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteBusy(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/fde/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: id, email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setAcceptUrl(data.acceptUrl);
      setEmailDelivery(data.emailDelivery === "queued" ? "queued" : "not_configured");
      setEmail("");
      setName("");
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviteBusy(false);
    }
  }

  async function revokeInvite(invitationId: string, invitedEmail: string) {
    if (!window.confirm(`Revoke the invitation for ${invitedEmail}? The link will stop working.`)) {
      return;
    }
    setRevokingId(invitationId);
    setInviteError(null);
    try {
      const res = await fetch("/api/fde/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action: "revoke" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Revoke failed");
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setRevokingId(null);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-[14px] border border-[#f26b82]/30 bg-[#f26b82]/10 p-5">
        <p className="text-[14px] text-[#fda4b0]">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            load();
          }}
          className="mt-3 text-[13px] text-white/70 underline"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!mission) {
    return (
      <div className="animate-pulse space-y-3" aria-busy="true">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-32 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  const canPublish = ["draft", "under_review", "paused"].includes(mission.status);
  const canInvite = mission.status === "active";

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Mission
          </p>
          <h1
            className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[30px]"
            style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
          >
            {mission.title}
          </h1>
          <p className="mt-2 text-[13px] text-white/50">
            Preview the Project Relay workspace, publish the mission, then invite candidates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[8px] border border-white/15 px-2.5 py-1 text-[12px] text-white/60">
            {STATUS_LABEL[mission.status] || mission.status}
          </span>
          <button
            type="button"
            disabled={publishBusy}
            onClick={() =>
              void setMode(mission.mode === "shadow_pilot" ? "demo" : "shadow_pilot")
            }
            title={
              mission.mode === "shadow_pilot"
                ? "Shadow pilot: your original decision must be locked before Fydell's report is revealed. Click to switch to demo mode."
                : "Demo mode: reports are visible immediately. Click to switch to shadow-pilot mode (report sealed until you lock your original decision)."
            }
            className={
              "rounded-[8px] border px-2.5 py-1 text-[12px] disabled:opacity-50 " +
              (mission.mode === "shadow_pilot"
                ? "border-[#F2C36B]/40 text-[#F2C36B]"
                : "border-white/15 text-white/60")
            }
          >
            {mission.mode === "shadow_pilot" ? "Shadow pilot" : "Demo mode"}
          </button>
          <Link
            href={`/app/employer/missions/${id}/preview`}
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-white/15 px-3 text-[12px] text-white/80 hover:bg-white/[0.04]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview Project Relay
          </Link>
          {canPublish && (
            <button
              type="button"
              onClick={publishSimulation}
              disabled={publishBusy}
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[12px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              {publishBusy ? "Publishing…" : "Publish & invite"}
            </button>
          )}
          {canInvite && (
            <a
              href="#invite"
              className="inline-flex h-9 items-center justify-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[12px] font-semibold text-[#08090C]"
            >
              Invite candidate
            </a>
          )}
          <button
            type="button"
            onClick={() => missionAction("duplicate")}
            disabled={publishBusy}
            className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3 text-[12px] text-white/75 disabled:opacity-50"
          >
            Duplicate
          </button>
          {mission.status === "archived" ? (
            <button
              type="button"
              onClick={() => missionAction("restore")}
              disabled={publishBusy}
              className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3 text-[12px] text-white/75 disabled:opacity-50"
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Archive this simulation? You can restore it later as a draft.")) {
                  missionAction("archive");
                }
              }}
              disabled={publishBusy}
              className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3 text-[12px] text-white/55 disabled:opacity-50"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {publishError && (
        <p className="mt-3 text-[13px] text-[#fda4b0]" role="alert">
          {publishError}
        </p>
      )}
      {publishOk && (
        <p className="mt-3 text-[13px] text-[#67d9a0]" role="status">
          Simulation is active. You can invite candidates below.
        </p>
      )}

      <section className="mt-6 rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Objective
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-white/80">
          {mission.objective || "—"}
        </p>
        {mission.customer_context && (
          <>
            <h2 className="mt-5 text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Customer context
            </h2>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-[14px] leading-relaxed text-white/70">
              {mission.customer_context.slice(0, 2400)}
              {mission.customer_context.length > 2400 ? "…" : ""}
            </p>
          </>
        )}
        {mission.success_measures && (
          <>
            <h2 className="mt-5 text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Success measures
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-white/70">
              {mission.success_measures}
            </p>
          </>
        )}
      </section>

      <section
        className={
          "mt-6 rounded-[14px] border p-5 " +
          (hasSessions
            ? "border-[#3B5BFF]/25 bg-[#3B5BFF]/[0.05]"
            : "border-white/[0.1] bg-[#0A0C11]/85")
        }
      >
        <div className="flex items-center gap-2">
          {hasSessions && <Lock className="h-3.5 w-3.5 text-[#8FA3FF]" strokeWidth={2} />}
          <h2
            className={
              "text-[12px] font-medium uppercase tracking-[0.06em] " +
              (hasSessions ? "text-[#B8C4FF]" : "text-white/50")
            }
          >
            Evaluation contract{hasSessions ? " — locked" : ""}
          </h2>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">
          {hasSessions
            ? "A candidate has already started a session under this contract. Traits below can no longer change for this simulation."
            : "Candidates are evaluated on observable work across FDE traits. Traits with no opportunity to observe are marked not observed — never scored negatively."}
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {defaultPrimaryDimensions().map((d) => (
            <li key={d.dimensionId} className="flex items-baseline gap-2 text-[12.5px]">
              <span className="font-medium text-white/85">{d.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="invite"
        className="mt-6 scroll-mt-8 rounded-[14px] border border-white/[0.1] bg-[#0A0C11]/85 p-5"
      >
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Invite a candidate
        </h2>
        <p className="mt-1.5 text-[13px] text-white/50">
          Creates a shareable Project Relay link. No fake candidates — only people you invite.
        </p>

        {!canInvite ? (
          <div className="mt-3 space-y-3">
            <p className="text-[13px] text-white/50">
              Publish this mission first, then invite with a shareable link.
            </p>
            {canPublish && (
              <button
                type="button"
                onClick={publishSimulation}
                disabled={publishBusy}
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
              >
                {publishBusy ? "Publishing…" : "Publish to enable invites"}
              </button>
            )}
          </div>
        ) : !acceptUrl ? (
          <form
            onSubmit={sendInvite}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          >
            <input
              className="platform-input"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
            <input
              id="invite-email"
              className="platform-input"
              placeholder="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <button
              type="submit"
              disabled={inviteBusy}
              className="inline-flex h-[46px] items-center justify-center rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              {inviteBusy ? "Creating…" : "Create invite link"}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-3">
            {emailDelivery === "queued" ? (
              <p className="text-[13px] text-[#67d9a0]">
                Invitation email queued for delivery. Copy the secure link as a backup — it
                won&apos;t be shown again.
              </p>
            ) : (
              <p className="text-[13px] text-[#F2C36B]">
                Email delivery is not configured — no email was sent. Copy the secure invitation
                link below and share it with the candidate directly. It won&apos;t be shown again.
              </p>
            )}
            <div className="break-all rounded-[10px] border border-white/10 bg-black/30 px-3 py-2 text-[12px]">
              {acceptUrl}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(acceptUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/15 px-3 text-[12px]"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a
                href={acceptUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-white/15 px-3 text-[12px] text-white/80"
              >
                Open as candidate
              </a>
              <button
                type="button"
                onClick={() => setAcceptUrl(null)}
                className="text-[12px] text-white/50 hover:text-white"
              >
                Invite another
              </button>
            </div>
          </div>
        )}

        {inviteError && (
          <p className="mt-3 text-[13px] text-[#fda4b0]" role="alert">
            {inviteError}
          </p>
        )}

        {invites.length > 0 && (
          <ul className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]"
              >
                <span className="text-white/80">{inv.invited_email}</span>
                <span className="flex items-center gap-3">
                  <span className="text-white/45">
                    {INVITE_STATUS_LABEL[inv.status] || inv.status}
                  </span>
                  {inv.status === "pending" && (
                    <button
                      type="button"
                      disabled={revokingId === inv.id}
                      onClick={() => void revokeInvite(inv.id, inv.invited_email)}
                      className="text-[12px] text-[#fda4b0] underline disabled:opacity-50"
                    >
                      {revokingId === inv.id ? "Revoking…" : "Revoke"}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3 text-[13px]">
        <Link href="/app/employer/evidence" className="text-white/55 underline hover:text-white/80">
          View evidence reports
        </Link>
        <Link
          href="/app/employer/simulations/generate"
          className="text-white/55 underline hover:text-white/80"
        >
          Generate another simulation
        </Link>
      </div>
    </div>
  );
}
