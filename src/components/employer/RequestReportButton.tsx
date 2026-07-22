"use client";

import { useState } from "react";

export default function RequestReportButton({
  token,
  candidateName
}: {
  token: string;
  candidateName: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setState("loading");
    setError(null);
    try {
      const res = await fetch(`/api/employer/${token}/request-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "The report request could not be sent.");
      }
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The report request could not be sent.");
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={request}
        disabled={state === "loading" || state === "done"}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-line-strong hover:bg-bg disabled:opacity-60"
      >
        {state === "done"
          ? "Report requested"
          : state === "loading"
            ? "Requesting..."
            : state === "failed"
              ? "Retry report request"
              : "Request full PDF report"}
      </button>
      {error && (
        <span role="alert" className="text-[11px] text-red-500">
          {error}
        </span>
      )}
    </span>
  );
}
