"use client";

import { useEffect, useState } from "react";

type Invite = {
  id: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  missionTitle: string;
  organizationName: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending — check your email for the invite link",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  revoked: "Revoked",
};

export default function FdeInvitationsPage() {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fde/invites", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load invitations");
        setInvites(data.invites || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load invitations");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Invitations
      </p>
      <h1
        className="mt-1 text-[28px] text-[#F4F5F7] sm:text-[34px]"
        style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
      >
        Your invitations
      </h1>

      {error ? (
        <p className="mt-8 text-[14px] text-[#fda4b0]">{error}</p>
      ) : invites === null ? (
        <div className="mt-8 animate-pulse space-y-3">
          <div className="h-16 rounded-[14px] bg-white/5" />
        </div>
      ) : invites.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-14 text-center">
          <h2 className="text-[22px] text-white" style={{ fontWeight: 560 }}>
            No invitations yet
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
            Invitations from employers will show up here once they invite you to a mission.
          </p>
        </section>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85">
          {invites.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px]">
              <div>
                <p className="font-medium text-white">{inv.missionTitle}</p>
                <p className="mt-0.5 text-white/45">{inv.organizationName || "An employer"}</p>
              </div>
              <span className="text-white/55">{STATUS_LABEL[inv.status] || inv.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
