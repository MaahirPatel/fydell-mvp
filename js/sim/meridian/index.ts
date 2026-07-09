/**
 * Meridian public API surface (TypeScript).
 */

export {
  instantiateMeridianSeed,
  calculateValuation,
  TARGET_COMPANIES,
} from './seed.js';
export type { MeridianSeedParams } from './seed.js';

export {
  buildMeridianDocuments,
  PLANTED_ERRORS,
  AMBIGUITY_POINT,
  synergyDoubleCountNote,
} from './documents.js';

export {
  tickChatTriggers,
  handleCandidateChatReply,
  hasRepliedToD1AndSubstantive,
  isSubstantiveReply,
  recordAiAsk,
} from './chatMachine.js';

export { askMeridianAI, finalizeAiUsage } from './ai.js';

export {
  getMeridianMissingRequirements,
  canSubmitMeridian,
  calculateMeridianProgress,
  getStageCompletion,
} from './gates.js';

export {
  evaluateMeridianSession,
  formatMeridianReport,
} from './evaluate.js';
export type { EvaluationResult, DimensionScore } from './evaluate.js';

export {
  createMeridianSession,
  viewBrief,
  openDocument,
  viewFinancials,
  adjustValuation,
  addAssumption,
  addRisk,
  setRecommendation,
  tick,
  replyToChat,
  askAI,
  getMissing,
  canSubmit,
  submitMeridian,
  getElapsedSec,
  getRemainingSec,
  syncElapsed,
  log,
} from './session.js';
export type { MeridianSession, MeridianEvent } from './session.js';
