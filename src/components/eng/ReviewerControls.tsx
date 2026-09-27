"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { engFetch } from "./api";

export function RequeueButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {error ? <span className="text-app-meta text-[var(--fydell-risk)]">{error}</span> : null}
      <Button
        size="sm"
        variant="secondary"
        loading={busy}
        onClick={async () => {
          const reason = window.prompt("Why retry this evaluation? (recorded in the attempt timeline)", "Executor fixed");
          if (!reason) return;
          setBusy(true);
          setError(null);
          const res = await engFetch(`/api/eng/review/runs/${runId}/requeue`, { body: { reason } });
          setBusy(false);
          if (res.ok === false) setError(res.error);
          else router.refresh();
        }}
      >
        Retry
      </Button>
    </span>
  );
}

export function RunWorkerButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-3">
      {message ? <span className="text-app-meta text-[var(--text-secondary)]">{message}</span> : null}
      <Button
        variant="secondary"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          const res = await engFetch<{ processed: number; statuses: string[] }>("/api/eng/worker", { body: {} });
          setBusy(false);
          if (res.ok === false) setMessage(res.error);
          else {
            setMessage(res.data.processed ? `Processed ${res.data.processed}: ${res.data.statuses.join(", ")}` : "Nothing waiting.");
            router.refresh();
          }
        }}
      >
        Process queue now
      </Button>
    </span>
  );
}
