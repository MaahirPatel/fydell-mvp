/**
 * Part I acceptance playthroughs — strong + weak.
 * Run: node scripts/accept-meridian.mjs
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
  M.tick(session);
}

function runStrong() {
  const session = M.createMeridianSession({ seed: 'accept-strong-v1' });
  M.viewBrief(session);
  for (const d of session.documents) M.openDocument(session, d.id);
  M.viewFinancials(session);
  M.adjustValuation(session, {
    growth_rate: session.params.forward_growth - 3,
    exit_multiple: session.params.comps_avg_multiple + 0.2,
    discount_rate: 10.5,
  });
  M.addAssumption(
    session,
    `Haircut exit multiple from ${session.params.exit_multiple}x toward comps average ${session.params.comps_avg_multiple}x`,
    'exit_multiple'
  );
  M.addAssumption(
    session,
    `Synergy line double-counts CoC debt paydown overlap — back out duplicated savings`,
    'synergies'
  );
  M.addRisk(
    session,
    'Valuation vs. comps',
    `Exit framing ${session.params.exit_multiple}x is above comps avg ${session.params.comps_avg_multiple}x — material overpay risk if unadjusted.`
  );
  M.addRisk(
    session,
    'Customer concentration',
    `Retention_Cohort.csv shows ${session.params.top10_concentration}% top-10 concentration with 2 declining accounts, contradicting Management_Update "Over 90% of our top-10 customers have been with us 5+ years."`
  );

  advanceTime(session, 8 * 60 + 5);
  M.tick(session);
  let r = M.replyToChat(
    session,
    'The single biggest risk is customer concentration — top accounts are 34% of revenue and two are already declining, which undercuts the management retention claim.'
  );
  if (!r.accepted) throw new Error('D1 reply rejected unexpectedly: ' + r.rejectReason);

  M.setRecommendation(session, {
    category: 'Conditional Proceed',
    reason1: `Value only clears if we haircut the multiple toward ~${session.params.comps_avg_multiple}x comps.`,
    reason2: 'Top-10 concentration and declining accounts contradict the management longevity claim.',
    reason3: 'Synergy bridge appears to double-count CoC debt paydown with G&A savings.',
    diligence:
      'Request the missing mid-market cohort retention file referenced as available on request; diligence the two declining top-10 renewals; confirm synergy bridge removes the overlapping CoC savings before signing.',
  });

  // Ensure D1 fired path even if time advance order differed
  if (!session.d1_fired) {
    advanceTime(session, 8 * 60 + 10);
    M.tick(session);
    M.replyToChat(
      session,
      'The single biggest risk is customer concentration and the retention contradiction in the CSV versus management slides.'
    );
  }

  const evaluation = M.submitMeridian(session);
  return { session, evaluation };
}

function runWeak() {
  const session = M.createMeridianSession({ seed: 'accept-weak-v1' });
  M.viewBrief(session);
  // skim — open only exec brief + management update, NOT retention or comps
  M.openDocument(session, 'exec_brief');
  M.openDocument(session, 'management_update');
  M.viewFinancials(session);
  M.adjustValuation(session, { growth_rate: session.params.forward_growth }); // minimal adjust

  advanceTime(session, 8 * 60 + 5);
  M.tick(session);

  // one-word reply must be rejected
  let r = M.replyToChat(session, 'ok');
  if (r.accepted) throw new Error('Expected D1 to reject generic reply');
  // still blocked
  if (M.canSubmit(session)) throw new Error('Submit should be blocked before substantive D1');

  r = M.replyToChat(session, 'I think the deal looks fine overall and we should move ahead.');
  if (!r.accepted) throw new Error('Substantive-ish reply should pass length check: ' + r.rejectReason);

  // invent retention fact — poor ambiguity
  M.setRecommendation(session, {
    category: 'Proceed',
    reason1: 'Strong franchise.',
    reason2: 'Synergies will be realized.',
    reason3: 'Compelling opportunity for shareholders.',
    diligence:
      'Net retention is 96% across the book so concentration is not a real issue for underwriting this deal at the offer price.',
  });

  // may still miss assumptions/risks — add bare minimum to allow submit after D1
  M.addAssumption(session, 'I think its fine', 'general');
  M.addRisk(session, 'Market/macro', 'Market risk exists in any deal.');

  const missing = M.getMissing(session).filter((m) => m.blocking);
  if (missing.length) {
    // fill diligence already set; ensure reasons ok
  }
  if (!M.canSubmit(session)) {
    throw new Error('Weak path still blocked: ' + M.getMissing(session).filter((m)=>m.blocking).map((m)=>m.label).join('; '));
  }

  const evaluation = M.submitMeridian(session);
  return { session, evaluation };
}

function assertStrong(ev) {
  const caught = ev.planted_errors.filter((e) => e.status === 'caught').length;
  if (caught !== 3) throw new Error(`Strong: expected 3 caught, got ${caught}`);
  if (ev.ambiguity.score !== 'good') throw new Error(`Strong: ambiguity expected good, got ${ev.ambiguity.score}`);
  if (ev.benchmark.status !== 'insufficient_data') throw new Error('Strong: bad benchmark');
}

function assertWeak(ev) {
  const missed = ev.planted_errors.filter((e) => e.status === 'missed').length;
  if (missed !== 3) throw new Error(`Weak: expected 3 missed, got ${missed}: ${JSON.stringify(ev.planted_errors)}`);
  if (ev.ambiguity.score !== 'poor') throw new Error(`Weak: ambiguity expected poor, got ${ev.ambiguity.score}`);
  if (ev.benchmark.status !== 'insufficient_data') throw new Error('Weak: bad benchmark');
}

const mode = process.argv[2] || 'both';
const results = {};

if (mode === 'strong' || mode === 'both') {
  const { evaluation } = runStrong();
  assertStrong(evaluation);
  results.strong = evaluation;
  console.log('\n========== STRONG PLAYTHROUGH — FULL EvaluationResult ==========\n');
  console.log(JSON.stringify(evaluation, null, 2));
  console.log('\n----- Report -----\n');
  console.log(M.formatMeridianReport(evaluation));
}

if (mode === 'weak' || mode === 'both') {
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
console.log('\nACCEPT MERIDIAN OK');
