"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type Acceptance = {
  id: string;
  shareId: string;
  candidateUserId: string;
  sessionId: string;
  notes: string;
  acceptedAt: string;
};

/**
 * Employer receipt acceptance: review a candidate's shared simulation
 * results and formally accept them as evidence in this org's process.
 */
export default function ReceiptAcceptance() {
  const [token, setToken] = useState("");
  const [notes, setNotes] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justAccepted, setJustAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employer/receipts/accepted");
      const data = (await res.json()) as { acceptances?: Acceptance[] };
      setAccepted(data.acceptances ?? []);
    } catch {
      // Degrades silently.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async () => {
    if (!token.trim()) return;
    setAccepting(true);
    setError(null);
    setJustAccepted(false);
    try {
      const res = await fetch("/api/employer/receipts/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken: token.trim(), notes: notes.trim() }),
      });
      const data = (await res.json()) as { acceptance?: Acceptance; alreadyAccepted?: boolean; error?: string };
      if (!res.ok || !data.acceptance) {
        setError(data.error ?? "Could not accept the receipt.");
        return;
      }
      setJustAccepted(!data.alreadyAccepted);
      setToken("");
      setNotes("");
      await load();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
        <h3 className="text-app-body font-semibold">Accept shared results</h3>
        <p className="mt-1 text-app-meta leading-[1.55] text-[var(--text-tertiary)]">
          Paste the share token from a candidate&apos;s simulation results link. Accepting records
          that your team reviewed these results as evidence — it doesn&apos;t copy their data.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="ra-token" className="mb-1 block text-app-meta font-medium">Share token</label>
            <input
              id="ra-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the token from the candidate's share link"
              autoComplete="off"
              spellCheck={false}
              className="platform-input font-mono text-app-body"
            />
          </div>
          <div>
            <label htmlFor="ra-notes" className="mb-1 block text-app-meta font-medium">
              Note <span className="font-normal text-[var(--text-tertiary)]">(optional)</span>
            </label>
            <textarea
              id="ra-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Why your team is accepting these results"
              className="platform-input text-app-body"
            />
          </div>
          {error ? (
            <p role="alert" className="text-app-meta text-[var(--evidence-counter)]">{error}</p>
          ) : null}
          {justAccepted ? (
            <p className="flex items-center gap-1.5 text-app-meta text-[var(--evidence-support)]">
              <Check className="h-4 w-4" aria-hidden /> Recorded. These results are now evidence in your process.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void accept()}
            disabled={accepting || !token.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] disabled:opacity-50"
          >
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Accept as evidence
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-app-body font-semibold">Accepted results {accepted.length > 0 ? `(${accepted.length})` : ""}</h3>
        {loading ? (
          <p className="mt-2 flex items-center gap-2 text-app-meta text-[var(--text-tertiary)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : accepted.length === 0 ? (
          <p className="mt-2 text-app-body text-[var(--text-tertiary)]">
            Nothing accepted yet. Accepted shares appear here as an audit trail.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accepted.map((a) => (
              <li key={a.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-app-meta text-[var(--text-primary)]">
                    Session {a.sessionId.slice(0, 8)}…
                  </span>
                  <span className="text-app-meta text-[var(--text-tertiary)]">
                    {new Date(a.acceptedAt).toLocaleDateString()}
                  </span>
                </div>
                {a.notes ? (
                  <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{a.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
