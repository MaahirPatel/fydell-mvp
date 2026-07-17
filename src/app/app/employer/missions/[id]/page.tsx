"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Copy, Check } from "lucide-react";

type Mission = {
  id: string;
  title: string;
  objective: string;
  customer_context: string;
  success_measures: string;
  status: string;
  invitation_limit: number;
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
  under_review: "Under review",
  active: "Active",
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
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [missionRes, invitesRes] = await Promise.all([
        fetch(`/api/fde/missions/${id}`, { cache: "no-store" }),
        fetch(`/api/fde/invites?missionId=${id}`, { cache: "no-store" }),
      ]);
      const missionData = await missionRes.json();
      const invitesData = await invitesRes.json();
      if (!missionRes.ok) throw new Error(missionData.error || "Could not load mission");
      setMission(missionData.mission);
      setInvites(invitesRes.ok ? invitesData.invites || [] : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load mission");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
      setEmail("");
      setName("");
      load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviteBusy(false);
    }
  }

  if (loadError) {
    return <p className="text-[14px] text-[#fda4b0]">{loadError}</p>;
  }
  if (!mission) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-32 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  const canInvite = mission.status === "under_review" || mission.status === "active";

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-white/60">
          {STATUS_LABEL[mission.status] || mission.status}
        </span>
      </div>

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
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
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-white/70">
              {mission.customer_context}
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

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
          Invite an FDE
        </h2>

        {!canInvite ? (
          <p className="mt-3 text-[13px] text-white/50">
            This mission must finish review before you can invite an FDE.
          </p>
        ) : !acceptUrl ? (
          <form onSubmit={sendInvite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <input
              className="platform-input"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="platform-input"
              placeholder="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={inviteBusy}
              className="inline-flex h-[46px] items-center justify-center rounded-[10px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
            >
              {inviteBusy ? "Sending…" : "Invite"}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-[13px] text-white/60">
              Share this link with the FDE. It won&apos;t be shown again.
            </p>
            <div className="break-all rounded-[10px] border border-white/10 bg-black/30 px-3 py-2 text-[12px]">
              {acceptUrl}
            </div>
            <div className="flex gap-3">
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

        {inviteError && <p className="mt-3 text-[13px] text-[#fda4b0]">{inviteError}</p>}

        {invites.length > 0 && (
          <ul className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]"
              >
                <span className="text-white/80">{inv.invited_email}</span>
                <span className="text-white/45">
                  {INVITE_STATUS_LABEL[inv.status] || inv.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
