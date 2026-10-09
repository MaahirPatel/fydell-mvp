"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { engFetch } from "@/components/eng/api";

/** Accepts a simulation invitation by id; the server checks it was sent to the signed-in email. */
export default function AcceptSimInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid justify-items-end gap-1">
      <Button
        variant="primary"
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await engFetch<{ sessionId: string }>("/api/sim/invitations/accept", { body: { invitationId } });
          if (res.ok === false) {
            setBusy(false);
            setError(res.error);
            return;
          }
          router.push(`/sim/${res.data.sessionId}`);
          router.refresh();
        }}
      >
        Accept and open
      </Button>
      <FormError>{error}</FormError>
    </div>
  );
}
