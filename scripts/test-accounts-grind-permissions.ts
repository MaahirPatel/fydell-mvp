/**
 * Accounts grind — the required access matrix as a tested permission function.
 *
 * Every row of the matrix (passport evidence, submission, report, internal
 * notes, hidden tests, billing, public demo) against every caller kind
 * (developer, employer, unrelated, operator), plus E2E-09 (access isolation),
 * E2E-13 (sharing revocation) and E2E-26 (cross-employer reuse) expressed as
 * in-process permission tests. No Supabase, no network.
 */

import {
  checkAccess,
  type Actor,
  type Resource,
} from "../src/lib/permissions/access";
import {
  createEvidence,
  createGrantMemoryStore,
  createPassport,
  createRoleInvitation,
  createShareGrant,
  readThroughGrant,
  respondToRoleInvitation,
  revokeGrant,
} from "../src/lib/grants/share-grants";

let failures = 0;
let passes = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    passes += 1;
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}
function decision(a: Actor, r: Resource) {
  return checkAccess(a, r);
}
function allowed(a: Actor, r: Resource) {
  return decision(a, r).allowed;
}

/* Actors ----------------------------------------------------------------------- */

const devA: Actor = { kind: "developer", userId: "cand-a" };
const devB: Actor = { kind: "developer", userId: "cand-b" };
const empAReviewer: Actor = { kind: "employer", userId: "emp-a", orgId: "org-a", orgRole: "reviewer", membershipStatus: "active" };
const empAOwner: Actor = { kind: "employer", userId: "emp-a-owner", orgId: "org-a", orgRole: "owner", membershipStatus: "active" };
const empABilling: Actor = { kind: "employer", userId: "emp-a-bill", orgId: "org-a", orgRole: "billing", membershipStatus: "active" };
const empARemoved: Actor = { kind: "employer", userId: "emp-a-gone", orgId: "org-a", orgRole: "reviewer", membershipStatus: "removed" };
const empBReviewer: Actor = { kind: "employer", userId: "emp-b", orgId: "org-b", orgRole: "reviewer", membershipStatus: "active" };
const unrelated: Actor = { kind: "unrelated", userId: "rando" };
const operator: Actor = { kind: "operator", userId: "ops", operatorPurpose: "support ticket #4242", operatorAudited: true };
const operatorNoPurpose: Actor = { kind: "operator", userId: "ops2" };
const operatorMaintainer: Actor = { ...operator, userId: "ops-m", assessmentMaintainer: true };
const operatorBilling: Actor = { ...operator, userId: "ops-b", billingSupport: true };

/* Resources --------------------------------------------------------------------- */

const passportA: Resource = {
  kind: "passport_evidence",
  ownerUserId: "cand-a",
  authorizedGrants: [{ orgId: "org-a", fields: ["findings", "provenance"], active: true }],
};
const passportARevokedGrant: Resource = {
  kind: "passport_evidence",
  ownerUserId: "cand-a",
  authorizedGrants: [{ orgId: "org-a", fields: ["findings"], active: false }],
};
const submissionA: Resource = { kind: "submission", ownerUserId: "cand-a", orgId: "org-a" };
const reportA: Resource = { kind: "report", ownerUserId: "cand-a", orgId: "org-a", candidateSubsetProvided: true };
const reportANoSubset: Resource = { kind: "report", ownerUserId: "cand-a", orgId: "org-a", candidateSubsetProvided: false };
const notesA: Resource = { kind: "internal_notes", orgId: "org-a" };
const hidden: Resource = { kind: "hidden_tests" };
const billingA: Resource = { kind: "billing", orgId: "org-a" };
const demo: Resource = { kind: "public_demo", fixtureOnly: true };
const demoReal: Resource = { kind: "public_demo", fixtureOnly: false };

/* Matrix rows --------------------------------------------------------------------- */

section("passport evidence / selected GitHub evidence");

{
  ok("developer sees own passport", allowed(devA, passportA) && decision(devA, passportA).scope === "full");
  ok("developer denied another's passport", !allowed(devB, passportA));
  const d = decision(empAReviewer, passportA);
  ok("employer reviewer sees only authorized shared scope", d.allowed && d.scope === "authorized_scope");
  ok("employer without a grant is denied", !allowed(empBReviewer, passportA));
  ok("employer with revoked grant is denied", !allowed(empAReviewer, passportARevokedGrant));
  ok("removed member is denied", !allowed(empARemoved, passportA));
  ok("unrelated user is denied", !allowed(unrelated, passportA));
  const op = decision(operator, passportA);
  ok("operator with purpose+audit is purpose-limited", op.allowed && op.reason === "operator_purpose_limited_audited");
  ok("operator without purpose is denied", !allowed(operatorNoPurpose, passportA));
}

section("employer-specific submission / transcript");

{
  ok("developer sees own attempt", allowed(devA, submissionA));
  ok("developer denied another's attempt", !allowed(devB, submissionA));
  ok("assigned org reviewer allowed", allowed(empAReviewer, submissionA));
  ok("other org reviewer denied", !allowed(empBReviewer, submissionA));
  ok("billing role denied submissions", !allowed(empABilling, submissionA));
  ok("removed member denied", !allowed(empARemoved, submissionA));
  ok("unrelated denied", !allowed(unrelated, submissionA));
  ok("operator gated by purpose", allowed(operator, submissionA) && !allowed(operatorNoPurpose, submissionA));
}

section("employer report");

{
  const d = decision(devA, reportA);
  ok("developer sees candidate-facing subset when provided", d.allowed && d.scope === "candidate_subset");
  ok("developer denied when no subset provided", !allowed(devA, reportANoSubset));
  ok("developer denied another's report", !allowed(devB, reportA));
  ok("assigned org reviewer allowed", allowed(empAReviewer, reportA));
  ok("other org denied", !allowed(empBReviewer, reportA));
  ok("unrelated denied", !allowed(unrelated, reportA));
  ok("operator purpose-limited", allowed(operator, reportA));
}

section("internal notes / hiring decision history");

{
  ok("developer denied by default", !allowed(devA, notesA));
  ok("other developer denied", !allowed(devB, notesA));
  ok("authorized team (owner) allowed", allowed(empAOwner, notesA));
  ok("authorized team (reviewer) allowed", allowed(empAReviewer, notesA));
  ok("billing member denied notes", !allowed(empABilling, notesA));
  ok("other org denied", !allowed(empBReviewer, notesA));
  ok("unrelated denied", !allowed(unrelated, notesA));
  ok("operator purpose-limited and audited", allowed(operator, notesA));
  ok("operator without audit denied", !allowed(operatorNoPurpose, notesA));
}

section("hidden tests / answer keys");

{
  ok("candidate never sees hidden tests", !allowed(devA, hidden));
  const d = decision(empAReviewer, hidden);
  ok("employer gets rubric preview only, never secrets", d.allowed && d.scope === "rubric_only");
  ok("unrelated denied", !allowed(unrelated, hidden));
  ok("plain operator denied", !allowed(operator, hidden));
  ok("assessment maintainer allowed", allowed(operatorMaintainer, hidden));
}

section("billing");

{
  ok("billing-authorized member allowed", allowed(empABilling, billingA));
  ok("owner does NOT inherit billing (explicit)", !allowed(empAOwner, billingA));
  ok("reviewer denied billing", !allowed(empAReviewer, billingA));
  ok("other org billing member denied", !allowed({ ...empABilling, orgId: "org-b" }, billingA));
  ok("developer denied without billing role", !allowed(devA, billingA));
  const devBilling: Actor = { kind: "developer", userId: "cand-a", orgId: "org-a", orgRole: "billing", membershipStatus: "active" };
  ok("developer with workspace billing role allowed", allowed(devBilling, billingA));
  ok("unrelated denied", !allowed(unrelated, billingA));
  ok("restricted billing support allowed", allowed(operatorBilling, billingA));
  ok("plain operator denied billing", !allowed(operator, billingA));
}

section("public demo");

{
  for (const a of [devA, empAReviewer, unrelated, operator]) {
    const d = decision(a, demo);
    ok(`${a.kind} sees fixtures only`, d.allowed && d.scope === "fixtures_only");
    ok(`${a.kind} denied real data on demo surface`, !allowed(a, demoReal));
  }
}

/* E2E-09 ---------------------------------------------------------------------------- */

section("E2E-09: access isolation across two employers and two candidates");

{
  const subB: Resource = { kind: "submission", ownerUserId: "cand-b", orgId: "org-b" };
  const repB: Resource = { kind: "report", ownerUserId: "cand-b", orgId: "org-b", candidateSubsetProvided: true };
  const passB: Resource = { kind: "passport_evidence", ownerUserId: "cand-b" };

  ok("employer A denied candidate B's submission", !allowed(empAReviewer, subB));
  ok("employer A denied org B's report", !allowed(empBReviewer, reportA) && !allowed(empAReviewer, repB));
  ok("candidate A denied candidate B's passport", !allowed(devA, passB));
  ok("candidate B denied candidate A's submission", !allowed(devB, submissionA));
  ok("unrelated denied everything", ![submissionA, reportA, notesA, passportA, billingA].some((r) => allowed(unrelated, r)));
  // Direct ID guessing: the browser names org-b's id, but the server builds
  // the Actor from its own membership store — there is no membership, so the
  // actor the route constructs has no org context and is denied.
  const serverResolvedActor: Actor = { kind: "employer", userId: "emp-a" };
  ok("guessed org id without membership is denied", !allowed(serverResolvedActor, subB));
}

/* E2E-13 ---------------------------------------------------------------------------- */

section("E2E-13: sharing revocation");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const prov = {
    evidenceType: "simulation",
    source: "fydell-sim",
    sourceVersion: "v3",
    assessmentConditions: "timed 90m",
    capturedAt: new Date().toISOString(),
    scope: "backend",
    verificationMethod: "automated",
    limitations: "single session",
  };
  const e1 = createEvidence(store, "cand-a", { ...prov, visibility: "portable" });
  if (!e1.ok) throw new Error("setup failed");

  const inv = createRoleInvitation(store, "org-a", "role-1", "Backend Engineer", "cand-a");
  const resp = respondToRoleInvitation(store, "cand-a", inv.id, [e1.value.id], { orgName: "Org A" });
  if (!resp.ok) throw new Error("setup failed");
  const { grant, snapshot } = resp.value;

  // Live while granted.
  ok("grant readable while live", readThroughGrant(store, grant.id, "org-a", "emp-a", ["findings"]).ok);

  // Candidate revokes.
  ok("candidate revokes grant", revokeGrant(store, "cand-a", grant.id).ok);
  const after = readThroughGrant(store, grant.id, "org-a", "emp-a", ["findings"]);
  ok("new access denied after revocation", !after.ok && after.code === "grant_revoked");

  // Retained application records behave as disclosed: the snapshot persists
  // with its stated retention and disclosure.
  const kept = store.snapshots.get(snapshot.id);
  ok("application snapshot retained as disclosed", !!kept && new Date(kept.retainedUntil).getTime() > Date.now());
  ok("retention was disclosed pre-share", kept?.disclosure.retentionPolicy.includes("12 months") === true);

  // And the matrix agrees: no live grant, no access.
  const res: Resource = {
    kind: "passport_evidence",
    ownerUserId: "cand-a",
    authorizedGrants: [{ orgId: "org-a", fields: ["findings"], active: false }],
  };
  ok("matrix denies after grant revocation", !allowed(empAReviewer, res));
}

/* E2E-26 ---------------------------------------------------------------------------- */

section("E2E-26: cross-employer reuse");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const prov = {
    evidenceType: "simulation",
    source: "fydell-sim",
    sourceVersion: "v3",
    assessmentConditions: "timed 90m",
    capturedAt: new Date().toISOString(),
    scope: "backend",
    verificationMethod: "automated",
    limitations: "single session",
  };
  const e1 = createEvidence(store, "cand-a", { ...prov, visibility: "portable" });
  const e2 = createEvidence(store, "cand-a", { ...prov, visibility: "portable" });
  const note = createEvidence(store, "cand-a", { ...prov, visibility: "employer_confidential" });
  if (!e1.ok || !e2.ok || !note.ok) throw new Error("setup failed");

  const gA = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [e1.value.id, e2.value.id],
    fields: ["findings", "provenance"],
    purpose: "Application to Org A",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  const gB = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-b",
    evidenceIds: [e2.value.id],
    fields: ["findings"],
    purpose: "Application to Org B",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  if (!gA.ok || !gB.ok) throw new Error("setup failed");

  const bView = readThroughGrant(store, gB.value.grant.id, "org-b", "emp-b", ["findings", "provenance"]);
  ok("org B sees its grant", bView.ok);
  if (bView.ok) {
    ok("org B sees only its allowed evidence", bView.value.evidence.length === 1 && bView.value.evidence[0].id === e2.value.id);
    ok("org B sees only its allowed fields", bView.value.fields.join(",") === "findings");
    ok("org B never sees org A's scope", !bView.value.evidence.some((e) => e.id === e1.value.id));
  }
  const cross = readThroughGrant(store, gA.value.grant.id, "org-b", "emp-b", ["findings"]);
  ok("org B cannot reach org A's grant", !cross.ok && cross.code === "grant_org_mismatch");

  // Prior hiring notes cannot enter any grant, by construction.
  const sneaky = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-b",
    evidenceIds: [e2.value.id, note.value.id],
    fields: ["findings"],
    purpose: "sneak notes in",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  ok("employer-confidential note rejected from grant", !sneaky.ok && sneaky.code === "non_portable_evidence");

  // Access log records who saw what (NET-08 auditability).
  const log = store.grants.get(gB.value.grant.id)?.accessLog ?? [];
  ok("grant access is logged", log.length === 1 && log[0].accessorOrgId === "org-b");
}

/* Summary ---------------------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`All access-matrix checks passed (${passes} assertions).`);
