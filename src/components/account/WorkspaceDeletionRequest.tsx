"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default function WorkspaceDeletionRequest({ workspaceName, requestedAt }: { workspaceName: string; requestedAt: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState<string | null>(requestedAt);

  if (received) {
    return (
      <p role="status" className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
        Requested on {day(received)}. Fydell will confirm with you by email before anything is deleted.
      </p>
    );
  }

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/workspace/deletion-request", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; receivedAt?: string };
      if (!res.ok || !data.receivedAt) {
        setError(data.error ?? "The request was not sent. Try again.");
        setBusy(false);
        return;
      }
      setReceived(data.receivedAt);
    } catch {
      setError("Couldn't reach Fydell. The request was not sent.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(true)}>
        Request deletion
      </Button>
    );
  }

  return (
    <div className="grid max-w-[60ch] gap-3 text-left">
      <ul className="space-y-1.5 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        <li className="list-inside list-disc">Every role, invitation, submission, report, decision and note in {workspaceName} is erased, for every member.</li>
        <li className="list-inside list-disc">Candidates keep their own accounts and anything they saved.</li>
        <li className="list-inside list-disc">Employment law may require you to keep hiring records. Export what you need first.</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="destructive" size="sm" loading={busy} onClick={send}>
          Send deletion request
        </Button>
        <Button type="button" variant="quiet" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      <FormError>{error}</FormError>
    </div>
  );
}
