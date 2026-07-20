/**
 * Generative FDE simulation compiler — public surface.
 *
 * See compile.ts for the pipeline overview. Nothing in this folder calls an
 * LLM; every "generative" step is a bounded, seeded, deterministic selection
 * over a closed catalog (episode templates, name pools, quirk types).
 */
export * from "./types";
export * from "./role-compiler";
export * from "./measurement-planner";
export {
  SELECTION_VERSION,
  EXPERT_PRIOR_SIGMA,
  LOGDET_EPS,
  EXPERT_PRIOR_V1,
  moduleLoadingVector,
  informationMatrix,
  logdet,
  designQualityLogdet,
  moduleUtility,
  selectModulesDOptimal,
} from "./selection";
export type { SelectableModule, ModuleUtilityBreakdown, DOptimalSelectionResult } from "./selection";
export {
  DURATION_CPM_VERSION,
  DEFAULT_RHO,
  DEFAULT_KAPPA,
  buildEpisodeDag,
  validateEpisodeTopo,
  criticalPathMinutes,
  durationEstimate,
  episodeKindRank,
  isParallelEpisodeKind,
} from "./duration-cpm";
export type { EpisodeDag, TopoValidation } from "./duration-cpm";
export {
  CURVEBALL_UTILITY_VERSION,
  CURVEBALL_UTILITY_WEIGHTS,
  scoreCurveball,
  selectCurveballsByUtility,
} from "./curveball-utility";
export type { CurveballUtilityComponents, CurveballUtilityResult } from "./curveball-utility";
export * from "./world-generator";
export * from "./validators";
export * from "./difficulty";
export * from "./ambiguity";
export * from "./edit-graph";
export * from "./compile";
export * from "./overlay";
export * from "./blueprint-schema";
export * from "./determinism";
