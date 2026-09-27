"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { engFetch } from "./api";

type AcceptTarget = { token: string } | { invitationId: string };

export default function AcceptEngInvitation(target: AcceptTarget) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const body = "token" in target ? { token: target.token } : { invitationId: target.invitationId };
  return (
    <div className="grid gap-3">
      <FormError>{error}</FormError>
      <div>
        <Button
          variant="accent"
          size="lg"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await engFetch<{ attemptId: string }>("/api/eng/invitations/accept", { body });
            if (res.ok === false) {
              setBusy(false);
              setError(res.error);
              return;
            }
            router.push(`/assess/${res.data.attemptId}`);
          }}
        >
          Accept invitation
        </Button>
      </div>
    </div>
  );
}
