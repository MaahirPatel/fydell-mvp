"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InvitationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: "resend" | "revoke") {
    setBusy(true);
    try {
      await fetch(`/api/admin/invitations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (status === "revoked" || status === "accepted") {
    return <span className="text-[12px] text-[rgba(244,245,247,0.4)]">—</span>;
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void run("resend")}
        className="text-[12px] text-[rgba(244,245,247,0.75)] hover:underline"
      >
        Resend
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!window.confirm("Revoke this invitation?")) return;
          void run("revoke");
        }}
        className="text-[12px] text-[#F26B82] hover:underline"
      >
        Revoke
      </button>
    </div>
  );
}
