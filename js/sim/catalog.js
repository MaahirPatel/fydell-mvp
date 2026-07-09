/**
 * Simulation product catalog (library source of truth).
 * @module js/sim/catalog
 */

/**
 * @typedef {Object} SimCatalogEntry
 * @property {string} id
 * @property {string} title
 * @property {string} role
 * @property {string} industry
 * @property {string} type
 * @property {'flagship'|'available'|'prototype'|'coming_soon'} status
 * @property {string} statusLabel
 * @property {string} description
 * @property {number} [durationMin]
 * @property {string} [difficulty]
 * @property {string[]} [skills]
 * @property {boolean} inviteOnly
 */

/** @type {SimCatalogEntry[]} */
export const SIM_CATALOG = [
  {
    id: 'meridian',
    title: 'Project Meridian',
    role: 'Finance Analyst',
    industry: 'Finance',
    type: 'financial_analysis',
    status: 'flagship',
    statusLabel: 'Flagship',
    description:
      'Evaluate a $2.4B acquisition: a data room, a management case to challenge, and a recommendation for the investment committee.',
    durationMin: 25,
    difficulty: 'advanced',
    skills: ['analysis', 'risk', 'judgment', 'communication', 'ai_judgment'],
    inviteOnly: true,
  },
  {
    id: 'atlas',
    title: 'Project Atlas',
    role: 'Product Analyst',
    industry: 'Product',
    type: 'product_prioritization',
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    description:
      'Prioritize under noisy usage and complaint data — coming soon after Meridian depth is complete.',
    durationMin: 25,
    difficulty: 'advanced',
    skills: ['prioritization', 'judgment', 'communication'],
    inviteOnly: true,
  },
  {
    id: 'sentinel',
    title: 'Project Sentinel',
    role: 'Security Analyst',
    industry: 'Security',
    type: 'incident_response',
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    description:
      'Triage correlated alerts and set incident posture — coming soon after Meridian depth is complete.',
    durationMin: 25,
    difficulty: 'advanced',
    skills: ['triage', 'judgment', 'communication'],
    inviteOnly: true,
  },
  {
    id: 'harbor',
    title: 'Project Harbor',
    role: 'Operations Analyst',
    industry: 'Operations',
    type: 'operations_triage',
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    description:
      'Stabilize a clinic afternoon under staffing pressure — coming soon after Meridian depth is complete.',
    durationMin: 25,
    difficulty: 'advanced',
    skills: ['triage', 'prioritization', 'communication'],
    inviteOnly: true,
  },
];

/**
 * @param {string} id
 * @returns {SimCatalogEntry|null}
 */
export function getSimulation(id) {
  if (!id) return null;
  const key = String(id).toLowerCase();
  return SIM_CATALOG.find((s) => s.id === key) || null;
}

/**
 * @param {Object} [filters]
 * @param {string} [filters.status]
 * @param {string} [filters.industry]
 * @param {string} [filters.type]
 * @param {boolean} [filters.inviteOnly]
 * @param {boolean} [filters.availableOnly] When true, only flagship + available
 * @returns {SimCatalogEntry[]}
 */
export function listSimulations(filters = {}) {
  const {
    status,
    industry,
    type,
    inviteOnly,
    availableOnly,
  } = filters || {};

  return SIM_CATALOG.filter((s) => {
    if (status && s.status !== status) return false;
    if (industry && String(s.industry).toLowerCase() !== String(industry).toLowerCase()) {
      return false;
    }
    if (type && s.type !== type) return false;
    if (inviteOnly != null && s.inviteOnly !== !!inviteOnly) return false;
    if (availableOnly && s.status !== 'flagship' && s.status !== 'available') return false;
    return true;
  });
}
