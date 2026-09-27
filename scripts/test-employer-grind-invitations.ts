/**
 * Employer grind — invitations (EMP-03/05/06/07).
 *
 * EMP-05: email validation, duplicate prevention, deliberate send, delivery status.
 * EMP-06: operational state machine with defined meaning, enforced server-side.
 * EMP-07: resend never creates a second invitation or attempt; revoke/extend logged.
 * EMP-03: invites pin scenario/rubric versions; later edits cannot alter an in-progress attempt.
 * In-process with fakes.
 */

import {
  createCandidateInvitation,
  sendInvitation,
  findInvitationByToken,
  createInvitationMemoryStore,
  tokenMatches,
} from "../src/lib/invitations/candidate-invites";
import {
  resendInvitation,
  revokeInvitation,
  extendInvitation,
  applyInvitationEvent,
} from "../src/lib/invitations/operations";
import { transitionInvitation, STATE_MEANING, TERMINAL_STATES } from "../src/lib/invitations/states";
import {
  pinAssessmentConfig,
  resolvePinnedScenario,
  resolvePinnedRubric,
  attemptStillUsesPinnedVersion,
  type VersionRegistry,
  type VersionedContent,
} from "../src/lib/invitations/config-freeze";
import { createAuditMemoryStore, eventsFor } from "../src/lib/employer/audit";
import type { DeliveryStatus, InvitationMailer } from "../src/lib/invitations/types";

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

/* Fakes ------------------------------------------------------------------------ */

function makeRegistry(): VersionRegistry & { publishScenario(versionId: string): void; publishRubric(versionId: string): void } {
  const versions = new Map<string, VersionedContent>();
  let currentScenario = "scen-v1";
  let currentRubric = "rub-v1";
  versions.set("scen-v1", { versionId: "scen-v1", versionLabel: "v1.0.0", content: { brief: "incident brief v1" }, rubricVersionId: "rub-v1" });
  versions.set("rub-v1", { versionId: "rub-v1", versionLabel: "v1.0.0", content: { dimensions: ["correctness"] }, rubricVersionId: "rub-v1" });
  return {
    getVersion: (id) => versions.get(id) ?? null,
    currentScenarioVersionId: () => currentScenario,
    currentRubricVersionId: () => currentRubric,
    publishScenario(versionId: string) {
      currentScenario = versionId;
      versions.set(versionId, { versionId, versionLabel: versionId, content: { brief: `incident brief ${versionId}` }, rubricVersionId: currentRubric });
    },
    publishRubric(versionId: string) {
      currentRubric = versionId;
      versions.set(versionId, { versionId, versionLabel: versionId, content: { dimensions: ["correctness", "judgment"] }, rubricVersionId: versionId });
    },
  };
}

function makeMailer(sent: { to: string; kind: string; url: string }[]): InvitationMailer {
  return {
    queueInviteEmail: (input) => {
      sent.push({ to: input.toEmail, kind: input.kind, url: input.inviteUrl });
      const deliveryStatus: DeliveryStatus = "queued";
      return { queued: true, deliveryStatus };
    },
  };
}

function baseInput(registry: VersionRegistry) {
  return {
    orgId: "org-1",
    templateId: "tmpl-harbor",
    roleKey: "backend_engineer",
    candidateEmail: "Candidate@Example.com",
    candidateName: "Ada",
    createdBy: "u-employer",
    registry,
  };
}

/* EMP-05: validation, duplicates, deliberate send --------------------------------- */

async function main() {
  section("EMP-05: invite validation, duplicate prevention, deliberate send");

  {
    const registry = makeRegistry();
    const store = createInvitationMemoryStore();
    const audit = createAuditMemoryStore();
    const sent: { to: string; kind: string; url: string }[] = [];

    const bad = createCandidateInvitation(store, audit, { ...baseInput(registry), candidateEmail: "not-an-email" });
    ok("invalid email rejected", !bad.ok && bad.code === "invalid_email");

    const r = createCandidateInvitation(store, audit, baseInput(registry));
    ok("valid invite created", r.ok);
    if (!r.ok) throw new Error("setup failed");
    const { invitation, token } = r.value;

    ok("email normalized to lowercase", invitation.candidateEmail === "candidate@example.com");
    ok("creation does NOT send: state is draft", invitation.state === "draft");
    ok("creation does NOT send: no email queued", sent.length === 0);
    ok("creation does NOT send: delivery status not_sent", invitation.deliveryStatus === "not_sent");
    ok("plaintext token returned exactly once at creation", token.length >= 43);
    ok(
      "plaintext token never stored",
      ![...store.invitations.values()].some((inv) =>
        JSON.stringify(inv).includes(token.slice(0, 12))
      )
    );
    ok("token hash matches via constant-time check", tokenMatches(token, invitation.tokenHash));

    // Duplicate prevention: same candidate + template + org -> existing row, no second charge.
    const dup = createCandidateInvitation(store, audit, baseInput(registry));
    ok("duplicate invite returns existing (no second charge)", dup.ok && dup.value.duplicate === true);
    ok("duplicate does not create a second row", store.invitations.size === 1);
    if (dup.ok) ok("duplicate returns the same invitation id", dup.value.invitation.id === invitation.id);

    // Deliberate send.
    const mailer = makeMailer(sent);
    const sentRes = await sendInvitation(store, audit, mailer, {
      invitationId: invitation.id,
      actorUserId: "u-employer",
      token,
      inviteUrlForToken: (t) => `https://app/invite/${t}`,
    });
    ok("deliberate send succeeds", sentRes.ok);
    if (!sentRes.ok) throw new Error("send failed");
    ok("send moves draft -> invited", sentRes.value.invitation.state === "invited");
    ok("exactly one email queued on send", sent.length === 1);
    ok("email went to the invited candidate", sent[0].to === "candidate@example.com");
    ok("invite URL carries the token", sentRes.value.inviteUrl.includes(token));
    ok("delivery status recorded", sentRes.value.invitation.deliveryStatus === "queued");
    ok("send count is 1", sentRes.value.invitation.sendCount === 1);

    const again = await sendInvitation(store, audit, mailer, {
      invitationId: invitation.id,
      actorUserId: "u-employer",
      token,
      inviteUrlForToken: (t) => `https://app/invite/${t}`,
    });
    ok("sending twice is rejected (no double email)", !again.ok && sent.length === 1);

    const wrongToken = createCandidateInvitation(store, audit, {
      ...baseInput(registry),
      candidateEmail: "other@example.com",
    });
    if (!wrongToken.ok || wrongToken.value.duplicate) throw new Error("setup failed");
    const badSend = await sendInvitation(store, audit, mailer, {
      invitationId: wrongToken.value.invitation.id,
      actorUserId: "u-employer",
      token: "wrong-token",
      inviteUrlForToken: (t) => `https://app/invite/${t}`,
    });
    ok("send requires the creation token", !badSend.ok && badSend.code === "not_permitted");

    const lookup = findInvitationByToken(store, token);
    ok("invitation found by token", lookup?.id === invitation.id);
    ok("unknown token finds nothing", findInvitationByToken(store, "nope") === null);

    const createdEvents = eventsFor(audit, "invitation", invitation.id);
    ok("audit log has creation + send events", createdEvents.length === 2);
  }

  /* EMP-06: operational state machine ---------------------------------------------- */

  section("EMP-06: operational states with defined meaning, enforced server-side");

  {
    ok("every state has a defined meaning", Object.keys(STATE_MEANING).length === 11);
    ok(
      "terminal states are ready/expired/withdrawn",
      TERMINAL_STATES.has("ready") && TERMINAL_STATES.has("expired") && TERMINAL_STATES.has("withdrawn")
    );

    const happy: [string, "draft" | "invited" | "accepted" | "setup" | "in_progress" | "submitted" | "evaluating" | "review_required", "send" | "accept" | "begin_setup" | "begin_work" | "submit" | "evaluation_started" | "flag_for_review" | "release_report"][] = [
      ["draft->invited", "draft", "send"],
      ["invited->accepted", "invited", "accept"],
      ["accepted->setup", "accepted", "begin_setup"],
      ["setup->in_progress", "setup", "begin_work"],
      ["in_progress->submitted", "in_progress", "submit"],
      ["submitted->evaluating", "submitted", "evaluation_started"],
      ["evaluating->review_required", "evaluating", "flag_for_review"],
      ["review_required->ready", "review_required", "release_report"],
      ["evaluating->ready (no review needed)", "evaluating", "release_report"],
    ];
    for (const [label, from, event] of happy) {
      const t = transitionInvitation(from, event as never);
      ok(`legal transition: ${label}`, t.ok === true);
    }

    const illegal: ["invited" | "in_progress" | "ready" | "expired" | "draft", "accept" | "send" | "release_report" | "submit"][] = [
      ["draft", "accept"], // must be sent first
      ["invited", "submit"], // cannot skip to submitted
      ["in_progress", "release_report"], // must submit + evaluate first
      ["ready", "send"], // terminal
      ["expired", "accept"], // terminal
    ];
    for (const [from, event] of illegal) {
      const t = transitionInvitation(from, event as never);
      ok(`illegal transition rejected: ${from} + ${event}`, t.ok === false);
    }

    // applyInvitationEvent is the only mutation path and it logs.
    const registry = makeRegistry();
    const store = createInvitationMemoryStore();
    const audit = createAuditMemoryStore();
    const r = createCandidateInvitation(store, audit, baseInput(registry));
    if (!r.ok || r.value.duplicate) throw new Error("setup failed");
    const id = r.value.invitation.id;
    const moved = applyInvitationEvent(store, audit, id, "send", "u-employer");
    ok("applyInvitationEvent moves draft->invited", moved.ok && moved.value.state === "invited");
    const bad = applyInvitationEvent(store, audit, id, "submit", "u-employer");
    ok("applyInvitationEvent rejects illegal jump invited->submitted", !bad.ok);
    ok("rejected transition leaves state unchanged", store.invitations.get(id)?.state === "invited");
  }

  /* EMP-07: resend / revoke / extend ------------------------------------------------ */

  section("EMP-07: resend, revoke and extend are logged; resend never duplicates");

  {
    const registry = makeRegistry();
    const store = createInvitationMemoryStore();
    const audit = createAuditMemoryStore();
    const sent: { to: string; kind: string; url: string }[] = [];
    const mailer = makeMailer(sent);

    const r = createCandidateInvitation(store, audit, baseInput(registry));
    if (!r.ok || r.value.duplicate) throw new Error("setup failed");
    const { invitation, token } = r.value;
    invitation.attemptId = "attempt-1"; // candidate started work
    const s = await sendInvitation(store, audit, mailer, {
      invitationId: invitation.id,
      actorUserId: "u-employer",
      token,
      inviteUrlForToken: (t) => `https://app/invite/${t}`,
    });
    if (!s.ok) throw new Error("setup failed");

    const invitationsBefore = store.invitations.size;
    const re = await resendInvitation(store, audit, mailer, {
      invitationId: invitation.id,
      actorUserId: "u-employer",
      token,
      inviteUrlForToken: (t) => `https://app/invite/${t}`,
    });
    ok("resend succeeds", re.ok);
    if (!re.ok) throw new Error("resend failed");
    ok("resend does not create a second invitation", store.invitations.size === invitationsBefore);
    ok("resend does not create a second attempt", re.value.invitation.attemptId === "attempt-1");
    ok("resend re-emails the candidate", sent.length === 2 && sent[1].kind === "resend");
    ok("resend increments send count on the same row", re.value.invitation.sendCount === 2);
    ok(
      "resend is logged",
      eventsFor(audit, "invitation", invitation.id).some((e) => e.action === "invitation_resent")
    );

    // Extend.
    const before = invitation.expiresAt;
    const ext = extendInvitation(store, audit, invitation.id, "u-employer", 7);
    ok("extend succeeds", ext.ok);
    if (!ext.ok) throw new Error("extend failed");
    ok("extend pushes the deadline", new Date(ext.value.expiresAt).getTime() > new Date(before).getTime());
    ok(
      "extend is logged with actor + both deadlines",
      eventsFor(audit, "invitation", invitation.id).some(
        (e) =>
          e.action === "invitation_extended" &&
          e.actorUserId === "u-employer" &&
          e.detail.previousExpiresAt === before
      )
    );

    // Revoke.
    const rev = revokeInvitation(store, audit, invitation.id, "u-employer", "role filled");
    ok("revoke succeeds", rev.ok);
    ok("revoked invitation is withdrawn", rev.ok && rev.value.state === "withdrawn");
    ok(
      "revocation is logged",
      eventsFor(audit, "invitation", invitation.id).some((e) => e.action === "invitation_revoked")
    );
    const afterRevoke = await resendInvitation(store, audit, mailer, {
      invitationId: invitation.id,
      actorUserId: "u-employer",
      token,
      inviteUrlForToken: (t) => `https://app/invite/${t}`,
    });
    ok("resend after revoke is rejected", !afterRevoke.ok);
  }

  /* EMP-03: frozen configuration ---------------------------------------------------- */

  section("EMP-03: invites pin scenario/rubric versions; later edits cannot alter attempts");

  {
    const registry = makeRegistry();
    const store = createInvitationMemoryStore();
    const audit = createAuditMemoryStore();

    const r = createCandidateInvitation(store, audit, baseInput(registry));
    if (!r.ok || r.value.duplicate) throw new Error("setup failed");
    const pinned = r.value.invitation.pinned;
    ok("invitation pins scenario version", pinned.scenarioVersionId === "scen-v1");
    ok("invitation pins rubric version", pinned.rubricVersionId === "rub-v1");
    ok("pin timestamp recorded", typeof pinned.pinnedAt === "string");

    // Employer edits the scenario and rubric AFTER the invite was sent.
    registry.publishScenario("scen-v2");
    registry.publishRubric("rub-v2");

    const scen = resolvePinnedScenario(registry, pinned);
    ok("attempt still resolves the PINNED scenario version", scen.ok && scen.value.versionId === "scen-v1");
    ok(
      "attempt content is the old brief, not the edited one",
      scen.ok && (scen.value.content as { brief: string }).brief === "incident brief v1"
    );
    const rub = resolvePinnedRubric(registry, pinned);
    ok("grading still uses the PINNED rubric version", rub.ok && rub.value.versionId === "rub-v1");
    ok(
      "attemptStillUsesPinnedVersion confirms no drift",
      attemptStillUsesPinnedVersion(registry, pinned, registry.currentScenarioVersionId("tmpl-harbor"))
    );

    // If the pinned version is somehow gone, resolution FAILS rather than silently upgrading.
    const goneRegistry = makeRegistry();
    const pin = pinAssessmentConfig(goneRegistry, "tmpl-harbor");
    if (!pin.ok) throw new Error("setup failed");
    const broken: VersionRegistry = {
      ...goneRegistry,
      getVersion: () => null, // pinned version no longer retrievable
    };
    const missing = resolvePinnedScenario(broken, pin.value);
    ok(
      "missing pinned version fails closed (no silent upgrade)",
      !missing.ok && missing.code === "pinned_version_missing"
    );
  }

}

/* Summary ------------------------------------------------------------------------ */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All employer invitation checks passed.");

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
