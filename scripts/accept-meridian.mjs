/**
 * Part I — FP&A Forecast Review acceptance playthroughs.
 * Strong path: catches all 3 concerns, good ambiguity handling → Advance.
 * Weak path:  misses all 3 concerns, poor ambiguity handling → Reject.
 *
 * Run: node scripts/accept-meridian.mjs
 * Or:  npm run accept:meridian
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSync } from 'esbuild';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outFile = path.join(root, 'sim-engine.cjs');

buildSync({
  entryPoints: [path.join(root, 'js/sim/index.js')],
  bundle: true,
  format: 'cjs',
  outfile: outFile,
  platform: 'node',
  target: 'node18',
  loader: { '.ts': 'ts', '.json': 'json' },
});

const require = createRequire(import.meta.url);
const eng = require(outFile);
const F = eng.FydellSim || eng.default || eng;
const M = F.Meridian;

function advanceTime(session, sec) {
  session.started_at = Date.now() - sec * 1000;
  M.syncElapsed(session);
}

// ── STRONG PLAYTHROUGH ────────────────────────────────────────────────────────
// VP Finance who catches all 3 concerns, requests missing data → Advance

function runStrong() {
  const session = M.createMeridianSession({ seed: 'accept-strong-fpa-v1' });
  const p = session.params;

  // Stage 1: Brief
  M.viewBrief(session);

  // Stage 2: Data Room — open all 5 docs
  for (const doc of session.documents) {
    M.openDocument(session, doc.id);
  }

  // Stage 3: Forecast Model — stress-test by lowering growth and margin
  M.viewFinancials(session);
  M.adjustValuation(session, {
    growth_rate: p.q3_revenue_growth - 3,      // lower growth to reflect churn concern
    exit_multiple: p.gross_margin - 3,           // lower margin to reflect opex compression
    discount_rate: p.opex_growth + 2,            // raise opex scenario (conservative)
  });

  // Stage 4: Assumptions Review
  // Concern 1: growth vs churn mismatch
  M.addAssumption(
    session,
    `${p.q3_revenue_growth}% revenue growth at ${p.churn_rate}% gross churn requires net expansion > churn — plan does not show this pipeline math. Flagging as optimistic.`,
    'revenue_growth'
  );
  // Concern 2: opex/margin compression
  M.addAssumption(
    session,
    `Opex growing ${p.opex_growth}% vs revenue ${p.q3_revenue_growth}% compresses EBITDA margin by ~${Math.round((p.opex_growth - p.q3_revenue_growth) / 2)}pp — plan treats margin as flat, which is unsupported.`,
    'margins'
  );

  // Advance to 8.5 min → Alex Kim (CFO) A1 fires
  advanceTime(session, 8 * 60 + 30);
  M.tick(session);

  // Substantive reply to Alex
  let r = M.replyToChat(
    session,
    `Biggest concern is the churn rate — ${p.churn_rate}% gross churn with a ${p.q3_revenue_growth}% growth target requires significant net expansion that is not in the plan. Without that math, the growth case is not credible.`
  );
  if (!r.accepted) throw new Error('Strong: D1 reply rejected unexpectedly: ' + r.rejectReason);

  // Advance to 12.5 min → Jordan Lee (VP Sales) J1 fires (sales cycle +30 days)
  advanceTime(session, 12 * 60 + 30);
  M.tick(session);

  // Verify M1 (J1) fired
  if (!session.used_trigger_ids.includes('J1')) {
    throw new Error('Strong: J1 (Jordan VP Sales update) did not fire at 12.5 min');
  }

  // Concern 3: ramp/cycle mismatch (post manager update)
  M.addRisk(
    session,
    'Revenue risk — hiring plan',
    `After VP Sales update: sales cycles extended to ${p.updated_sales_cycle_days} days. Q3 hires (July start, ${p.new_hire_ramp_days}-day ramp + ${p.updated_sales_cycle_days}-day cycle = ${p.new_hire_ramp_days + p.updated_sales_cycle_days} days) cannot contribute Q3 revenue — uplift belongs in Q4.`
  );
  M.addRisk(
    session,
    'Churn vs. growth',
    `${p.churn_rate}% gross churn rate is ${Math.round((p.churn_rate - p.industry_churn_avg) * 10) / 10}pp above peer average. Reaching ${p.q3_revenue_growth}% net growth requires ~${Math.ceil(p.q3_revenue_growth + p.churn_rate)}% gross new logo + expansion — pipeline is not shown in the plan.`
  );
  M.addRisk(
    session,
    'Margin compression',
    `Opex ${p.opex_growth}% growth vs revenue ${p.q3_revenue_growth}% will shrink EBITDA margin by ~${Math.round((p.opex_growth - p.q3_revenue_growth) / 2)}pp in Q3. Approve the headcount only if the margin plan is revised.`
  );

  // Final Recommendation: Revise
  M.setRecommendation(session, {
    category: 'Revise',
    reason1: `${p.q3_revenue_growth}% growth target is not credible given ${p.churn_rate}% gross churn — plan lacks the pipeline math to offset attrition.`,
    reason2: `Opex at ${p.opex_growth}% vs revenue at ${p.q3_revenue_growth}% compresses EBITDA margin ~${Math.round((p.opex_growth - p.q3_revenue_growth) / 2)}pp; plan shows stable margin.`,
    reason3: `After VP Sales update (sales cycle +30 days), Q3 new hires cannot contribute Q3 revenue — hiring revenue uplift shifts to Q4 at earliest.`,
    diligence:
      `Verify: (1) request ARR breakdown for two at-risk enterprise renewals from account managers before approving budget; (2) get net retention math behind the ${p.q3_revenue_growth}% growth target; (3) revise hiring plan to show Q4 pipeline contribution given ${p.updated_sales_cycle_days}-day extended cycle.`,
  });

  const evaluation = M.submitMeridian(session);
  return { session, evaluation };
}

// ── WEAK PLAYTHROUGH ──────────────────────────────────────────────────────────
// VP Finance who skims docs, misses all 3 concerns, invents ARR data → Reject

function runWeak() {
  const session = M.createMeridianSession({ seed: 'accept-weak-fpa-v1' });
  const p = session.params;

  // Stage 1: Brief
  M.viewBrief(session);

  // Stage 2: Data Room — skim only 2 docs, skip churn_update and hiring_plan
  M.openDocument(session, 'cfo_brief');
  M.openDocument(session, 'revenue_forecast');
  // Deliberately skip: churn_update, hiring_plan, concentration_note

  // Stage 3: Minimal model adjustment — no stress-test
  M.viewFinancials(session);
  M.adjustValuation(session, {
    growth_rate: p.q3_revenue_growth,   // no change
    exit_multiple: p.gross_margin,       // no change
    discount_rate: p.opex_growth,        // no change
  });

  // Advance to 8.5 min → Alex Kim A1 fires
  advanceTime(session, 8 * 60 + 30);
  M.tick(session);

  // One-word reply must be rejected
  let r = M.replyToChat(session, 'ok');
  if (r.accepted) throw new Error('Weak: expected D1 to reject generic one-word reply');

  // Submit should still be blocked (no substantive D1 reply yet)
  if (M.canSubmit(session)) throw new Error('Weak: submit should be blocked before substantive D1 reply');

  // Generic substantive reply — no specific concern identified
  r = M.replyToChat(session, 'I think the forecast looks solid overall and we should proceed with the Q3 plan as proposed.');
  if (!r.accepted) throw new Error('Weak: substantive-length reply should pass: ' + r.rejectReason);

  // Do NOT advance to 12 min → J1 (Jordan VP Sales) never fires → concern 3 undetectable

  // Generic assumption — no specific numbers or FP&A concerns
  M.addAssumption(session, 'Management plan looks reasonable overall', 'general');

  // Generic risk — no specific FP&A concern
  M.addRisk(session, 'Market risk', 'Market conditions could affect business performance.');

  // Poor recommendation: Go with vague reasons and invented ARR figure (poor ambiguity)
  M.setRecommendation(session, {
    category: 'Go',
    reason1: 'Strong franchise with experienced management team.',
    reason2: 'Synergies will be realized and the plan is a compelling opportunity.',
    reason3: 'The Q3 hiring investment positions us well for year-end performance.',
    diligence:
      'We will lose approximately $2.3M ARR from the two at-risk enterprise renewals but this is manageable given the current 9-month cash runway.',
  });

  // Verify gates pass (no blocking items)
  const missing = M.getMissing(session).filter((m) => m.blocking);
  if (missing.length) {
    throw new Error('Weak: still blocked at submit: ' + missing.map((m) => m.label).join('; '));
  }

  const evaluation = M.submitMeridian(session);
  return { session, evaluation };
}

// ── Assertions ────────────────────────────────────────────────────────────────

function assertStrong(ev) {
  const caught = ev.planted_errors.filter((e) => e.status === 'caught').length;
  const missed = ev.planted_errors.filter((e) => e.status === 'missed');
  if (caught !== 3) {
    throw new Error(
      `Strong: expected 3 caught, got ${caught}.\nMissed: ${JSON.stringify(missed, null, 2)}`
    );
  }
  if (ev.ambiguity.score !== 'good') {
    throw new Error(
      `Strong: ambiguity expected 'good', got '${ev.ambiguity.score}'.\nRationale: ${ev.ambiguity.rationale}\nEvidence: ${JSON.stringify(ev.ambiguity.evidence)}`
    );
  }
  if (ev.executive_recommendation !== 'Advance') {
    throw new Error(`Strong: expected executive_recommendation 'Advance', got '${ev.executive_recommendation}'`);
  }
  if (ev.benchmark.status !== 'insufficient_data') {
    throw new Error('Strong: bad benchmark status');
  }
  if (!ev.interview_questions || !ev.interview_questions.length) {
    throw new Error('Strong: expected interview_questions to be populated');
  }
  console.log(`  ✓ Strong: caught=${caught}/3, ambiguity=${ev.ambiguity.score}, recommendation=${ev.executive_recommendation}`);
}

function assertWeak(ev) {
  const missed = ev.planted_errors.filter((e) => e.status === 'missed');
  if (missed.length !== 3) {
    throw new Error(
      `Weak: expected 3 missed, got ${missed.length}.\nDetails: ${JSON.stringify(ev.planted_errors, null, 2)}`
    );
  }
  if (ev.ambiguity.score !== 'poor') {
    throw new Error(
      `Weak: ambiguity expected 'poor', got '${ev.ambiguity.score}'.\nRationale: ${ev.ambiguity.rationale}\nEvidence: ${JSON.stringify(ev.ambiguity.evidence)}`
    );
  }
  if (ev.executive_recommendation !== 'Reject') {
    throw new Error(`Weak: expected executive_recommendation 'Reject', got '${ev.executive_recommendation}'`);
  }
  if (ev.benchmark.status !== 'insufficient_data') {
    throw new Error('Weak: bad benchmark status');
  }
  console.log(`  ✓ Weak: missed=${missed.length}/3, ambiguity=${ev.ambiguity.score}, recommendation=${ev.executive_recommendation}`);
}

// ── Run ───────────────────────────────────────────────────────────────────────

const mode = process.argv[2] || 'both';
const results = {};

console.log('\n=== Project Meridian — FP&A Forecast Review — Acceptance Tests ===\n');

if (mode === 'strong' || mode === 'both') {
  console.log('Running STRONG playthrough...');
  const { evaluation } = runStrong();
  assertStrong(evaluation);
  results.strong = evaluation;
  console.log('\n========== STRONG PLAYTHROUGH — FULL EvaluationResult ==========\n');
  console.log(JSON.stringify(evaluation, null, 2));
  console.log('\n----- Report -----\n');
  console.log(M.formatMeridianReport(evaluation));
}

if (mode === 'weak' || mode === 'both') {
  console.log('\nRunning WEAK playthrough...');
  const { evaluation } = runWeak();
  assertWeak(evaluation);
  results.weak = evaluation;
  console.log('\n========== WEAK PLAYTHROUGH — FULL EvaluationResult ==========\n');
  console.log(JSON.stringify(evaluation, null, 2));
  console.log('\n----- Report -----\n');
  console.log(M.formatMeridianReport(evaluation));
}

fs.writeFileSync(
  path.join(root, 'scripts', 'accept-meridian-last.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n✓ ACCEPT MERIDIAN OK\n');
