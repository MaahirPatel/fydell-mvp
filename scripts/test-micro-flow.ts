/**
 * End-to-end flow test for the five-minute micro simulations, run against the
 * live database through the same library code the API routes use.
 *
 * Covers the Fractal pilot loop:
 *   invite -> accept -> start -> answers autosave -> stakeholder chat ->
 *   submit (idempotent) -> scoring -> result -> share token -> feedback
 *
 * Run with: npx tsx --conditions react-server scripts/test-micro-flow.ts [slug]
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local before importing any module that reads env at import time.
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env.local optional if env is already set
}

const TEST_CANDIDATE_EMAIL = "e2e-candidate@fydell.test";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures++;
  }
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "BLOCKED: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
    );
    process.exit(2);
  }

  const { createAdminSupabaseClient } = await import("../src/lib/supabase/admin");
  const db = await import("../src/lib/simulations/db");
  const { runMicroScoring } = await import("../src/lib/simulations/micro-scoring");
  const { SIMULATION_BY_SLUG, ALL_SIMULATIONS } = await import(
    "../src/lib/simulations/content/index"
  );
  const { draftReply, findStakeholder } = await import("../src/lib/simulations/stakeholder");
  const { isMicroContent } = await import("../src/lib/simulations/micro-types");

  const admin = createAdminSupabaseClient();
  const slugs = process.argv[2] ? [process.argv[2]] : ALL_SIMULATIONS.map((s) => s.slug);

  // ---- test candidate user ------------------------------------------------
  console.log("setup");
  let candidateId: string | null = null;
  const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = userList?.users.find((u) => u.email === TEST_CANDIDATE_EMAIL);
  if (existing) {
    candidateId = existing.id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: TEST_CANDIDATE_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "E2E Test Candidate", user_type: "candidate" },
    });
    if (error) throw new Error(`Could not create test candidate: ${error.message}`);
    candidateId = created.user.id;
  }
  check("test candidate exists", Boolean(candidateId));
  const orgId = await db.getOrCreatePilotOrg();
  check("pilot org exists", Boolean(orgId));

  for (const slug of slugs) {
    const sim = SIMULATION_BY_SLUG[slug];
    if (!sim || !isMicroContent(sim)) {
      check(`${slug} registered as micro sim`, false);
      continue;
    }
    console.log(`\n=== ${slug} ===`);

    // ---- invite + accept (the Fractal pilot entry path) --------------------
    const found = await db.getTemplateBySlug(slug);
    check("template published", Boolean(found && found.template.status === "published"));
    if (!found) continue;

    // Remove any earlier test attempt so each run starts clean.
    const { data: oldSessions } = await admin
      .from("sim_sessions")
      .select("id, invitation_id")
      .eq("candidate_user_id", candidateId!)
      .eq("template_id", found.template.id);
    for (const s of oldSessions || []) {
      await admin.from("sim_sessions").delete().eq("id", s.id);
      if (s.invitation_id)
        await admin.from("sim_invitations").delete().eq("id", s.invitation_id);
    }
    await admin
      .from("sim_invitations")
      .delete()
      .eq("candidate_email", TEST_CANDIDATE_EMAIL)
      .eq("template_id", found.template.id);

    const { invitation, token } = await db.createInvitation({
      organizationId: orgId,
      templateId: found.template.id,
      candidateEmail: TEST_CANDIDATE_EMAIL,
      candidateName: "E2E Test Candidate",
      invitedBy: candidateId!,
    });
    check("invitation created with token", Boolean(invitation.id && token));

    const byToken = await db.getInvitationByToken(token);
    check("invite link resolves", byToken?.id === invitation.id);
    check("invite gate passes", db.invitationGate(byToken!).ok);

    const { session } = await db.acceptInvitation(token, candidateId!, TEST_CANDIDATE_EMAIL);
    check("accept creates session", Boolean(session.id));

    // Accepting twice must return the same session (idempotent).
    const again = await db.acceptInvitation(token, candidateId!, TEST_CANDIDATE_EMAIL);
    check("re-accept returns same session", again.session.id === session.id);

    // ---- start + timer ------------------------------------------------------
    const started = await db.startSession(session.id, candidateId!);
    check("start sets started_at", Boolean(started.started_at));

    // ---- answers autosave + refresh recovery -------------------------------
    const deliverable: Record<string, string | number | string[]> = {};
    for (const q of sim.questions) {
      if (q.kind === "text")
        deliverable[q.id] = (q.concepts || []).map((c) => c.keywords[0]).join(". ");
      else if (q.kind === "number") deliverable[q.id] = (q.answer as number[])[0];
      else if (q.kind === "multi_select") deliverable[q.id] = q.answer as string[];
      else deliverable[q.id] = (q.answer as string[])[0];
    }
    const state0 = await db.getSessionState(session.id);
    const saved = await db.saveSessionState(session.id, state0.revision, { deliverable });
    check("autosave succeeds", "revision" in saved);
    const restored = await db.getSessionState(session.id);
    check(
      "refresh restores answers",
      JSON.stringify(restored.deliverable) === JSON.stringify(deliverable)
    );

    // ---- stakeholder chat (same path as the messages API route) ------------
    const stakeholder = findStakeholder(sim, sim.stakeholders[0].id)!;
    const relRule = stakeholder.responseRules.find((r) => r.id.startsWith("rel_"))!;
    const questionText = `Quick question: ${relRule.anyKeywords.slice(0, 3).join(" ")}?`;
    await db.insertMessage({
      sessionId: session.id,
      thread: "stakeholder",
      stakeholderId: stakeholder.id,
      sender: "candidate",
      body: questionText,
      clientMsgId: "e2e-msg-1",
    });
    const drafted = await draftReply(stakeholder, questionText, {
      curveballPresented: false,
      usedRuleIds: [],
    });
    check(
      `relevant question fires authored rule (${drafted.ruleId})`,
      drafted.ruleId === relRule.id,
      `got ${drafted.ruleId}`
    );
    check("stakeholder reply is authored (deterministic-safe)", drafted.reply.length > 0);
    await db.insertMessage({
      sessionId: session.id,
      thread: "stakeholder",
      stakeholderId: stakeholder.id,
      sender: "stakeholder",
      body: drafted.reply,
      clientMsgId: "reply_e2e-msg-1",
    });
    await db.recordEvent(session.id, {
      eventType: "message_received",
      actor: "stakeholder",
      payload: { stakeholderId: stakeholder.id, ruleId: drafted.ruleId, source: drafted.source },
      clientEventId: "recv_e2e-msg-1",
    });

    // Duplicate client id must not duplicate the message.
    const dup = await db.insertMessage({
      sessionId: session.id,
      thread: "stakeholder",
      stakeholderId: stakeholder.id,
      sender: "candidate",
      body: questionText,
      clientMsgId: "e2e-msg-1",
    });
    check("duplicate message id ignored", dup.duplicate === true);

    // ---- submit (idempotent) ------------------------------------------------
    const sub1 = await db.submitSession(session.id, candidateId!, false);
    check("submit works", Boolean(sub1.submissionId));
    const sub2 = await db.submitSession(session.id, candidateId!, false);
    check(
      "double submit returns same submission",
      sub2.alreadySubmitted && sub2.submissionId === sub1.submissionId
    );

    // ---- scoring --------------------------------------------------------------
    await runMicroScoring(session.id);
    const { data: run } = await admin
      .from("sim_analysis_runs")
      .select("id, status, result")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    check("analysis run completed", run?.status === "complete", `status=${run?.status}`);
    const result = run?.result as {
      totalScore: number;
      band: string;
      stakeholder: { relevant: boolean; pointsEarned: number };
      sections: unknown[];
      competencies: { key: string }[];
      strengths: string[];
      disclaimer: string;
    } | null;
    check("result persisted", Boolean(result));
    if (result) {
      check(`perfect answers score 100 (got ${result.totalScore})`, result.totalScore === 100);
      check("band is strong", result.band === "strong");
      check("stakeholder question counted as relevant", result.stakeholder.relevant === true);
      check(
        `stakeholder points awarded (${result.stakeholder.pointsEarned})`,
        result.stakeholder.pointsEarned === sim.stakeholderPoints
      );
      check("all questions have evidence sections", result.sections.length === sim.questions.length);
      check(
        "competency breakdown complete",
        result.competencies.length === sim.competencies.length
      );
      check("strengths present", result.strengths.length >= 2);
      check("prototype disclaimer present", result.disclaimer.includes("prototype"));
    }

    // Re-running scoring must not change the result (refresh-safe).
    await runMicroScoring(session.id);
    const { data: runs } = await admin
      .from("sim_analysis_runs")
      .select("id, status")
      .eq("session_id", session.id);
    check("re-score does not duplicate runs", (runs || []).length === 1);

    // ---- share token ------------------------------------------------------
    const { data: after } = await admin
      .from("sim_sessions")
      .select("share_token, status")
      .eq("id", session.id)
      .single();
    check("session reached scored state", ["analyzed", "report_ready"].includes(after!.status));
    if (after?.share_token) {
      const { data: shared } = await admin
        .from("sim_sessions")
        .select("id")
        .eq("share_token", after.share_token)
        .single();
      check("share token resolves to session", shared?.id === session.id);
    } else {
      console.log("  note share_token minted on first result-page load (API), not at scoring");
    }

    // ---- feedback -----------------------------------------------------------
    await admin.from("sim_feedback").delete().eq("session_id", session.id);
    const { error: fbErr } = await admin.from("sim_feedback").insert({
      session_id: session.id,
      template_slug: slug,
      role_key: sim.roleKey,
      user_id: candidateId,
      organization_name: "E2E Test Org",
      realism: 4,
      reveals_beyond_resume: "yes",
      useful_evidence: ["Objective correctness", "Reasoning"],
      unrealistic_feedback: "e2e test",
      additions_feedback: "e2e test",
      roles_hired: "Data Analyst",
      pilot_interest: "yes",
    });
    check("feedback persists", !fbErr, fbErr?.message);
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nFull flow verified for all simulations.");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error("E2E test crashed:", err);
  process.exit(1);
});
