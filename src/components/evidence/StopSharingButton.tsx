"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "./request";

export default function StopSharingButton({ applicationId, versionId, title, organizationName }: { applicationId: string; versionId: string; title: string; organizationName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    setBusy(true);
    setError(null);
    const result = await request<{ ok: true }>(`/api/applications/${applicationId}/evidence`, "POST", { versionId });
    setBusy(false);
    if (result.ok === false) return setError(result.error);
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 text-app-meta text-[var(--text-secondary)]">
          <span>{organizationName} will no longer see {title}. This cannot be undone for this application.</span>
          <button type="button" onClick={revoke} disabled={busy} className="btn btn-secondary h-7 px-2.5 text-app-meta">
            {busy ? "Removing" : "Stop sharing"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn btn-ghost h-7 px-2.5 text-app-meta">
            Keep sharing
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-ghost h-7 w-fit px-2.5 text-app-meta">
          Stop sharing this project
        </button>
      )}
      {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
    </div>
  );
}
