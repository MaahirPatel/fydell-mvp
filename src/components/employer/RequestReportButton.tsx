"use client";

import { useState } from "react";

export default function RequestReportButton({
  token,
  candidateName
}: {
  token: string;
  candidateName: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function request() {
    setState("loading");
    try {
      await fetch(`/api/employer/${token}/request-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName })
      });
      setState("done");
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={request}
      disabled={state !== "idle"}
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-line-strong hover:bg-bg disabled:opacity-60"
    >
      {state === "done"
        ? "Report requested Done"
        : state === "loading"
          ? "Requesting..."
          : "Request full PDF report"}
    </button>
  );
}
