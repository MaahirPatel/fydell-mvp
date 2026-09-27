/**
 * Accounts grind — network foundations (NET-01..NET-08).
 *
 * Identity/applications separation, portable evidence provenance, scoped
 * candidate-directed reuse grants, private/portable separation by
 * construction, pre-share disclosure, freshness/corrections versioning, and
 * voluntary participation defaults. In-process with fakes.
 */

import {
  correctEvidence,
  createEvidence,
  createGrantMemoryStore,
  createPassport,
  createRoleInvitation,
  createShareGrant,
  preShareDisclosure,
  readThroughGrant,
  reevaluateEvidence,
  respondToRoleInvitation,
  revokeGrant,
  setReuseOptOut,
} from "../src/lib/grants/share-grants";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

const PROV = {
  evidenceType: "simulation",
  source: "fydell-sim",
  sourceVersion: "scenario-webhook-retry@v1.0.0",
  assessmentConditions: "timed 90 minutes, proctored chat",
  capturedAt: "2026-09-20T10:00:00.000Z",
  scope: "backend",
  verificationMethod: "automated tests + human review",
  limitations: "single session; no production data",
};

/* NET-01 ----------------------------------------------------------------------- */

section("NET-01: identity separate from applications");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const e = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  if (!e.ok) throw new Error("setup failed");

  // One stable developer record…
  ok("one passport per developer", store.passports.get("cand-a")?.developerUserId === "cand-a");

  // …connects to multiple permissioned employer applications via grants.
  const invA = createRoleInvitation(store, "org-a", "role-a", "Backend Eng", "cand-a");
  const invB = createRoleInvitation(store, "org-b", "role-b", "Platform Eng", "cand-a");
  const rA = respondToRoleInvitation(store, "cand-a", invA.id, [e.value.id]);
  const rB = respondToRoleInvitation(store, "cand-a", invB.id, [e.value.id]);
  ok("application to org A created", rA.ok);
  ok("application to org B created", rB.ok);
  if (rA.ok && rB.ok) {
    ok("separate snapshots per application", rA.value.snapshot.id !== rB.value.snapshot.id);
    ok("separate grants per application", rA.value.grant.id !== rB.value.grant.id);
    ok("snapshot A pinned to org A", rA.value.snapshot.orgId === "org-a");
    ok("snapshot B pinned to org B", rB.value.snapshot.orgId === "org-b");
  }

  // Employer membership never becomes ownership: an employer has no
  // passport to grant from, and a candidate cannot sweep another
  // candidate's evidence into their own grant.
  const hostile = createShareGrant(store, {
    ownerUserId: "emp-a",
    audienceOrgId: "org-a",
    evidenceIds: [e.value.id],
    fields: ["findings"],
    purpose: "takeover",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  ok("employer has no passport to grant from", !hostile.ok && hostile.code === "passport_not_found");

  createPassport(store, "cand-evil");
  const sweep = createShareGrant(store, {
    ownerUserId: "cand-evil",
    audienceOrgId: "org-a",
    evidenceIds: [e.value.id],
    fields: ["findings"],
    purpose: "sweep",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  ok("cannot grant another candidate's evidence", !sweep.ok && sweep.code === "not_owner");
}

/* NET-02 ----------------------------------------------------------------------- */

section("NET-02: portable evidence provenance");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");

  const missing = createEvidence(store, "cand-a", {
    evidenceType: "simulation",
    source: "fydell-sim",
    visibility: "portable",
  } as never);
  ok("missing provenance is rejected", !missing.ok && missing.code === "missing_provenance");

  const full = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  ok("complete provenance is accepted", full.ok);
  if (full.ok) {
    const v = full.value;
    for (const f of ["evidenceType", "source", "sourceVersion", "assessmentConditions", "capturedAt", "scope", "verificationMethod", "limitations"] as const) {
      ok(`provenance field ${f} present`, typeof v[f] === "string" && v[f].length > 0);
    }
  }

  // No universal ability score: a grant/snapshot serializes per-evidence
  // findings only — there is deliberately no cross-scope aggregate.
  const inv = createRoleInvitation(store, "org-a", "role-a", "Backend Eng", "cand-a");
  const e2 = createEvidence(store, "cand-a", { ...PROV, scope: "frontend", visibility: "portable" });
  if (!full.ok || !e2.ok) throw new Error("setup failed");
  const resp = respondToRoleInvitation(store, "cand-a", inv.id, [full.value.id, e2.value.id]);
  if (!resp.ok) throw new Error("setup failed");
  const serialized = JSON.stringify(resp.value.snapshot);
  ok("no universal score in the snapshot", !/overallScore|abilityScore|universalScore/i.test(serialized));
  ok("per-evidence versions pinned", resp.value.snapshot.evidence.length === 2);
}

/* NET-03 ----------------------------------------------------------------------- */

section("NET-03: candidate-directed reuse");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const e1 = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  const e2 = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  const e3 = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  if (!e1.ok || !e2.ok || !e3.ok) throw new Error("setup failed");

  const inv = createRoleInvitation(store, "org-b", "role-b", "Backend Eng", "cand-a");
  const resp = respondToRoleInvitation(store, "cand-a", inv.id, [e1.value.id, e3.value.id]);
  ok("candidate selects eligible evidence", resp.ok);
  if (resp.ok) {
    const ids = resp.value.grant.evidence.map((p) => p.evidenceId);
    ok("selected evidence is shared", ids.includes(e1.value.id) && ids.includes(e3.value.id));
    ok("unselected evidence stays private", !ids.includes(e2.value.id));
    ok("unselected evidence not in snapshot", !resp.value.snapshot.evidence.some((p) => p.evidenceId === e2.value.id));
  }

  // Wrong candidate cannot answer someone else's invitation.
  const inv2 = createRoleInvitation(store, "org-b", "role-c", "Other", "cand-a");
  const wrong = respondToRoleInvitation(store, "cand-evil", inv2.id, [e1.value.id]);
  ok("invitation bound to the invited candidate", !wrong.ok && wrong.code === "not_owner");
}

/* NET-04 ----------------------------------------------------------------------- */

section("NET-04: private and portable evidence separated by construction");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const portable = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  const priv = createEvidence(store, "cand-a", { ...PROV, visibility: "private" });
  const confidential = createEvidence(store, "cand-a", { ...PROV, visibility: "employer_confidential" });
  const hidden = createEvidence(store, "cand-a", { ...PROV, visibility: "hidden_test" });
  if (!portable.ok || !priv.ok || !confidential.ok || !hidden.ok) throw new Error("setup failed");

  const attempt = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [portable.value.id, priv.value.id, confidential.value.id, hidden.value.id],
    fields: ["findings"],
    purpose: "smuggle",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  ok("mixed grant rejected", !attempt.ok && attempt.code === "non_portable_evidence");
  if (!attempt.ok) {
    ok("rejection names the excluded items", attempt.message.includes("employer_confidential") && attempt.message.includes("hidden_test") && attempt.message.includes("private"));
  }

  const clean = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [portable.value.id],
    fields: ["findings"],
    purpose: "legit",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  ok("portable-only grant succeeds", clean.ok);
  if (clean.ok) {
    const view = readThroughGrant(store, clean.value.grant.id, "org-a", "emp-a", ["findings"]);
    ok("grant read works", view.ok);
    if (view.ok) {
      ok(
        "only portable evidence ever leaves",
        view.value.evidence.every((ev) => ev.visibility === "portable")
      );
    }
  }
}

/* NET-05 ----------------------------------------------------------------------- */

section("NET-05: pre-share disclosure");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const e = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  if (!e.ok) throw new Error("setup failed");
  const g = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [e.value.id],
    fields: ["findings", "provenance"],
    purpose: "Application",
    expiresAt: "2026-12-27T00:00:00.000Z",
    orgNameForDisclosure: "Acme Health",
  });
  if (!g.ok) throw new Error("setup failed");
  const d = g.value.disclosure;
  ok("disclosure names the recipient", d.recipientOrgId === "org-a" && d.recipientOrgName === "Acme Health");
  ok("disclosure states the scope", d.scopeFields.join(",") === "findings,provenance" && d.evidenceCount === 1);
  ok("disclosure states the expiry", d.expiresAt === "2026-12-27T00:00:00.000Z");
  ok("disclosure states retention", d.retentionPolicy.length > 0);
  ok("disclosure explains revocation", d.revocation.includes("revoke"));
  ok(
    "disclosure is honest about downloaded copies",
    d.revocation.includes("cannot be retracted")
  );
  ok("disclosure is produced before sharing", !!d && g.value.grant.accessLog.length === 0);

  // preShareDisclosure is also callable standalone on a draft-shaped grant.
  const standalone = preShareDisclosure(g.value.grant, { orgName: "Acme Health" });
  ok("standalone disclosure matches", standalone.recipientOrgId === "org-a");
}

/* NET-06 ----------------------------------------------------------------------- */

section("NET-06: freshness and corrections");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const e = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  if (!e.ok) throw new Error("setup failed");

  // Freshness: age is visible from capturedAt.
  const ageMs = Date.now() - new Date(e.value.capturedAt).getTime();
  ok("evidence age is observable", ageMs > 0);

  // A live grant pins the old version before correction.
  const g = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [e.value.id],
    fields: ["findings"],
    purpose: "pre-correction",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  if (!g.ok) throw new Error("setup failed");

  // Re-evaluation creates a new version; the old is superseded.
  const re = reevaluateEvidence(store, "cand-a", e.value.id, { sourceVersion: "scenario-webhook-retry@v1.0.1" });
  ok("re-evaluation creates a new version", re.ok);
  if (re.ok) {
    ok("new version number", re.value.version === 2);
    ok("old version superseded", store.evidence.get(e.value.id)?.status === "superseded");
    ok("supersedes link kept", re.value.supersedesId === e.value.id);
  }

  // Material correction is traceable and propagated to affected grants.
  const v2 = re.ok ? re.value : e.value;
  const corr = correctEvidence(store, "reviewer-1", v2.id, {
    correctedFinding: "retry backoff was misconfigured in the original run",
    reason: "test harness bug found on re-review",
  });
  ok("correction succeeds", corr.ok);
  if (corr.ok) {
    const { correction } = corr.value;
    ok("correction records the previous version", correction.previousEvidenceId === v2.id && correction.previousVersion === v2.version);
    ok("correction records the finding", correction.correctedFinding.includes("backoff"));
    ok("correction records actor and reason", correction.actorUserId === "reviewer-1" && correction.reason.length > 0);
    ok("old version carries the correction trace", store.evidence.get(v2.id)?.correction?.correctedFinding.includes("backoff") === true);
    ok(
      "affected live grant was notified",
      correction.notifications.some((n) => n.grantId === g.value.grant.id && n.status === "notified")
    );
    // The grant pinned the pre-correction version: reading it still yields
    // the exact pinned version (no silent swap), while the new version is
    // what future grants will pin.
    const view = readThroughGrant(store, g.value.grant.id, "org-a", "emp-a", ["findings"]);
    ok("grant still pins its original version", view.ok && view.value.evidence[0]?.id === e.value.id);
  }

  // Revoked grants are not notified (no longer authorized).
  const g2 = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-b",
    evidenceIds: [corr.ok ? corr.value.newVersion.id : v2.id],
    fields: ["findings"],
    purpose: "will be revoked",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  if (!g2.ok) throw new Error("setup failed");
  revokeGrant(store, "cand-a", g2.value.grant.id);
  const corr2 = correctEvidence(store, "reviewer-1", corr.ok ? corr.value.newVersion.id : v2.id, {
    correctedFinding: "second correction",
    reason: "follow-up",
  });
  ok(
    "revoked grant not notified",
    corr2.ok && !corr2.value.correction.notifications.some((n) => n.grantId === g2.value.grant.id)
  );
}

/* NET-07 ----------------------------------------------------------------------- */

section("NET-07: voluntary participation defaults");

{
  const store = createGrantMemoryStore();
  const p = createPassport(store, "cand-a");
  ok("no public discoverability by default", p.discoverable === false);
  ok("no automatic application by default", p.autoApply === false);
  ok("no outreach triggered by GitHub connection", p.outreachOnGithubConnect === false);
  ok("reuse not declined by default", p.reuseOptOut === false);

  // The candidate can decline reuse; grants then refuse to mint.
  setReuseOptOut(store, "cand-a", true);
  const e = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  if (!e.ok) throw new Error("setup failed");
  const g = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [e.value.id],
    fields: ["findings"],
    purpose: "declined",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  });
  ok("reuse opt-out blocks new grants", !g.ok && g.code === "reuse_declined");

  // And role-invitation responses honor it too.
  const inv = createRoleInvitation(store, "org-a", "role-a", "Backend Eng", "cand-a");
  const resp = respondToRoleInvitation(store, "cand-a", inv.id, [e.value.id]);
  ok("reuse opt-out blocks invitation responses", !resp.ok && resp.code === "reuse_declined");
}

/* NET-08 ----------------------------------------------------------------------- */

section("NET-08: genuine cross-employer path");

{
  const store = createGrantMemoryStore();
  createPassport(store, "cand-a");
  const e1 = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  const e2 = createEvidence(store, "cand-a", { ...PROV, visibility: "portable" });
  const note = createEvidence(store, "cand-a", { ...PROV, visibility: "employer_confidential" });
  if (!e1.ok || !e2.ok || !note.ok) throw new Error("setup failed");

  // Candidate shares eligible evidence with A, later with B, under separate grants.
  const gA = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-a",
    evidenceIds: [e1.value.id, e2.value.id],
    fields: ["findings", "provenance"],
    purpose: "Org A application",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  const gB = createShareGrant(store, {
    ownerUserId: "cand-a",
    audienceOrgId: "org-b",
    evidenceIds: [e2.value.id],
    fields: ["findings"],
    purpose: "Org B application",
    expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  });
  ok("grant to employer A", gA.ok);
  ok("later grant to employer B", gB.ok);
  if (gA.ok && gB.ok) {
    ok("grants are separate records", gA.value.grant.id !== gB.value.grant.id);
    const bView = readThroughGrant(store, gB.value.grant.id, "org-b", "emp-b", ["findings"]);
    ok("B reads its grant", bView.ok);
    if (bView.ok) {
      ok("B sees only its allowed scope", bView.value.evidence.length === 1);
      ok("B never sees A's notes or confidential artifacts", bView.value.evidence.every((x) => x.visibility === "portable"));
    }
    const aView = readThroughGrant(store, gA.value.grant.id, "org-a", "emp-a", ["findings"]);
    ok("A still reads its own grant", aView.ok && aView.value.evidence.length === 2);
    // A's confidential note was never shareable in the first place.
    const sneak = createShareGrant(store, {
      ownerUserId: "cand-a",
      audienceOrgId: "org-b",
      evidenceIds: [note.value.id],
      fields: ["findings"],
      purpose: "leak",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    ok("confidential artifacts can never enter a grant", !sneak.ok);
  }
}

/* Summary ------------------------------------------------------------------------------ */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All network-foundation checks passed.");
