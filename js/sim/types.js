/**
 * Fydell simulation engine — shared JSDoc typedefs.
 * Runtime exports nothing; this module exists for documentation and IDE hints.
 *
 * @module js/sim/types
 */

/**
 * @typedef {Object} ScenarioDocument
 * @property {string} id
 * @property {string} title
 * @property {string} [tag]
 * @property {string} body
 * @property {string} [category]
 */

/**
 * @typedef {Object} ScenarioObjective
 * @property {string} id
 * @property {string} label
 * @property {string} [eventType] Event type that marks this objective complete
 */

/**
 * @typedef {Object} RandomizationRule
 * @property {string} key Assumption key to randomize
 * @property {number} [min]
 * @property {number} [max]
 * @property {'uniform'|'choice'} [distribution]
 * @property {number[]} [choices]
 * @property {number} [decimals]
 */

/**
 * @typedef {Object} FinancialModel
 * @property {Object.<string, number|string>} base_assumptions
 * @property {RandomizationRule[]} [randomization_rules]
 * @property {Object.<string, *>} [correct_relationships] Relationships used later for grading
 * @property {Object.<string, Object.<string, number>>} [hist] Historical FY rows
 * @property {number} [offer] Offer enterprise value (e.g. $M)
 * @property {number} [ltmRevenue]
 */

/**
 * @typedef {Object} PlantedError
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string} [location] Document / model field where the error lives
 * @property {string|RegExp|Object} detection_criteria Heuristic used by the scorer
 * @property {string} [severity] low|medium|high
 */

/**
 * @typedef {Object} AmbiguityPoint
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string} [good_behavior] What strong candidates do
 * @property {string} [poor_behavior] What weak candidates do
 * @property {string} [prompt]
 */

/**
 * @typedef {Object} StakeholderMessageVariant
 * @property {string} id
 * @property {string} body
 * @property {boolean} [requiresResponse]
 */

/**
 * @typedef {Object} StakeholderTrigger
 * @property {string} id
 * @property {string} stakeholderId
 * @property {string} [name]
 * @property {string} [role]
 * @property {string} [when] elapsed|tab|event|manual
 * @property {number} [atElapsedSec]
 * @property {string} [atEvent]
 * @property {StakeholderMessageVariant[]} message_variants
 * @property {Object.<string, StakeholderMessageVariant[]>} [reply_followups] Topic key → variants
 * @property {boolean} [integrityPressure]
 */

/**
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {string} title
 * @property {string} [role]
 * @property {string} [industry]
 * @property {string} [type]
 * @property {number} [durationMin]
 * @property {string} [difficulty]
 * @property {string} [mandate]
 * @property {string[]} [evaluated_dimensions]
 * @property {ScenarioDocument[]} [documents]
 * @property {ScenarioObjective[]} [objectives]
 * @property {FinancialModel} [financial_model]
 * @property {PlantedError[]} [planted_errors]
 * @property {AmbiguityPoint[]} [ambiguity_points]
 * @property {StakeholderTrigger[]} [stakeholder_triggers]
 * @property {Object.<string, *>} [meta]
 */

/**
 * @typedef {Object} CandidateEvent
 * @property {string} id
 * @property {string} timestamp ISO-8601
 * @property {string} type
 * @property {Object} payload
 * @property {string} [payload.label]
 * @property {string} [payload.detail]
 * @property {string} [payload.dim]
 * @property {string} [payload.category]
 * @property {string} [payload.section]
 */

/**
 * @typedef {Object} AIUsageEvent
 * @property {string} id
 * @property {string} timestamp
 * @property {string} action ask|accept|edit|reject|copy
 * @property {string} [prompt]
 * @property {string} [response]
 * @property {string} [postAction]
 * @property {Object} [meta]
 */

/**
 * @typedef {Object} Commitment
 * @property {string} id
 * @property {string} type
 * @property {string} phrase
 * @property {string} createdAt
 * @property {string|null} fulfilledAt
 * @property {'open'|'fulfilled'|'missed'} status
 * @property {string} evidenceRequired
 */

/**
 * @typedef {Object} CandidateSession
 * @property {string} id
 * @property {string} scenarioId
 * @property {string} [inviteToken]
 * @property {string} [candidateId]
 * @property {string} [candidateName]
 * @property {string} [candidateEmail]
 * @property {string|number} variantSeed
 * @property {Scenario|null} scenario Instantiated scenario for this attempt
 * @property {CandidateEvent[]} event_log
 * @property {string} startedAt
 * @property {string|null} submittedAt
 * @property {string} currentTab
 * @property {string[]} viewedTabs
 * @property {string[]} openedResources
 * @property {string} selectedScenario base|downside|upside
 * @property {Object[]} assumptions
 * @property {Object[]} risks
 * @property {Object[]} chatMessages
 * @property {Commitment[]} commitments
 * @property {string|null} selectedRecommendation
 * @property {string} finalMemo
 * @property {number} progress
 * @property {Object|null} signalSnapshot
 * @property {string[]} usedMessageVariantIds
 * @property {AIUsageEvent[]} ai_usage_log
 * @property {Object.<string, boolean|Object>} plantedErrorFlags
 * @property {Object.<string, *>} ambiguityResponses
 * @property {'in_progress'|'submitted'|'abandoned'} status
 * @property {boolean} [_dirty]
 * @property {boolean} [_briefViewed]
 * @property {boolean} [_modelViewed]
 * @property {boolean} [_curveballSeen]
 * @property {Object} [fin] Live FY model drivers
 */

/**
 * @typedef {Object} DimensionScore
 * @property {string} key
 * @property {string} label
 * @property {number|null} score
 * @property {'insufficient_data'|'not_observed'|'limited'|'observed'|'strong'} [evidenceLevel]
 * @property {'low'|'medium'|'high'} [confidence]
 * @property {string} rationale
 * @property {string[]} evidence Event ids, quotes, or resource refs
 */

/**
 * @typedef {Object} EvaluationResult
 * @property {string} sessionId
 * @property {string} scenarioId
 * @property {string} evaluatedAt
 * @property {DimensionScore[]} dimensions
 * @property {string} [executiveSummary]
 * @property {'advance'|'hold'|'reject'|null} [recommendation]
 * @property {Object} [benchmark]
 * @property {string} [benchmark.status]
 * @property {string} [benchmark.comparison_text]
 * @property {Object} [integrity]
 * @property {Object.<string, *>} [meta]
 */

export {};
