"use client";

/**
 * Candidate result page: polls until scoring completes, then shows the
 * evidence-backed result and the controls over who else may read it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { MicroResultView } from "./MicroResultView";
import { EvidenceReportV2 } from "./EvidenceReportV2";
import { FeedbackForm } from "./FeedbackForm";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidateDefense } from "@/components/candidate/CandidateDefense";
import { WorkReceiptPermission } from "@/components/fydell/WorkReceiptPermission";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import type { MicroResult } from "@/lib/simulations/micro-scoring";
import { isV2PersistedResult, type V2PersistedResult } from "@/lib/simulations/v2/scoring";

type ResultUnion = MicroResult | V2PersistedResult;

interface ResultPayload {
  ready: boolean;
  failed?: boolean;
  result?: ResultUnion;
  credential?: { credential_number: string } | null;
}

export function MicroResultClient({ sessionId }: { sessionId: string }) {
  const [payload, setPayload] = useState<ResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const attemptsRef = useRef(0);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Each poll re-runs the effect rather than the fetch calling itself.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      try {
        const res = await fetch(`/api/sim/results/${sessionId}`);
        const data = (await res.json()) as ResultPayload & { error?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Could not load your result");
        setPayload(data);
        setError(null);
        if (data.ready) return;

        attemptsRef.current += 1;
        // Retry scoring if it failed, then keep polling.
        if (data.failed && attemptsRef.current <= 3) {
          await fetch(`/api/sim/sessions/${sessionId}/analyze`, { method: "POST" }).catch(
            () => {}
          );
          if (cancelled) return;
        }
        if (attemptsRef.current < 20) {
          timer = setTimeout(() => setReloadKey((k) => k + 1), 2500);
        } else {
          setError(
            "Scoring is taking longer than expected. Refresh this page in a moment. Your work is saved."
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your result");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, reloadKey]);

  if (error && !payload?.ready) {
    return (
      <CandidateShell width="narrow">
        <Surface tone="panel" className="px-5 py-6">
          <p className="text-[14px] leading-[1.65] text-[var(--text-secondary)]">
            {error}
          </p>
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={() => {
                attemptsRef.current = 0;
                setReloadKey((k) => k + 1);
              }}
            >
              Try again
            </Button>
          </div>
        </Surface>
      </CandidateShell>
    );
  }

  if (!payload || !payload.ready || !payload.result) {
    return (
      <CandidateShell width="narrow">
        <Surface tone="panel" className="px-5 py-8 text-center" role="status">
          <div
            className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--fydell-evidence)]"
            aria-hidden
          />
          <p className="mt-4 text-[14.5px] font-medium text-[var(--text-primary)]">
            Working through your submission
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
            Your work is saved. This usually takes a few seconds.
          </p>
        </Surface>
      </CandidateShell>
    );
  }

  const result = payload.result;
  const v2Result = isV2PersistedResult(result) ? result : null;

  return (
    <CandidateShell width="wide">
      {v2Result ? (
        <EvidenceReportV2 result={v2Result} />
      ) : (
        <MicroResultView result={result as MicroResult} />
      )}

      <div className="mt-5">
        <CandidateDefense sessionId={sessionId} />
      </div>

      <div className="mt-5">
        <WorkReceiptPermission sessionId={sessionId} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <ButtonLink href="/app/candidate" variant="secondary">
          Back to your evaluations
        </ButtonLink>
        <Button
          variant="quiet"
          onClick={() => {
            setShowFeedback(true);
            setTimeout(
              () => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }),
              50
            );
          }}
        >
          Give feedback
        </Button>
        {payload.credential ? (
          <span className="ml-auto text-[12px] text-[var(--text-tertiary)]">
            Receipt {payload.credential.credential_number}
          </span>
        ) : null}
      </div>

      <div ref={feedbackRef} className="mt-5">
        {showFeedback ? <FeedbackForm sessionId={sessionId} /> : null}
      </div>
    </CandidateShell>
  );
}
