/**
 * Fydell simulation engine — public API.
 * Bundled by esbuild to sim-engine.js (globalName: FydellSim).
 *
 * When `content/meridian.scenario.json` exists, wire it here with:
 *   import meridian from './content/meridian.scenario.json';
 *   FydellSim.setMeridianTemplate(meridian);
 * esbuild loads JSON without import assertions.
 *
 * @module js/sim/index
 */

import './types.js';

import { SIM_CATALOG, getSimulation, listSimulations } from './catalog.js';
import {
  makeEventId,
  logEvent,
  listEvents,
} from './events.js';
import {
  STORAGE_PREFIX,
  createSession,
  saveSession,
  loadSession,
  resumeSession,
  listSessionIds,
  markSubmitted,
} from './session.js';
import {
  calculateSimulationProgress,
  getMissingSubmissionRequirements,
  canSubmit,
} from './progress.js';
import {
  detectCommitments,
  evaluateCommitments,
} from './commitments.js';
import {
  evaluateSession,
  formatEvaluationForReport,
} from './evaluate.js';
import {
  pickStakeholderMessage,
  generateStakeholderReply,
  ensureNoRepeat,
} from './chat.js';
import {
  mulberry32,
  seedToUint32,
  instantiateAssumptions,
  calculateModel,
  scenarioPack,
} from './fyModel.js';
import {
  loadMeridianTemplate,
  resolveMeridianTemplate,
  instantiateScenario,
} from './scenario.js';
import meridianScenarioJson from './content/meridian.scenario.json';
import * as Meridian from './meridian/index.ts';

/**
 * Prefer the bundled Meridian JSON (esbuild inlines it). Fall back to lazy load.
 * @type {Object|null}
 */
let meridianTemplate = meridianScenarioJson || null;

/**
 * @returns {Promise<Object|null>}
 */
async function getMeridianTemplate() {
  if (meridianTemplate) return meridianTemplate;
  const loaded = await loadMeridianTemplate();
  if (loaded) meridianTemplate = loaded;
  return meridianTemplate;
}

/**
 * @param {string|number} [seed]
 * @param {Object} [templateOverride]
 * @returns {Promise<import('./types.js').Scenario>}
 */
async function instantiateMeridian(seed, templateOverride) {
  const template =
    resolveMeridianTemplate(templateOverride) ||
    (await getMeridianTemplate());
  if (!template) {
    throw new Error(
      'Meridian scenario JSON is not available yet. Pass a template to instantiateScenario(template, seed).'
    );
  }
  return instantiateScenario(template, seed);
}

/** @type {Object} */
export const FydellSim = {
  SIM_CATALOG,
  getSimulation,
  listSimulations,

  makeEventId,
  logEvent,
  listEvents,

  STORAGE_PREFIX,
  createSession,
  saveSession,
  loadSession,
  resumeSession,
  listSessionIds,
  markSubmitted,

  calculateSimulationProgress,
  getMissingSubmissionRequirements,
  canSubmit,

  detectCommitments,
  evaluateCommitments,

  evaluateSession,
  formatEvaluationForReport,

  pickStakeholderMessage,
  generateStakeholderReply,
  ensureNoRepeat,

  mulberry32,
  seedToUint32,
  instantiateAssumptions,
  calculateModel,
  scenarioPack,

  loadMeridianTemplate,
  resolveMeridianTemplate,
  instantiateScenario,
  getMeridianTemplate,
  instantiateMeridian,
  setMeridianTemplate(template) {
    meridianTemplate = resolveMeridianTemplate(template);
    return meridianTemplate;
  },

  // Full Meridian engine (Part B–G)
  Meridian,
  createMeridianSession: Meridian.createMeridianSession,
  submitMeridian: Meridian.submitMeridian,
  evaluateMeridianSession: Meridian.evaluateMeridianSession,
  formatMeridianReport: Meridian.formatMeridianReport,
  hasRepliedToD1AndSubstantive: Meridian.hasRepliedToD1AndSubstantive,
  tickMeridianChat: Meridian.tick,
  meridianAskAI: Meridian.askAI,
  meridianReplyChat: Meridian.replyToChat,
  meridianCanSubmit: Meridian.canSubmit,
  meridianGetMissing: Meridian.getMissing,
  meridianAdjustValuation: Meridian.adjustValuation,
  meridianAddAssumption: Meridian.addAssumption,
  meridianAddRisk: Meridian.addRisk,
  meridianOpenDocument: Meridian.openDocument,
  meridianViewBrief: Meridian.viewBrief,
  meridianSetRecommendation: Meridian.setRecommendation,
  meridianGetRemaining: Meridian.getRemainingSec,
  meridianGetElapsed: Meridian.getElapsedSec,
  meridianProgress: Meridian.calculateMeridianProgress,
  meridianStages: Meridian.getStageCompletion,
};

try {
  if (typeof globalThis !== 'undefined') {
    globalThis.FydellSim = FydellSim;
  }
} catch {
  /* ignore */
}

export default FydellSim;
