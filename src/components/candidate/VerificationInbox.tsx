"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { VerificationRequest } from "@/lib/employer/review";

/**
 * Candidate verification inbox: pending targeted-verification requests
 * from employers. The candidate reads what the employer needs to see
 * and submits a focused response.
 */
export default function VerificationInbox() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidate/verifications");
      const data = (await res.json()) as { verifications?: VerificationRequest[] };
      setRequests(data.verifications ?? []);
    } catch {
      // Inbox degrades silently.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const respond = async (requestId: string) => {
    const response = (drafts[requestId] ?? "").trim();
    if (!response) return;
    setSending(requestId);
    setError(null);
    try {
      const res = await fetch(`/api/candidate/verifications/${requestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit.");
        return;
      }
      setDrafts((d) => ({ ...d, [requestId]: "" }));
      await load();
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-app-meta text-[var(--text-tertiary)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
      </p>
    );
  }

  if (requests.length === 0) {
    return (
      <p className="text-app-body text-[var(--text-tertiary)]">
        No verification requests right now. When an employer wants a closer look at a specific requirement, it will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p role="alert" className="text-app-meta text-[var(--evidence-counter)]">{error}</p>
      ) : null}
      {requests.map((v) => (
        <div key={v.id} className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="badge badge-neutral">
              {v.status === "pending" ? "Needs your response" : "Submitted — awaiting review"}
            </span>
            <span className="text-app-meta text-[var(--text-tertiary)]">
              {new Date(v.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-3 text-app-body leading-[1.55] text-[var(--text-primary)]">{v.prompt}</p>
          {v.status === "pending" ? (
            <div className="mt-3">
              <label htmlFor={`vr-${v.id}`} className="mb-1 block text-app-meta font-medium">
                Your response
              </label>
              <textarea
                id={`vr-${v.id}`}
                value={drafts[v.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [v.id]: e.target.value }))}
                maxLength={4000}
                rows={5}
                placeholder="Explain, sketch code, or describe the approach. Be specific — this is your chance to close the gap."
                className="platform-input w-full text-app-body"
              />
              <button
                type="button"
                onClick={() => void respond(v.id)}
                disabled={sending === v.id || !(drafts[v.id] ?? "").trim()}
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] disabled:opacity-50"
              >
                {sending === v.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Submit response
              </button>
            </div>
          ) : (
            <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
              <p className="text-app-meta font-medium">Your submitted response</p>
              <p className="mt-1 whitespace-pre-wrap text-app-body text-[var(--text-secondary)]">{v.candidateResponse}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
