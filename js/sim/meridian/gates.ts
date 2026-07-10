/**
 * Part F — submission gate + progress for FP&A Forecast Review.
 * Stages: Brief → Data Room → Forecast Model → Assumptions Review → Final Recommendation.
 */

import { hasRepliedToD1AndSubstantive, type ChatSessionSlice } from './chatMachine.js';

export type MeridianSessionState = ChatSessionSlice & {
  _briefViewed?: boolean;
  openedDocs: string[];
  _financialsViewed?: boolean;
  _valuationAdjusted?: boolean;
  assumptions: { id: string; text: string; affects?: string; at?: string }[];
  risks: { id: string; category: string; text: string; at?: string }[];
  recommendation?: {
    category?: string | null;
    reason1?: string;
    reason2?: string;
    reason3?: string;
    diligence?: string;
  };
  finalMemo?: string;
  m1_fired?: boolean;
  m1_acknowledged?: boolean;
};

export type MissingItem = { id: string; label: string; blocking: boolean };

export function getMeridianMissingRequirements(session: MeridianSessionState): MissingItem[] {
  const missing: MissingItem[] = [];

  if (!session._briefViewed) {
    missing.push({ id: 'brief', label: 'View the CFO Brief', blocking: true });
  }

  const docs = session.openedDocs || [];
  if (docs.length < 2) {
    missing.push({
      id: 'docs',
      label: `Open at least 2 Data Room documents (${docs.length}/2)`,
      blocking: true,
    });
  }

  if (!session._financialsViewed || !session._valuationAdjusted) {
    missing.push({
      id: 'financials',
      label: 'View the Forecast Model and adjust at least one assumption',
      blocking: true,
    });
  }

  if (!(session.assumptions && session.assumptions.length >= 1)) {
    missing.push({ id: 'assumption', label: 'Log at least 1 assumption', blocking: true });
  }

  if (!(session.risks && session.risks.some((r) => (r.text || '').trim().length >= 8))) {
    missing.push({ id: 'risk', label: 'Flag at least 1 risk with elaboration', blocking: true });
  }

  // A1 (CFO Alex Kim) reply gate — same mechanism as D1
  if (session.d1_fired && !hasRepliedToD1AndSubstantive(session)) {
    missing.push({
      id: 'd1',
      label: "Reply substantively to Alex Kim's question (15+ characters)",
      blocking: true,
    });
  }

  // J1 (VP Sales Jordan Lee) acknowledgment — non-blocking but listed
  if (
    (session.used_trigger_ids || []).includes('J1') &&
    !session.m1_acknowledged
  ) {
    missing.push({
      id: 'm1',
      label: "Acknowledge VP Sales update: address the sales cycle extension and at-risk renewals in your risks or assumptions",
      blocking: false,
    });
  }

  const rec = session.recommendation || {};
  if (!rec.category) {
    missing.push({ id: 'rec_cat', label: 'Select a recommendation (Go / Hold / Revise)', blocking: true });
  }
  if (!(rec.reason1 || '').trim() || !(rec.reason2 || '').trim() || !(rec.reason3 || '').trim()) {
    missing.push({ id: 'rec_reasons', label: 'Fill all three key reasons', blocking: true });
  }
  if (!(session.risks && session.risks.length)) {
    missing.push({ id: 'rec_risks', label: 'Risks must be present on the recommendation', blocking: true });
  }
  if (!(session.assumptions && session.assumptions.length)) {
    missing.push({
      id: 'rec_assumptions',
      label: 'Assumptions must be present on the recommendation',
      blocking: true,
    });
  }
  if ((rec.diligence || '').trim().length < 40) {
    missing.push({
      id: 'diligence',
      label: 'Verification steps must be at least 40 characters',
      blocking: true,
    });
  }

  return missing;
}

export function canSubmitMeridian(session: MeridianSessionState): boolean {
  return getMeridianMissingRequirements(session).every((m) => !m.blocking);
}

export function calculateMeridianProgress(session: MeridianSessionState): number {
  if (session.submitted) return 100;
  let p = 5;
  if (session._briefViewed) p += 10;
  if ((session.openedDocs || []).length >= 2) p += 15;
  if (session._valuationAdjusted) p += 10;
  if ((session.assumptions || []).length >= 1) p += 15;
  if ((session.risks || []).length >= 1) p += 15;
  if (hasRepliedToD1AndSubstantive(session) && session.d1_fired) p += 10;
  else if (!session.d1_fired && (session.chatMessages || []).some((m) => m.sender === 'candidate')) p += 5;
  if (session.recommendation?.category) p += 5;
  if ((session.recommendation?.diligence || '').length >= 40) p += 10;
  return Math.min(95, p);
}

export type StageId = 'brief' | 'analyze' | 'build' | 'recommend' | 'submit';

export function getStageCompletion(session: MeridianSessionState): Record<StageId, boolean> {
  return {
    brief: !!session._briefViewed,
    analyze: (session.openedDocs || []).length >= 2,
    build: !!(session._valuationAdjusted && (session.assumptions || []).length >= 1),
    recommend: !!(
      session.recommendation?.category &&
      (session.risks || []).length >= 1 &&
      (session.recommendation?.diligence || '').length >= 40
    ),
    submit: !!session.submitted,
  };
}
