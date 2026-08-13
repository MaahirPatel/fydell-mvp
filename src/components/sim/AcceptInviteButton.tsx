"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";

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

  if (emailMismatch) {
    return (
      <div>
        {/* A disabled button with the reason above it leaves the candidate with
            nothing to press. The way out is a different sign-in, so offer it. */}
        <p className="max-w-[62ch] rounded-[var(--radius-panel)] border border-[rgba(233,185,73,0.3)] bg-[rgba(233,185,73,0.08)] px-3.5 py-2.5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
          You are signed in as {signedInEmail}, and this invitation was sent to{" "}
          {inviteEmail}. Sign in with that address to accept it.
        </p>
        <div className="mt-3">
          <ButtonLink
            href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
            variant="primary"
            size="lg"
          >
            Sign in as {inviteEmail}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="primary"
        size="lg"
        loading={busy}
        onClick={() => void accept()}
      >
        Accept and continue
      </Button>
      {error ? (
        <p
          role="alert"
          className="mt-3 max-w-[62ch] text-[13.5px] leading-[1.6] text-[var(--fydell-risk)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
