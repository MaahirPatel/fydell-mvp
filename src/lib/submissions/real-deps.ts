import "server-only";
import {
  getSessionForCandidate,
  getTemplateById,
  submitSessionWithSnapshot,
} from "@/lib/simulations/db";
import {
  buildScenarioPackage,
  scenarioIdForTemplateSlug,
} from "@/lib/simulations/scenario-package";
import type { FileSnapshotInput } from "@/lib/simulations/submission-files";
import { SubmissionError } from "./errors";
import type { FinalizeDeps, RecoveryDeps, SessionRef } from "./finalize";
import {
  getSubmissionReceiptBySession,
  loadTransferState,
  transitionTransferState,
} from "./transfer-store";

/**
 * Real (Supabase-backed) dependencies for the finalize core. Used by the
 * submit and finalize routes. Session ownership comes from
 * `getSessionForCandidate` (UP-02); the atomic store is the idempotent
 * `submit_session_atomic` RPC via `submitSessionWithSnapshot`.
 */

function mapSessionError(err: unknown): SubmissionError {
  const msg = err instanceof Error ? err.message : "";
  if (/session not found/i.test(msg)) return new SubmissionError("SESSION_NOT_FOUND");
  if (/forbidden/i.test(msg)) return new SubmissionError("FORBIDDEN");
  return new SubmissionError("INFRA_ERROR");
}

async function getSessionRef(sessionId: string, userId: string): Promise<SessionRef> {
  try {
    const s = await getSessionForCandidate(sessionId, userId);
    return {
      id: s.id as string,
      candidateUserId: s.candidate_user_id as string,
      templateId: s.template_id as string,
      status: s.status as string,
    };
  } catch (err) {
    throw mapSessionError(err);
  }
}

export function realFinalizeDeps(): FinalizeDeps {
  return {
    getSession: getSessionRef,
    async getScenarioPin(session) {
      const template = await getTemplateById(session.templateId);
      const scenarioId = scenarioIdForTemplateSlug((template as { slug?: string }).slug ?? "");
      if (!scenarioId) throw new SubmissionError("SCENARIO_UNAVAILABLE");
      const pkg = buildScenarioPackage(scenarioId);
      return { scenarioId: pkg.scenarioId, scenarioVersion: pkg.scenarioVersion };
    },
    loadTransfer: loadTransferState,
    storeTransferTransition: transitionTransferState,
    async atomicSubmit(args) {
      try {
        const res = await submitSessionWithSnapshot(
          args.sessionId,
          args.userId,
          args.disclosed,
          args.fileSnapshot as unknown,
          args.answers
        );
        return {
          submissionId: res.submissionId,
          alreadySubmitted: res.alreadySubmitted,
          receiptHash: res.receiptHash,
        };
      } catch (err) {
        // The core pre-validated the snapshot; anything failing here is
        // infrastructure. Never forward database error text to the client.
        void err;
        throw new SubmissionError("INFRA_ERROR");
      }
    },
    getSubmissionBySession: getSubmissionReceiptBySession,
  };
}

export function realRecoveryDeps(): RecoveryDeps {
  return {
    getSession: getSessionRef,
    loadTransfer: loadTransferState,
    getSubmissionBySession: getSubmissionReceiptBySession,
  };
}

export type { FileSnapshotInput };
