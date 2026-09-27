/**
 * Applied AI proof-coverage domain contracts. No database required.
 * Run: npx tsx scripts/test-applied-ai-proof-coverage.ts
 */
import {
  APPLIED_AI_DISPLAY_ROLE,
  APPLIED_AI_EXCLUSIONS,
  APPLIED_AI_FLAGSHIP_INSTRUMENT_VERSION,
  APPLIED_AI_PROOF_REQUIREMENTS,
  APPLIED_AI_PROOF_SPEC_VERSION,
  APPLIED_AI_ROLE_ALIASES,
  APPLIED_AI_ROLE_FAMILY,
  CANDIDATE_01_ID,
  CANDIDATE_01_LABEL,
  CANDIDATE_01_PREWORK_AS_OF,
  COVERAGE_STATES,
  EXISTING_PROOF_SOURCE_KINDS,
  FLAGSHIP_PRIMARY_TARGET_IDS,
  FLAGSHIP_SECONDARY_OBSERVATION_IDS,
  PROOF_REQUIREMENT_IDS,
  ProofCoverageError,
  createCandidate01PreWorkProfile,
  createCandidateRoleProofProfile,
  createExistingProofSource,
  createFlagshipTargetedEpisode,
  createTargetedVerificationEpisode,
  deriveProofCoverage,
  deriveProofGaps,
  isAppliedAiRoleAlias,
  requirementById,
  validateEpisodeTargets,
  type ExistingProofSource,
  type ProofRequirementId,
} from "../src/lib/sim-engine/proof/coverage";
import {
  PROOF_ROLE_SLUG,
  PROOF_VERSION_KEY,
} from "../src/lib/sim-engine/proof/types";

let failures = 0;

function ok(name: string, condition: boolean, detail = ""): void {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

function source(overrides: Partial<ExistingProofSource> & Pick<ExistingProofSource, "id" | "requirementId">): ExistingProofSource {
  return createExistingProofSource({
    kind: "VERIFIED_ARTIFACT",
    capturedAt: "2026-08-01T00:00:00.000Z",
    freshUntil: "2027-08-01T00:00:00.000Z",
    verificationStatus: "VERIFIED",
    reviewState: "APPROVED",
    roleRelevance: "IN_ROLE",
    completeness: "COMPLETE",
    executableCodeObserved: overrides.requirementId === "PR-AI-06",
    narrative: "",
    ...overrides,
  });
}

function profileWith(...sources: ExistingProofSource[]) {
  return createCandidateRoleProofProfile({
    candidateId: "candidate-test",
    label: "Candidate Test",
    roleIntent: { kind: "IN_SCOPE" },
    sources,
  });
}

const AS_OF = "2026-08-21T12:00:00.000Z";

section("Catalog");
ok("spec version is aai-proof-v1", APPLIED_AI_PROOF_SPEC_VERSION === "aai-proof-v1");
ok("eight requirement IDs", PROOF_REQUIREMENT_IDS.join(",") === "PR-AI-01,PR-AI-02,PR-AI-03,PR-AI-04,PR-AI-05,PR-AI-06,PR-AI-07,PR-AI-08");
ok("eight catalog entries", APPLIED_AI_PROOF_REQUIREMENTS.length === 8);
ok(
  "catalog IDs match enum order",
  APPLIED_AI_PROOF_REQUIREMENTS.every((requirement, index) => requirement.id === PROOF_REQUIREMENT_IDS[index]),
);
ok("PR-AI-04 title", requirementById("PR-AI-04").title === "Evaluation engineering");
ok("PR-AI-08 title", requirementById("PR-AI-08").title === "Product and model judgment");
ok("every requirement is versioned", APPLIED_AI_PROOF_REQUIREMENTS.every((requirement) => requirement.specVersion === "aai-proof-v1" && requirement.requirementVersion === 1));
ok("aliases include Agent Engineer", isAppliedAiRoleAlias("Agent Engineer"));
ok("seven aliases", APPLIED_AI_ROLE_ALIASES.length === 7);
ok("Software Engineer, AI alias", APPLIED_AI_ROLE_ALIASES.includes("Software Engineer, AI"));
ok("exclusions include pretraining", APPLIED_AI_EXCLUSIONS.includes("PRETRAINING"));
ok("five coverage states", COVERAGE_STATES.length === 5);
ok(
  "five approved source kinds",
  EXISTING_PROOF_SOURCE_KINDS.join(",") ===
    "PRIOR_WORK_RECEIPT,CURRENT_FYDELL_WORK,VERIFIED_ARTIFACT,HUMAN_ATTESTATION,OTHER_APPROVED",
);
ok("display role", APPLIED_AI_DISPLAY_ROLE === "Applied AI Engineer");
ok("role family", APPLIED_AI_ROLE_FAMILY === "Applied AI Engineering");

section("Solutions Engineer constants remain untouched");
ok("PROOF_ROLE_SLUG still solutions-engineer", PROOF_ROLE_SLUG === "solutions-engineer");
ok("PROOF_VERSION_KEY still se-northstar-v1", PROOF_VERSION_KEY === "se-northstar-v1");

section("Candidate 01 pre-work profile");
const candidate01 = createCandidate01PreWorkProfile();
const candidate01Coverage = deriveProofCoverage(candidate01, CANDIDATE_01_PREWORK_AS_OF);
const candidate01Gaps = deriveProofGaps(candidate01Coverage);
ok("identity", candidate01.candidateId === CANDIDATE_01_ID && candidate01.label === CANDIDATE_01_LABEL);
ok("in-scope Applied AI", candidate01.roleIntent.kind === "IN_SCOPE");
ok("PR-AI-01 proven", candidate01Coverage.byRequirement["PR-AI-01"].state === "PROVEN");
ok("PR-AI-02 proven", candidate01Coverage.byRequirement["PR-AI-02"].state === "PROVEN");
ok("PR-AI-03 proven", candidate01Coverage.byRequirement["PR-AI-03"].state === "PROVEN");
ok("PR-AI-06 partial", candidate01Coverage.byRequirement["PR-AI-06"].state === "PARTIALLY_PROVEN");
ok("PR-AI-04 partial", candidate01Coverage.byRequirement["PR-AI-04"].state === "PARTIALLY_PROVEN");
ok("PR-AI-05 partial", candidate01Coverage.byRequirement["PR-AI-05"].state === "PARTIALLY_PROVEN");
ok("PR-AI-07 not proven", candidate01Coverage.byRequirement["PR-AI-07"].state === "NOT_PROVEN");
ok("PR-AI-08 not proven", candidate01Coverage.byRequirement["PR-AI-08"].state === "NOT_PROVEN");
ok(
  "targeted uncertainty is 04/05/07/08",
  candidate01Gaps
    .filter((gap) => FLAGSHIP_PRIMARY_TARGET_IDS.includes(gap.requirementId as (typeof FLAGSHIP_PRIMARY_TARGET_IDS)[number]))
    .map((gap) => gap.requirementId)
    .sort()
    .join(",") === [...FLAGSHIP_PRIMARY_TARGET_IDS].sort().join(","),
);
ok(
  "six of eight requirements have support",
  PROOF_REQUIREMENT_IDS.filter((id) =>
    ["PROVEN", "PARTIALLY_PROVEN"].includes(candidate01Coverage.byRequirement[id].state),
  ).length === 6,
);

const flagship = createFlagshipTargetedEpisode();
const episodeCheck = validateEpisodeTargets(flagship, candidate01Coverage);
ok("flagship instrument version", flagship.instrumentVersion === APPLIED_AI_FLAGSHIP_INSTRUMENT_VERSION);
ok("flagship targets recorded", flagship.targetRequirementIds.join(",") === "PR-AI-04,PR-AI-05,PR-AI-07,PR-AI-08");
ok("flagship secondary observations", flagship.secondaryObservationIds.join(",") === FLAGSHIP_SECONDARY_OBSERVATION_IDS.join(","));
ok("flagship targets valid against Candidate 01 gaps", episodeCheck.ok);

section("Keyword matching cannot prove coverage");
const keywordOnly = deriveProofCoverage(
  profileWith(
    source({
      id: "keyword-eval",
      requirementId: "PR-AI-04",
      completeness: "NONE",
      narrative:
        "Evaluation engineering proven. Reliability and failure recovery demonstrated. Strong eval set, p95 latency, product and model judgment.",
    }),
  ),
  AS_OF,
);
ok(
  "keyword-rich narrative with completeness NONE stays NOT_PROVEN",
  keywordOnly.byRequirement["PR-AI-04"].state === "NOT_PROVEN",
);

section("Partial coverage");
const partial = deriveProofCoverage(
  profileWith(
    source({
      id: "partial-reliability",
      requirementId: "PR-AI-05",
      completeness: "PARTIAL",
      kind: "HUMAN_ATTESTATION",
    }),
  ),
  AS_OF,
);
ok("verified partial attestation is PARTIALLY_PROVEN", partial.byRequirement["PR-AI-05"].state === "PARTIALLY_PROVEN");
ok("unrelated requirements stay NOT_PROVEN", partial.byRequirement["PR-AI-04"].state === "NOT_PROVEN");

const unverifiedComplete = deriveProofCoverage(
  profileWith(
    source({
      id: "unverified-complete",
      requirementId: "PR-AI-07",
      completeness: "COMPLETE",
      verificationStatus: "UNVERIFIED",
      reviewState: "UNREVIEWED",
    }),
  ),
  AS_OF,
);
ok(
  "unverified complete source is PARTIALLY_PROVEN not PROVEN",
  unverifiedComplete.byRequirement["PR-AI-07"].state === "PARTIALLY_PROVEN",
);

section("Stale evidence");
const stale = deriveProofCoverage(
  profileWith(
    source({
      id: "stale-eval",
      requirementId: "PR-AI-04",
      capturedAt: "2024-01-01T00:00:00.000Z",
      freshUntil: "2025-01-01T00:00:00.000Z",
      completeness: "COMPLETE",
    }),
  ),
  AS_OF,
);
ok("expired complete evidence is STALE", stale.byRequirement["PR-AI-04"].state === "STALE");
ok("stale source id retained", stale.byRequirement["PR-AI-04"].staleSourceIds[0] === "stale-eval");

const staleThenFresh = deriveProofCoverage(
  profileWith(
    source({
      id: "old-eval",
      requirementId: "PR-AI-04",
      capturedAt: "2024-01-01T00:00:00.000Z",
      freshUntil: "2025-01-01T00:00:00.000Z",
      completeness: "COMPLETE",
    }),
    source({
      id: "new-partial-eval",
      requirementId: "PR-AI-04",
      completeness: "PARTIAL",
    }),
  ),
  AS_OF,
);
ok("fresh partial outranks stale complete", staleThenFresh.byRequirement["PR-AI-04"].state === "PARTIALLY_PROVEN");

section("Not-applicable exclusion");
const excluded = createCandidateRoleProofProfile({
  candidateId: "candidate-research",
  label: "Out of instrument",
  roleIntent: { kind: "EXCLUDED", exclusion: "FOUNDATION_MODEL_RESEARCH" },
  sources: [
    source({
      id: "research-eval",
      requirementId: "PR-AI-04",
      completeness: "COMPLETE",
    }),
  ],
});
const excludedCoverage = deriveProofCoverage(excluded, AS_OF);
ok(
  "excluded intent makes every requirement NOT_APPLICABLE",
  PROOF_REQUIREMENT_IDS.every((id) => excludedCoverage.byRequirement[id].state === "NOT_APPLICABLE"),
);
ok("excluded profile has no gaps", deriveProofGaps(excludedCoverage).length === 0);

section("PR-AI-06 executable-code gate");
const seWithoutExec = deriveProofCoverage(
  profileWith(
    source({
      id: "se-no-exec",
      requirementId: "PR-AI-06",
      completeness: "COMPLETE",
      executableCodeObserved: false,
    }),
  ),
  AS_OF,
);
ok("PR-AI-06 cannot be PROVEN without executable observation", seWithoutExec.byRequirement["PR-AI-06"].state === "PARTIALLY_PROVEN");
ok(
  "gap reason is executable code",
  deriveProofGaps(seWithoutExec).find((gap) => gap.requirementId === "PR-AI-06")?.reason ===
    "EXECUTABLE_CODE_NOT_OBSERVED",
);

const seWithExec = deriveProofCoverage(
  profileWith(
    source({
      id: "se-exec",
      requirementId: "PR-AI-06",
      completeness: "COMPLETE",
      executableCodeObserved: true,
      kind: "CURRENT_FYDELL_WORK",
    }),
  ),
  AS_OF,
);
ok("PR-AI-06 PROVEN when executable code observed", seWithExec.byRequirement["PR-AI-06"].state === "PROVEN");

section("Proven from typed fields");
const proven = deriveProofCoverage(
  profileWith(
    source({
      id: "cost-receipt",
      requirementId: "PR-AI-07",
      kind: "PRIOR_WORK_RECEIPT",
    }),
  ),
  AS_OF,
);
ok("complete verified in-role receipt is PROVEN", proven.byRequirement["PR-AI-07"].state === "PROVEN");

section("Gap ordering");
const mixedGaps = deriveProofGaps(
  deriveProofCoverage(
    profileWith(
      source({
        id: "partial-01",
        requirementId: "PR-AI-01",
        completeness: "PARTIAL",
      }),
      source({
        id: "stale-03",
        requirementId: "PR-AI-03",
        capturedAt: "2024-01-01T00:00:00.000Z",
        freshUntil: "2025-01-01T00:00:00.000Z",
        completeness: "COMPLETE",
      }),
      source({
        id: "partial-08",
        requirementId: "PR-AI-08",
        completeness: "PARTIAL",
      }),
    ),
    AS_OF,
  ),
);
ok(
  "NOT_PROVEN before STALE before PARTIALLY_PROVEN, then requirement order",
  mixedGaps.map((gap) => `${gap.priority}:${gap.requirementId}:${gap.coverageState}`).join("|") ===
    [
      "1:PR-AI-02:NOT_PROVEN",
      "2:PR-AI-04:NOT_PROVEN",
      "3:PR-AI-05:NOT_PROVEN",
      "4:PR-AI-06:NOT_PROVEN",
      "5:PR-AI-07:NOT_PROVEN",
      "6:PR-AI-03:STALE",
      "7:PR-AI-01:PARTIALLY_PROVEN",
      "8:PR-AI-08:PARTIALLY_PROVEN",
    ].join("|"),
);

section("Episode target validation");
const provenCost = deriveProofCoverage(
  profileWith(source({ id: "cost-done", requirementId: "PR-AI-07" })),
  AS_OF,
);
const targetingProven = validateEpisodeTargets(
  createTargetedVerificationEpisode({
    id: "bad-proven-target",
    instrumentVersion: APPLIED_AI_FLAGSHIP_INSTRUMENT_VERSION,
    targetRequirementIds: ["PR-AI-07"],
  }),
  provenCost,
);
ok("cannot target PROVEN requirement", targetingProven.ok === false);

const targetingExcluded = validateEpisodeTargets(
  createTargetedVerificationEpisode({
    id: "bad-na-target",
    instrumentVersion: APPLIED_AI_FLAGSHIP_INSTRUMENT_VERSION,
    targetRequirementIds: ["PR-AI-04"],
  }),
  excludedCoverage,
);
ok("cannot target NOT_APPLICABLE requirement", targetingExcluded.ok === false);

try {
  createTargetedVerificationEpisode({
    id: "overlap",
    instrumentVersion: "v1",
    targetRequirementIds: ["PR-AI-04"],
    secondaryObservationIds: ["PR-AI-04"],
  });
  ok("rejects overlapping secondary IDs", false);
} catch (error) {
  ok(
    "rejects overlapping secondary IDs",
    error instanceof ProofCoverageError && error.message.includes("disjoint"),
  );
}

try {
  createTargetedVerificationEpisode({
    id: "empty",
    instrumentVersion: "v1",
    targetRequirementIds: [] as unknown as ProofRequirementId[],
  });
  ok("rejects empty targets", false);
} catch (error) {
  ok("rejects empty targets", error instanceof ProofCoverageError);
}

section("Constructors");
try {
  createExistingProofSource({
    id: "other",
    kind: "OTHER_APPROVED",
    requirementId: "PR-AI-01",
    capturedAt: "2026-08-01T00:00:00.000Z",
    freshUntil: null,
    verificationStatus: "VERIFIED",
    reviewState: "APPROVED",
    roleRelevance: "IN_ROLE",
    completeness: "PARTIAL",
    explicitlyApproved: false,
  });
  ok("OTHER_APPROVED requires explicit approval", false);
} catch (error) {
  ok("OTHER_APPROVED requires explicit approval", error instanceof ProofCoverageError);
}

const otherApproved = createExistingProofSource({
  id: "other-ok",
  kind: "OTHER_APPROVED",
  requirementId: "PR-AI-02",
  capturedAt: "2026-08-01T00:00:00.000Z",
  freshUntil: null,
  verificationStatus: "VERIFIED",
  reviewState: "REVIEWED",
  roleRelevance: "IN_ROLE",
  completeness: "COMPLETE",
  explicitlyApproved: true,
});
ok(
  "explicitly approved other source can prove",
  deriveProofCoverage(profileWith(otherApproved), AS_OF).byRequirement["PR-AI-02"].state === "PROVEN",
);

const adjacent = deriveProofCoverage(
  profileWith(
    source({
      id: "adjacent",
      requirementId: "PR-AI-08",
      roleRelevance: "ADJACENT",
    }),
  ),
  AS_OF,
);
ok("adjacent role relevance cannot prove", adjacent.byRequirement["PR-AI-08"].state === "NOT_PROVEN");

if (failures > 0) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAPPLIED_AI_PROOF_COVERAGE_OK");
