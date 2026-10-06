"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { VerificationRequest, VerificationStatus } from "@/lib/employer/review";

const STATUS_LABEL: Record<VerificationStatus, string> = {
  pending: "Awaiting candidate",
  submitted: "Needs your review",
  accepted: "Accepted",
  rejected: "Not satisfied",
};

/**
 * Targeted verification panel for the employer review screen.
 *
 * When a requirement mapping is unresolved or questioned, the reviewer can
 * request targeted verification: a focused ask for the candidate to
 * demonstrate that specific criterion. Lighter than a full simulation,
 * more structured than a Q&A thread.
 */
export default function VerificationRequestPanel({
  roleId,
  shareId,
  mappingId,
  candidateName,
}: {
  roleId: string;
  shareId: string;
  mappingId: string | null;
  candidateName: string;
}) {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/verify`);
      const data = (await res.json()) as { verifications?: VerificationRequest[] };
      const all = data.verifications ?? [];
      setRequests(mappingId ? all.filter((v) => v.mappingId === mappingId) : all);
    } catch {
      // Panel degrades silently; the review screen still works.
    } finally {
      setLoading(false);
    }
  }, [roleId, shareId, mappingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (!prompt.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), mappingId }),
      });
      const data = (await res.json()) as { verification?: VerificationRequest; error?: string };
      if (!res.ok || !data.verification) {
        setError(data.error ?? "Could not send the request.");
        return;
      }
      setPrompt("");
      setShowForm(false);
      await load();
    } finally {
      setSending(false);
    }
  };

  const review = async (requestId: string, decision: "accepted" | "rejected") => {
    setReviewing(requestId);
    setError(null);
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/verify/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reviewerNote: reviewNote.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not record the review.");
        return;
      }
      setReviewNote("");
      await load();
    } finally {
      setReviewing(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-app-meta text-[var(--text-tertiary)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading verification requests…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-app-meta font-semibold text-[var(--text-primary)]">
          Targeted verification {requests.length > 0 ? `(${requests.length})` : ""}
        </p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="text-app-meta font-medium text-[var(--text-primary)] underline underline-offset-4"
        >
          {showForm ? "Cancel" : "Request verification"}
        </button>
      </div>

      {showForm ? (
        <div className="rounded-[8px] border border-[var(--border-subtle)] p-3">
          <label htmlFor="verify-prompt" className="mb-1 block text-app-meta font-medium">
            What do you need {candidateName} to demonstrate?
          </label>
          <textarea
            id="verify-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="e.g. Walk through how you'd handle a retry storm from this webhook endpoint. A short written explanation or code sketch is fine."
            className="platform-input w-full text-app-body"
          />
          <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">
            Focused ask for this requirement — not a full reassessment.
          </p>
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !prompt.trim()}
            className="mt-2 inline-flex h-9 items-center gap-2 rounded-full bg-[var(--control-solid)] px-4 text-app-meta font-medium text-[var(--control-solid-ink)] disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Send request
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-app-meta text-[var(--evidence-counter)]">{error}</p>
      ) : null}

      {requests.map((v) => (
        <div key={v.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="badge badge-neutral">{STATUS_LABEL[v.status]}</span>
            <span className="text-app-meta text-[var(--text-tertiary)]">
              {new Date(v.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-2 text-app-body text-[var(--text-primary)]">{v.prompt}</p>
          {v.candidateResponse ? (
            <div className="mt-2 border-t border-[var(--border-subtle)] pt-2">
              <p className="text-app-meta font-medium text-[var(--text-primary)]">Candidate response</p>
              <p className="mt-1 whitespace-pre-wrap text-app-body text-[var(--text-secondary)]">{v.candidateResponse}</p>
            </div>
          ) : null}
          {v.status === "submitted" ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Note for the record (optional)"
                aria-label="Reviewer note"
                className="platform-input w-full text-app-body"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void review(v.id, "accepted")}
                  disabled={reviewing === v.id}
                  className="inline-flex h-9 items-center rounded-full bg-[var(--control-solid)] px-4 text-app-meta font-medium text-[var(--control-solid-ink)] disabled:opacity-50"
                >
                  {reviewing === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => void review(v.id, "rejected")}
                  disabled={reviewing === v.id}
                  className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] px-4 text-app-meta font-medium"
                >
                  Not satisfied
                </button>
              </div>
            </div>
          ) : null}
          {v.reviewerNote && v.status !== "submitted" ? (
            <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">Reviewer: {v.reviewerNote}</p>
          ) : null}
        </div>
      ))}

      {requests.length === 0 && !showForm ? (
        <p className="text-app-meta text-[var(--text-tertiary)]">
          No verification requested for this requirement yet.
        </p>
      ) : null}
    </div>
  );
}
