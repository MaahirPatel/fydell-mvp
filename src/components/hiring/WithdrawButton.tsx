"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { send } from "./send";

export default function WithdrawButton({ applicationId, organizationName }: { applicationId: string; organizationName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    if (!window.confirm(`Withdraw this application? ${organizationName} loses access to the projects you shared. You can apply again while the role is open.`)) return;
    setBusy(true);
    setError(null);
    const result = await send<{ ok: true }>(`/api/applications/${applicationId}/withdraw`, "POST", {});
    setBusy(false);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <Button variant="destructive" size="sm" onClick={withdraw} loading={busy} className="justify-self-start">
        Withdraw application
      </Button>
      <FormError>{error}</FormError>
    </div>
  );
}
