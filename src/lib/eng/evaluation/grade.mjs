// Runs outside the sandbox. The sandbox only reports observations; this module
// decides pass/fail against expectations the candidate process never receives.
// Plain ESM so the scenario validation script and the server share one grader.

const TOLERANCE = 0.01;

function read(observation, path) {
  let current = observation;
  for (const part of path.split('.')) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = Array.isArray(current) ? current[Number(part)] : current[part];
  }
  return current;
}

/**
 * @param {{ path: string, equals?: unknown, approx?: number }} check
 * @param {unknown} observation
 */
function checkPasses(check, observation) {
  const actual = read(observation, check.path);
  if ('approx' in check) {
    return { ok: typeof actual === 'number' && Math.abs(actual - check.approx) <= TOLERANCE, actual, expected: check.approx };
  }
  return { ok: actual === check.equals, actual, expected: check.equals };
}

/**
 * Parse the one line the harness writes, found by the per-run nonce.
 * @param {string} stdout
 * @param {string} nonce
 */
export function parseHarnessLine(stdout, nonce) {
  const lines = String(stdout).split('\n').filter((line) => line.startsWith(nonce));
  if (lines.length !== 1) return null;
  try {
    const parsed = JSON.parse(lines[0].slice(nonce.length));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ id: string, title: string, visibility: 'public'|'hidden', phase: 'original'|'update', checks: Array<{path: string, equals?: unknown, approx?: number}> }} probe
 * @param {{ kind: 'exited', stdout: string, nonce: string } | { kind: 'timeout' } | { kind: 'output_limit' }} run
 */
export function gradeProbe(probe, run) {
  const base = { id: probe.id, title: probe.title, visibility: probe.visibility, phase: probe.phase };
  if (run.kind === 'timeout') return { ...base, outcome: 'timeout', failedChecks: [], detail: 'The probe exceeded its time limit.' };
  if (run.kind === 'output_limit') return { ...base, outcome: 'output_limit', failedChecks: [], detail: 'The probe exceeded the output limit.' };
  const parsed = parseHarnessLine(run.stdout, run.nonce);
  if (!parsed) return { ...base, outcome: 'no_result', failedChecks: [], detail: 'The harness did not report a result. The candidate code may have exited the process.' };
  if (typeof parsed.harness_error === 'string') return { ...base, outcome: 'no_result', failedChecks: [], detail: `Harness error: ${parsed.harness_error}` };
  if (typeof parsed.candidate_error === 'string') {
    return {
      ...base,
      outcome: 'candidate_error',
      failedChecks: [],
      detail: parsed.candidate_error.slice(0, 240),
      where: typeof parsed.where === 'string' ? parsed.where.slice(0, 200) : null,
    };
  }
  const failedChecks = [];
  for (const check of probe.checks) {
    const result = checkPasses(check, parsed.observation);
    if (!result.ok) failedChecks.push({ path: check.path, expected: result.expected, actual: result.actual === undefined ? null : result.actual });
  }
  return { ...base, outcome: failedChecks.length === 0 ? 'passed' : 'failed', failedChecks, detail: null };
}

/** @param {Array<{ outcome: string }>} results */
export function summarize(results) {
  const counts = { passed: 0, failed: 0, candidate_error: 0, timeout: 0, output_limit: 0, no_result: 0 };
  for (const result of results) counts[result.outcome] = (counts[result.outcome] || 0) + 1;
  return { total: results.length, ...counts };
}
