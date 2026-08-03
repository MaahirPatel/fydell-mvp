"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Row actions for invitation tables. "copy" resends the invitation (tokens
 * are stored hashed, so a fresh link is the only way to get a shareable URL)
 * and puts the new link on the clipboard.
 */
export function useInvitationActions() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const act = async (id: string, action: "resend" | "revoke" | "copy") => {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/sim/invitations/manage/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "copy" ? "resend" : action }),
      });
      const data = (await res.json()) as {
        error?: string;
        inviteUrl?: string;
        emailDelivery?: string;
      };
      if (!res.ok) throw new Error(data.error || "The action failed. Try again.");

      if (action === "revoke") {
        setNotice("Invitation revoked. The link no longer works.");
      } else if (action === "copy" && data.inviteUrl) {
        try {
          await navigator.clipboard.writeText(data.inviteUrl);
          setNotice("A fresh invitation link was copied. Earlier links no longer work.");
        } catch {
          setNotice(`Copy this link: ${data.inviteUrl}`);
        }
      } else if (data.inviteUrl) {
        setNotice(
          data.emailDelivery === "sent"
            ? "A new invitation email was sent."
            : `Email is not set up. Share this link: ${data.inviteUrl}`
        );
      }
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "The action failed. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return { act, busyId, notice };
}
