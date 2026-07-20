/**
 * world-generator.ts — materializes a concrete, playable world from the
 * Northbeam TEMPLATE (the same shape as the known-good
 * `scenarios/project-relay` scenario: a thin ask, a system-of-record table,
 * a self-reported partner table, a hand-kept manual-tracking sheet with a
 * silent ID-formatting defect, and two stakeholders who want different,
 * unreconciled deliverables).
 *
 * Swappable surface: companyName, industry, unitNoun, ask string,
 * stakeholderA/B goals, dataQuirk, deadlineTwist. Everything else (table
 * shape, message structure, defect mechanics) is fixed — this is a bounded
 * template parameterization, not open-ended generation.
 *
 * Deterministic: every random choice is drawn from a mulberry32 PRNG seeded
 * from the blueprint seed, so the exact same seed always produces a
 * byte-identical world. Never invents real PII — every name below is drawn
 * from a small, clearly-synthetic fixed pool (the same posture as the
 * "Northbeam Logistics" / "Dana Whitfield" / "Priya Anand" names already
 * shipped in scenarios/project-relay).
 */
import type { CurveballSpec, DataQuirk, InboxMessage, SimulationWorld, WorldStakeholder } from "./types";

export const WORLD_GENERATOR_VERSION = "world-generator-v1";

// ---------------------------------------------------------------------------
// Seeded PRNG — mulberry32. Self-contained here so the generator module has
// no runtime dependency on the (conceptually separate) bounded-variant
// pipeline in src/lib/relay/variants, even though the algorithm is the same.
// ---------------------------------------------------------------------------

function seedToUint32(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createSeededRandom(seed: string): () => number {
  let a = seedToUint32(seed);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, options: readonly T[]): T {
  const idx = Math.floor(rand() * options.length) % options.length;
  return options[idx];
}

function pickTwoDistinct<T>(rand: () => number, options: readonly T[]): [T, T] {
  const first = pick(rand, options);
  let second = pick(rand, options);
  let guard = 0;
  while (second === first && guard < 20) {
    second = pick(rand, options);
    guard += 1;
  }
  return [first, second];
}

function intInRange(rand: () => number, min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1));
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

// ---------------------------------------------------------------------------
// Industry → unit vocabulary. Closed lookup with a generic fallback, so an
// unrecognized industry string still produces a coherent, generic world
// rather than failing generation.
// ---------------------------------------------------------------------------

type UnitProfile = { unitNoun: string; idPrefix: string; partnerNoun: string; issueNoun: string; companySuffixes: string[] };

const INDUSTRY_UNIT_PROFILES: Record<string, UnitProfile> = {
  logistics: {
    unitNoun: "shipments",
    idPrefix: "SHP",
    partnerNoun: "carriers",
    issueNoun: "delays",
    companySuffixes: ["Logistics", "Freight", "Shipping Co.", "Supply Chain Group"],
  },
  ecommerce: {
    unitNoun: "orders",
    idPrefix: "ORD",
    partnerNoun: "fulfillment partners",
    issueNoun: "fulfillment delays",
    companySuffixes: ["Commerce", "Retail Group", "Direct", "Marketplace"],
  },
  healthcare: {
    unitNoun: "patient cases",
    idPrefix: "CSE",
    partnerNoun: "referral partners",
    issueNoun: "backlogs",
    companySuffixes: ["Health Partners", "Care Network", "Clinical Group", "Health Systems"],
  },
  fintech: {
    unitNoun: "transactions",
    idPrefix: "TXN",
    partnerNoun: "payment processors",
    issueNoun: "settlement delays",
    companySuffixes: ["Financial", "Payments", "Capital Group", "Fintech Partners"],
  },
  saas: {
    unitNoun: "support tickets",
    idPrefix: "TCK",
    partnerNoun: "vendor integrations",
    issueNoun: "response delays",
    companySuffixes: ["Software", "Platform Inc.", "Cloud Group", "Technologies"],
  },
  manufacturing: {
    unitNoun: "work orders",
    idPrefix: "WO",
    partnerNoun: "suppliers",
    issueNoun: "production delays",
    companySuffixes: ["Manufacturing", "Industrial Group", "Fabrication Co.", "Works"],
  },
};

const DEFAULT_UNIT_PROFILE: UnitProfile = {
  unitNoun: "orders",
  idPrefix: "ORD",
  partnerNoun: "vendors",
  issueNoun: "delays",
  companySuffixes: ["Group", "Partners", "Co.", "Holdings"],
};

function unitProfileFor(industry: string): UnitProfile {
  const key = industry.trim().toLowerCase();
  for (const k of Object.keys(INDUSTRY_UNIT_PROFILES)) {
    if (key.includes(k)) return INDUSTRY_UNIT_PROFILES[k];
  }
  return DEFAULT_UNIT_PROFILE;
}

// ---------------------------------------------------------------------------
// Fixed, clearly-synthetic name pools (never real people).
// ---------------------------------------------------------------------------

const COMPANY_PREFIXES = [
  "Northbeam", "Cascade", "Harborline", "Ridgeway", "Meridian", "Anchor Point",
  "Silverline", "Fieldstone", "Brightwater", "Ironclad", "Wayfinder", "Crestpoint",
] as const;

const FIRST_NAMES = [
  "Dana", "Priya", "Marcus", "Elena", "Jordan", "Aisha", "Ravi", "Kaitlyn",
  "Theo", "Naomi", "Owen", "Sana",
] as const;

const LAST_NAMES = [
  "Whitfield", "Anand", "Delgado", "Voss", "Ibarra", "Okafor", "Lindqvist",
  "Bergstrom", "Marchetti", "Osei", "Callahan", "Fenwick",
] as const;

const ASK_ISSUE_PHRASINGS = [
  "we need better visibility into",
  "we need a clearer read on",
  "we can't tell which lanes are actually behind on",
  "leadership keeps asking about",
] as const;

const DEADLINE_TWISTS = [
  (subject: string) => `the board meeting got pulled forward, so ${subject} is now needed a day earlier than planned`,
  (subject: string) => `the executive review moved up a week, and ${subject} has to be ready by then`,
  (subject: string) => `finance needs the ${subject} number before the renewal call, which just got moved to Friday`,
  (subject: string) => `the customer escalation call got scheduled sooner than expected, so ${subject} can't slip`,
] as const;

const DATA_QUIRKS: readonly DataQuirk[] = ["leading_zero", "excel_strip", "id_prefix"] as const;

// ---------------------------------------------------------------------------
// Table materialization
// ---------------------------------------------------------------------------

type PrimaryRow = { id: string; lane: string; promisedDate: string; deliveredDate: string; partnerId: string; late: boolean };

const LANE_ORIGINS = ["CHI", "LAX", "ATL", "SEA", "NYC", "DFW", "PHX", "MIA", "DEN", "BOS"] as const;

function addDays(base: Date, days: number): string {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildPrimaryRows(
  rand: () => number,
  idPrefix: string,
  partnerIds: string[],
  count: number
): PrimaryRow[] {
  const base = new Date("2026-01-05T00:00:00Z");
  const rows: PrimaryRow[] = [];
  for (let i = 1; i <= count; i++) {
    const [origin, dest] = pickTwoDistinct(rand, LANE_ORIGINS);
    const promisedOffset = i - 1;
    const promised = addDays(base, promisedOffset);
    const late = rand() < 0.42;
    const delayDays = late ? intInRange(rand, 1, 5) : 0;
    const delivered = addDays(base, promisedOffset + delayDays);
    rows.push({
      id: `${idPrefix}-${pad(i, 5)}`,
      lane: `${origin}-${dest}`,
      promisedDate: promised,
      deliveredDate: delivered,
      partnerId: pick(rand, partnerIds),
      late,
    });
  }
  return rows;
}

function primaryRowsToCsv(rows: PrimaryRow[]): string {
  const header = "record_id,lane,promised_date,delivered_date,partner_id";
  const lines = rows.map((r) => `${r.id},${r.lane},${r.promisedDate},${r.deliveredDate},${r.partnerId}`);
  return [header, ...lines].join("\n") + "\n";
}

type PartnerRow = { id: string; name: string; onTimeRateClaimed: number; actualOnTimeRate: number };

function buildPartnerRows(rand: () => number, unit: UnitProfile, rows: PrimaryRow[], partnerIds: string[]): PartnerRow[] {
  const partners: PartnerRow[] = [];
  for (const id of partnerIds) {
    const namePrefix = pick(rand, COMPANY_PREFIXES);
    const nameSuffix = pick(rand, unit.companySuffixes);
    const partnerRows = rows.filter((r) => r.partnerId === id);
    const actual = partnerRows.length > 0 ? partnerRows.filter((r) => !r.late).length / partnerRows.length : 0.85;
    // Self-reported rate is deliberately inflated relative to the actual
    // computed rate — the second, separate data-quality issue every world
    // carries (mirrors carriers.csv's on_time_rate_claimed in Northbeam).
    const claimed = Math.min(0.98, Math.round((actual + 0.08 + rand() * 0.1) * 100) / 100);
    partners.push({ id, name: `${namePrefix} ${nameSuffix}`, onTimeRateClaimed: claimed, actualOnTimeRate: Math.round(actual * 1000) / 1000 });
  }
  return partners;
}

function partnerRowsToCsv(rows: PartnerRow[]): string {
  const header = "partner_id,name,on_time_rate_claimed";
  const lines = rows.map((r) => `${r.id},${r.name},${r.onTimeRateClaimed.toFixed(2)}`);
  return [header, ...lines].join("\n") + "\n";
}

const DELAY_REASONS = [
  "capacity_shortage", "weather_delay", "external_hold", "process_backlog",
  "equipment_issue", "record_correction_needed", "upstream_congestion", "system_outage",
] as const;

type ManualTrackingRow = { rawId: string; canonicalId: string; malformed: boolean; delayReason: string; flaggedDate: string; notes: string };

function malformId(canonicalId: string, quirk: DataQuirk): string {
  const match = canonicalId.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return canonicalId;
  const [, prefix, digits] = match;
  const numeric = String(Number(digits));
  switch (quirk) {
    case "leading_zero":
      return `${prefix}-${numeric}`; // missing leading zeros
    case "excel_strip":
      return numeric.padStart(digits.length, "0"); // prefix dropped entirely, as if Excel stripped the text
    case "id_prefix":
      return `${prefix}-${numeric.padStart(Math.max(3, digits.length - 2), "0")}`; // wrong (narrower) pad width
    default:
      return canonicalId;
  }
}

function buildManualTrackingRows(
  rand: () => number,
  rows: PrimaryRow[],
  quirk: DataQuirk
): ManualTrackingRow[] {
  const lateRows = rows.filter((r) => r.late);
  const trackedCount = Math.max(3, Math.round(lateRows.length * 0.85));
  const tracked = lateRows.slice(0, trackedCount);
  // Exactly 3 malformed rows, mirroring the known-good scenario's ~12%
  // mismatch ratio, chosen deterministically rather than "all of them".
  const malformedCount = Math.min(3, tracked.length);
  const malformedIndices = new Set<number>();
  while (malformedIndices.size < malformedCount) {
    malformedIndices.add(intInRange(rand, 0, tracked.length - 1));
  }

  const base = new Date("2026-01-10T00:00:00Z");
  return tracked.map((row, i) => {
    const isMalformed = malformedIndices.has(i);
    return {
      rawId: isMalformed ? malformId(row.id, quirk) : row.id,
      canonicalId: row.id,
      malformed: isMalformed,
      delayReason: pick(rand, DELAY_REASONS),
      flaggedDate: addDays(base, i),
      notes: isMalformed ? "logged by hand, not pulled from the system-of-record export" : "confirmed via ops call",
    };
  });
}

function manualTrackingRowsToCsv(rows: ManualTrackingRow[]): string {
  const header = "record_id,delay_reason,flagged_date,notes";
  const lines = rows.map((r) => `${r.rawId},${r.delayReason},${r.flaggedDate},${r.notes}`);
  return [header, ...lines].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Inbox thread
// ---------------------------------------------------------------------------

function lastWord(phrase: string): string {
  const parts = phrase.trim().split(/\s+/);
  return parts[parts.length - 1] || phrase;
}

function buildInboxThread(
  rand: () => number,
  companyName: string,
  ask: string,
  unit: UnitProfile,
  stakeholderA: WorldStakeholder,
  stakeholderB: WorldStakeholder,
  deadlineTwist: string
): SimulationWorld["inboxThread"] {
  const channelSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const messages: InboxMessage[] = [
    {
      id: "msg-001",
      authorId: stakeholderA.id,
      timestampOffsetMinutes: 0,
      text: `Hey — thanks for hopping on this. ${ask} Right now nobody can tell me which ${lastWord(unit.unitNoun)} are actually behind until a customer complains.`,
    },
    {
      id: "msg-002",
      authorId: stakeholderA.id,
      timestampOffsetMinutes: intInRange(rand, 1, 3),
      text: `We've got the system-of-record export and a partner file with each ${unit.partnerNoun.replace(/s$/, "")}'s stated on-time rate. Whatever's useful, build it.`,
    },
    {
      id: "msg-003",
      authorId: stakeholderA.id,
      timestampOffsetMinutes: intInRange(rand, 4, 7),
      text: `Also attaching the manual tracking sheet — that's what my team keeps by hand when we catch a problem before the system does. Fair warning, it's not the tidiest spreadsheet.`,
    },
    {
      id: "msg-004",
      authorId: "you",
      timestampOffsetMinutes: intInRange(rand, 8, 12),
      text: `Got it. Starting with a look at the data — will follow up with what I find.`,
    },
    {
      id: "msg-005",
      authorId: stakeholderB.id,
      timestampOffsetMinutes: intInRange(rand, 60 * 20, 60 * 22),
      text: `${stakeholderA.name.split(" ")[0]} looped me in. Before we talk dashboards — I want to understand *why* this is happening. A pretty chart doesn't tell the board anything if we can't explain root cause.`,
    },
    {
      id: "msg-006",
      authorId: stakeholderA.id,
      timestampOffsetMinutes: intInRange(rand, 60 * 22 + 5, 60 * 22 + 15),
      text: `${stakeholderB.name.split(" ")[0]}, I hear you, but my team just needs something we can check every morning. Root cause is a bigger lift than what we scoped.`,
    },
    {
      id: "msg-007",
      authorId: stakeholderB.id,
      timestampOffsetMinutes: intInRange(rand, 60 * 22 + 16, 60 * 22 + 30),
      text: `We can figure out scope. I'd rather have one right answer than a dashboard nobody trusts.`,
    },
    {
      id: "msg-008",
      authorId: stakeholderB.id,
      timestampOffsetMinutes: intInRange(rand, 60 * 60, 60 * 64),
      text: `Heads up — ${deadlineTwist}.`,
    },
    {
      id: "msg-009",
      authorId: stakeholderA.id,
      timestampOffsetMinutes: intInRange(rand, 60 * 64 + 1, 60 * 64 + 10),
      text: `(to you) Sorry — we haven't sorted out whether this is a dashboard or a root-cause writeup. Use your judgment on what's most useful and we'll adjust.`,
    },
  ];

  return {
    channel: `#${channelSlug}-ops`,
    participants: [
      { id: stakeholderA.id, name: stakeholderA.name, role: stakeholderA.role },
      { id: stakeholderB.id, name: stakeholderB.name, role: stakeholderB.role },
      { id: "you", name: "You", role: "Forward-Deployed Engineer" },
    ],
    messages,
  };
}

// ---------------------------------------------------------------------------
// Curveball pool
// ---------------------------------------------------------------------------

function buildCurveballPool(seed: string, deadlineTwist: string, unit: UnitProfile): CurveballSpec[] {
  return [
    {
      id: `${seed}-curveball-deadline`,
      key: "deadline_moved",
      label: "Deadline moved up",
      triggerAfterMinutes: 20,
      narrative: `Heads up — ${deadlineTwist}.`,
      targetTraits: ["scope_renegotiation", "prioritization_under_pressure"],
    },
    {
      id: `${seed}-curveball-conflict`,
      key: "stakeholder_conflict_named",
      label: "Stakeholders disagree on the deliverable",
      triggerAfterMinutes: 10,
      narrative: "Two stakeholders want different, unreconciled deliverables — the brief will not resolve this for you.",
      targetTraits: ["contradiction_handling", "communication_translation"],
    },
    {
      id: `${seed}-curveball-partner-data`,
      key: "partner_data_unreliable",
      label: `Self-reported ${unit.partnerNoun} data doesn't reconcile`,
      triggerAfterMinutes: 25,
      narrative: `At least one ${unit.partnerNoun.replace(/s$/, "")}'s self-reported on-time rate is off by a wide margin from the computed rate — treat any partner-reported reliability metric as a claim to verify, not a fact to cite.`,
      targetTraits: ["data_integrity_vigilance", "limitation_honesty"],
    },
  ];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateWorld(seed: string, industry: string, roleObjective: string): SimulationWorld {
  const rand = createSeededRandom(`world:${seed}`);
  const unit = unitProfileFor(industry);

  const companyPrefix = pick(rand, COMPANY_PREFIXES);
  const companySuffix = pick(rand, unit.companySuffixes);
  const companyName = `${companyPrefix} ${companySuffix}`;

  const [firstNameA, firstNameB] = pickTwoDistinct(rand, FIRST_NAMES);
  const [lastNameA, lastNameB] = pickTwoDistinct(rand, LAST_NAMES);
  const stakeholderA: WorldStakeholder = {
    id: `${firstNameA.toLowerCase()}.${lastNameA.toLowerCase()}`,
    name: `${firstNameA} ${lastNameA}`,
    role: "Ops Manager",
    goal: `an operational view of ${unit.unitNoun} they can check every morning`,
  };
  const stakeholderB: WorldStakeholder = {
    id: `${firstNameB.toLowerCase()}.${lastNameB.toLowerCase()}`,
    name: `${firstNameB} ${lastNameB}`,
    role: "VP of Operations",
    goal: `a defensible root-cause report for the board`,
  };

  const askPhrase = pick(rand, ASK_ISSUE_PHRASINGS);
  const ask = `${askPhrase[0].toUpperCase()}${askPhrase.slice(1)} ${unit.unitNoun} ${unit.issueNoun}.`;
  const deadlineTwist = pick(rand, DEADLINE_TWISTS)(`the ${unit.issueNoun} report`);
  const dataQuirk = pick(rand, DATA_QUIRKS);

  const partnerCount = intInRange(rand, 4, 6);
  const partnerIds = Array.from({ length: partnerCount }, (_, i) => `PTR-${pad(i + 1, 2)}`);
  const rowCount = intInRange(rand, 45, 70);
  const primaryRows = buildPrimaryRows(rand, unit.idPrefix, partnerIds, rowCount);
  const partnerRows = buildPartnerRows(rand, unit, primaryRows, partnerIds);
  const manualTrackingRows = buildManualTrackingRows(rand, primaryRows, dataQuirk);

  const malformedRows = manualTrackingRows.filter((r) => r.malformed);
  const trueLate = manualTrackingRows.length;
  const naiveLate = manualTrackingRows.filter((r) => !r.malformed).length;
  const dropPct = trueLate > 0 ? Math.round(((trueLate - naiveLate) / trueLate) * 1000) / 10 : 0;

  const inboxThread = buildInboxThread(rand, companyName, ask, unit, stakeholderA, stakeholderB, deadlineTwist);
  const curveballPool = buildCurveballPool(seed, deadlineTwist, unit);

  const canonicalFacts: string[] = [
    `${stakeholderA.name} (${stakeholderA.role}, ${companyName}) wants ${stakeholderA.goal}, not a one-off analysis.`,
    `${stakeholderB.name} (${stakeholderB.role}, ${companyName}) wants ${stakeholderB.goal} — this should only surface if the candidate asks about stakeholders, priorities, or what to build.`,
    `${stakeholderA.name.split(" ")[0]} and ${stakeholderB.name.split(" ")[0]} want different deliverables and have not reconciled that between themselves — managing that conflict is the candidate's job.`,
    `The manual tracking sheet uses an inconsistent ID format (${dataQuirk.replace(/_/g, " ")}) that a naive exact-match join will silently drop — ${malformedRows.length} of ${manualTrackingRows.length} manually tracked rows (${dropPct}%) are affected.`,
    `${deadlineTwist}.`,
    `At least one partner's self-reported on-time rate does not reconcile with the actual computed rate from the system-of-record export.`,
    roleObjective ? `Role objective on record: ${roleObjective}` : `No additional role objective was provided beyond the ask above.`,
  ];

  return {
    companyName,
    industry: industry.trim() || "general",
    unitNoun: unit.unitNoun,
    idPrefix: unit.idPrefix,
    partnerNoun: unit.partnerNoun,
    ask,
    stakeholderA,
    stakeholderB,
    dataQuirk,
    deadlineTwist,
    tables: {
      primaryRecords: primaryRowsToCsv(primaryRows),
      partners: partnerRowsToCsv(partnerRows),
      manualTracking: manualTrackingRowsToCsv(manualTrackingRows),
    },
    inboxThread,
    canonicalFacts,
    curveballPool,
  };
}
