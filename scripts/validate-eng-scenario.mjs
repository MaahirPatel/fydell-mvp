// SCEN-03: run every fixture (reference, alternative, defective, partial,
// adversarial) through the real harness and the real grader, locally.
// Fixtures are maintainer-authored code, so a local interpreter is acceptable
// here. Candidate submissions never run this way.
//   node scripts/validate-eng-scenario.mjs
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { SCENARIO_DIR, readTree } from './eng-scenario-lib.mjs';
import { gradeProbe, summarize } from '../src/lib/eng/evaluation/grade.mjs';

const PYTHON = process.env.FYDELL_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const expectations = JSON.parse(await readFile(path.join(SCENARIO_DIR, 'evaluator', 'expectations.json'), 'utf8'));
const { variants } = JSON.parse(await readFile(path.join(SCENARIO_DIR, 'fixtures', 'variants.json'), 'utf8'));
const starter = await readTree(path.join(SCENARIO_DIR, 'starter'));
const allIds = expectations.probes.map((p) => p.id);
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`  FAIL ${message}`);
}

// The starter must never carry evaluator material.
for (const name of Object.keys(starter)) {
  if (/hidden|harness|expectation|reference|fixture/i.test(name)) fail(`starter contains evaluator-looking file ${name}`);
}
const harnessSource = await readFile(path.join(SCENARIO_DIR, 'evaluator', 'harness.py'), 'utf8');
for (const [name, content] of Object.entries(starter)) {
  if (content.includes('dlv_probe_7f3a')) fail(`starter file ${name} leaks a harness identifier`);
}

async function materialize(variant) {
  const files = { ...starter };
  if (variant.overlay) Object.assign(files, await readTree(path.join(SCENARIO_DIR, 'fixtures', variant.overlay)));
  for (const edit of variant.edits) {
    const source = files[edit.file];
    const count = source ? source.split(edit.find).length - 1 : 0;
    if (count !== 1) throw new Error(`${variant.id}: edit target must occur exactly once in ${edit.file} (found ${count})`);
    files[edit.file] = source.replace(edit.find, edit.replace);
  }
  const dir = await mkdtemp(path.join(os.tmpdir(), `fydell-${variant.id}-`));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(dir, ...name.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}

const harnessDir = await mkdtemp(path.join(os.tmpdir(), 'fydell-harness-'));
const harnessPath = path.join(harnessDir, 'harness.py');
await writeFile(harnessPath, harnessSource);

const minimalEnv = { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, PYTHONDONTWRITEBYTECODE: '1' };

for (const variant of variants) {
  console.log(`\n${variant.id}: ${variant.purpose}`);
  const dir = await materialize(variant);
  try {
    const results = [];
    for (const probe of expectations.probes) {
      const nonce = `@@${randomBytes(8).toString('hex')}@@`;
      const proc = spawnSync(PYTHON, ['-I', '-B', harnessPath, probe.id, nonce], {
        cwd: dir, env: minimalEnv, timeout: 10000, maxBuffer: 65536, encoding: 'utf8',
      });
      const run = proc.error?.code === 'ETIMEDOUT' ? { kind: 'timeout' }
        : proc.error?.code === 'ENOBUFS' ? { kind: 'output_limit' }
        : { kind: 'exited', stdout: proc.stdout || '', nonce };
      results.push(gradeProbe(probe, run));
    }
    const passed = new Set(results.filter((r) => r.outcome === 'passed').map((r) => r.id));
    const mustPass = variant.mustPass === 'all' ? allIds
      : Array.isArray(variant.mustPass) ? variant.mustPass
      : allIds.filter((id) => !variant.mustFail.includes(id));
    for (const id of allIds) {
      const result = results.find((r) => r.id === id);
      if (mustPass.includes(id) && !passed.has(id)) fail(`${variant.id} ${id} should pass but was ${result.outcome}${result.failedChecks.length ? ` ${JSON.stringify(result.failedChecks)}` : ''}${result.detail ? ` (${result.detail})` : ''}`);
      if (!mustPass.includes(id) && passed.has(id)) fail(`${variant.id} ${id} should not pass`);
    }
    const s = summarize(results);
    console.log(`  probes: ${s.passed} passed, ${s.failed} failed, ${s.candidate_error} candidate errors, ${s.no_result} no result, ${s.timeout} timeouts`);

    if (variant.id === 'reference' || variant.id === 'alternative' || variant.id === 'starter') {
      const unit = spawnSync(PYTHON, ['-m', 'unittest', '-q'], { cwd: dir, env: minimalEnv, timeout: 20000, encoding: 'utf8' });
      const ok = unit.status === 0;
      const expectOk = variant.id !== 'starter';
      console.log(`  public unittest: ${ok ? 'pass' : 'fail'} (expected ${expectOk ? 'pass' : 'fail'})`);
      if (ok !== expectOk) fail(`${variant.id} public unittest ${ok ? 'passed' : 'failed'} unexpectedly: ${(unit.stderr || '').slice(-400)}`);
    }
    if (variant.id === 'starter') {
      const pre = spawnSync(PYTHON, ['preflight.py'], { cwd: dir, env: minimalEnv, timeout: 20000, encoding: 'utf8' });
      const code = /Setup code: (HWR-[0-9A-F]{8})/.exec(pre.stdout || '')?.[1];
      console.log(`  preflight: ${code ? `printed ${code}` : 'no code'}`);
      if (!code) fail(`starter preflight did not print a setup code: ${pre.stdout}${pre.stderr}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
await rm(harnessDir, { recursive: true, force: true });

console.log(failures.length ? `\n${failures.length} scenario validation failure(s).` : '\nScenario validation passed for every fixture.');
process.exit(failures.length ? 1 : 0);
