"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { engFetch } from "./api";

export default function AcceptEngInvitation({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            const res = await engFetch<{ attemptId: string }>("/api/eng/invitations/accept", { body: { token } });
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
