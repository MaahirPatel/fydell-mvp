/**
 * duration-cpm.ts — critical-path duration estimate over the episode DAG.
 *
 * Kind precedence (serial spine):
 *   intake_brief → data_defect_trap → verification_gate → handoff_submission
 *
 * Optional parallel branch after the defect (or intake if no defect):
 *   stakeholder_contradiction ∥ curveball_event → both feed verification
 *
 * Checklist formula (expert_prior_v1):
 *   T̂ = CPM + ρ · H_ambiguity + κ · (Σ minutes − CPM)
 * where ρ converts ambiguity entropy (bits) into buffer minutes and κ is the
 * fraction of non-critical-path work that still adds wall-clock load.
 */
import type { DurationEstimate, Episode, EpisodeKind } from "./types";

/** Re-export for callers that import duration math from this module. */
export type { DurationEstimate };

export const DURATION_CPM_VERSION = "duration-cpm-expert-prior-v1";

/** expert_prior_v1 — minutes of buffer per bit of ambiguity entropy. */
export const DEFAULT_RHO = 2.5;
/** expert_prior_v1 — share of off-critical-path minutes that still add duration. */
export const DEFAULT_KAPPA = 0.15;

const KIND_ORDER: EpisodeKind[] = [
  "intake_brief",
  "data_defect_trap",
  "stakeholder_contradiction",
  "curveball_event",
  "verification_gate",
  "handoff_submission",
];

const KIND_RANK = Object.fromEntries(KIND_ORDER.map((k, i) => [k, i])) as Record<EpisodeKind, number>;

export type EpisodeDag = {
  nodes: string[];
  edges: { from: string; to: string }[];
};

function isParallelBranch(kind: EpisodeKind): boolean {
  return kind === "stakeholder_contradiction" || kind === "curveball_event";
}

/**
 * Build the episode DAG from kind order with optional parallel branches.
 */
export function buildEpisodeDag(episodes: Episode[]): EpisodeDag {
  const byKind = new Map<EpisodeKind, Episode>();
  for (const ep of episodes) {
    // One episode per kind in the closed catalog; keep first if duplicates.
    if (!byKind.has(ep.kind)) byKind.set(ep.kind, ep);
  }

  const present = KIND_ORDER.filter((k) => byKind.has(k)).map((k) => byKind.get(k)!);
  const nodes = present.map((e) => e.id);
  const edges: { from: string; to: string }[] = [];

  const intake = byKind.get("intake_brief");
  const defect = byKind.get("data_defect_trap");
  const contradiction = byKind.get("stakeholder_contradiction");
  const curveball = byKind.get("curveball_event");
  const verify = byKind.get("verification_gate");
  const handoff = byKind.get("handoff_submission");

  const branchRoot = defect ?? intake;
  if (intake && defect) edges.push({ from: intake.id, to: defect.id });

  const branches = [contradiction, curveball].filter(Boolean) as Episode[];
  if (branches.length > 0 && branchRoot) {
    for (const b of branches) {
      edges.push({ from: branchRoot.id, to: b.id });
      if (verify) edges.push({ from: b.id, to: verify.id });
    }
  } else if (branchRoot && verify) {
    edges.push({ from: branchRoot.id, to: verify.id });
  }

  // If only one of intake/defect exists and no branches, still link to verify.
  if (!branchRoot && intake && verify) {
    edges.push({ from: intake.id, to: verify.id });
  }

  if (verify && handoff) edges.push({ from: verify.id, to: handoff.id });

  // Any leftover present episodes with no edges still appear as nodes (unreachable check).
  return { nodes, edges };
}

export type TopoValidation = {
  ok: boolean;
  order: string[];
  cycles: string[];
  unreachable: string[];
};

/** Kahn topo sort — detects cycles; flags nodes with no path from a source. */
export function validateEpisodeTopo(episodes: Episode[]): TopoValidation {
  const dag = buildEpisodeDag(episodes);
  const nodeSet = new Set(dag.nodes);
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of dag.nodes) {
    indegree.set(id, 0);
    adj.set(id, []);
  }
  for (const e of dag.edges) {
    if (!nodeSet.has(e.from) || !nodeSet.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }

  const queue = dag.nodes.filter((id) => (indegree.get(id) ?? 0) === 0).sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) {
        queue.push(next);
        queue.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  const cycles = dag.nodes.filter((id) => !order.includes(id));

  // Reachability from sources (indegree 0 in the original graph).
  const sources = dag.nodes.filter((id) => {
    return !dag.edges.some((e) => e.to === id);
  });
  const reachable = new Set<string>();
  const stack = [...sources];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const next of adj.get(id) ?? []) stack.push(next);
  }
  const unreachable = dag.nodes.filter((id) => !reachable.has(id));

  return {
    ok: cycles.length === 0 && unreachable.length === 0,
    order,
    cycles,
    unreachable,
  };
}

/**
 * Longest-path duration (minutes) through the episode DAG.
 * Parallel branches contribute max(branch), not sum.
 */
export function criticalPathMinutes(episodes: Episode[]): number {
  if (episodes.length === 0) return 0;
  const byId = new Map(episodes.map((e) => [e.id, e]));
  const dag = buildEpisodeDag(episodes);
  const topo = validateEpisodeTopo(episodes);
  if (topo.cycles.length > 0) {
    // Shouldn't happen for kind-ordered DAG — fall back to sum.
    return episodes.reduce((s, e) => s + e.estimatedMinutes, 0);
  }

  const dist = new Map<string, number>();
  for (const id of dag.nodes) dist.set(id, 0);

  const preds = new Map<string, string[]>();
  for (const id of dag.nodes) preds.set(id, []);
  for (const e of dag.edges) {
    preds.get(e.to)!.push(e.from);
  }

  for (const id of topo.order) {
    const ep = byId.get(id);
    const duration = ep?.estimatedMinutes ?? 0;
    const parents = preds.get(id) ?? [];
    const bestParent = parents.length === 0 ? 0 : Math.max(...parents.map((p) => dist.get(p) ?? 0));
    dist.set(id, bestParent + duration);
  }

  let best = 0;
  for (const v of dist.values()) best = Math.max(best, v);
  return best;
}

export function durationEstimate(input: {
  episodes: Episode[];
  ambiguityEntropy: number;
  rho?: number;
  kappa?: number;
}): DurationEstimate {
  const rho = input.rho ?? DEFAULT_RHO;
  const kappa = input.kappa ?? DEFAULT_KAPPA;
  const topo = validateEpisodeTopo(input.episodes);
  const cpm = criticalPathMinutes(input.episodes);
  const totalEpisodeMinutes = input.episodes.reduce((s, e) => s + e.estimatedMinutes, 0);
  const offPath = Math.max(0, totalEpisodeMinutes - cpm);
  const estimatedMinutes =
    Math.round((cpm + rho * Math.max(0, input.ambiguityEntropy) + kappa * offPath) * 10) / 10;

  const min = cpm;
  const max = Math.round(Math.max(estimatedMinutes, cpm) * 1.1 * 10) / 10;

  return {
    criticalPathMinutes: cpm,
    estimatedMinutes,
    totalEpisodeMinutes,
    ambiguityEntropy: input.ambiguityEntropy,
    rho,
    kappa,
    rangeMinutes: { min, max },
    topoOk: topo.ok,
    cycles: topo.cycles,
    unreachable: topo.unreachable,
    formulaVersion: DURATION_CPM_VERSION,
  };
}

/** Exported for tests / diagnostics — kind rank used when ordering. */
export function episodeKindRank(kind: EpisodeKind): number {
  return KIND_RANK[kind] ?? 999;
}

export function isParallelEpisodeKind(kind: EpisodeKind): boolean {
  return isParallelBranch(kind);
}
