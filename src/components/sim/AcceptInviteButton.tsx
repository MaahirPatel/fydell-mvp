"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteButton({
  token,
  signedInEmail,
  inviteEmail,
}: {
  token: string;
  signedInEmail: string;
  inviteEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailMismatch = signedInEmail.toLowerCase() !== inviteEmail.toLowerCase();

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sim/invitations/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not accept the invitation");
      router.push(`/sim/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the invitation");
      setBusy(false);
    }
  };

  return (
    <div>
      {emailMismatch && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          You&apos;re signed in as {signedInEmail}, but this invitation was sent to {inviteEmail}.
          Sign in with that email to accept.
        </p>
      )}
      <button
        onClick={() => void accept()}
        disabled={busy || emailMismatch}
        className="rounded-xl bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? "Accepting…" : "Accept invitation"}
      </button>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      )}
    </div>
  );
}
