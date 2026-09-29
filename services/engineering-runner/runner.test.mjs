// Contract tests for the engineering runner. The Docker launcher is faked, so
// these do NOT prove container isolation; see README.md for the live checks.
// Run: node --test services/engineering-runner/runner.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOTSTRAP, dockerArgs, runPayload, unsafePathReason, validateRunRequest } from './runner.mjs';

const image = `registry.example/fydell-runner@sha256:${'a'.repeat(64)}`;
const good = {
  files: { 'webhooks/retry.py': 'x = 1\n', 'tests/test_a.py': 'def test_a():\n    assert True\n' },
  pytestArgs: ['-q', '-p', 'no:cacheprovider', '--junitxml={RESULT_FILE}', 'tests'],
  timeoutSeconds: 60,
  maxOutputBytes: 65536,
  nonce: 'f'.repeat(32),
};

test('accepts a well-formed request', () => {
  assert.deepEqual(validateRunRequest(good).files, good.files);
});

test('rejects unsafe paths', () => {
  for (const p of ['../x.py', '/etc/passwd', 'a\\b.py', 'a//b.py', 'a/./b.py', 'x\0y']) {
    assert.ok(unsafePathReason(p), p);
    assert.throws(() => validateRunRequest({ ...good, files: { [p]: '' } }));
  }
});

test('rejects shell-ish or oversized arguments and limits', () => {
  assert.throws(() => validateRunRequest({ ...good, pytestArgs: ['-q; rm -rf /'] }));
  assert.throws(() => validateRunRequest({ ...good, timeoutSeconds: 10_000 }));
  assert.throws(() => validateRunRequest({ ...good, maxOutputBytes: 50 * 1024 * 1024 }));
  assert.throws(() => validateRunRequest({ ...good, nonce: 'short' }));
});

test('docker args isolate the run', () => {
  const args = dockerArgs('fydell-run-x', image);
  for (const flag of ['--network=none', '--read-only', '--cap-drop=ALL', '--runtime=runsc', '--user=65534:65534', '--pull=never', '--security-opt=no-new-privileges']) {
    assert.ok(args.includes(flag), flag);
  }
  assert.ok(!args.some((a) => a.startsWith('-v') || a.startsWith('--volume') || a.startsWith('--mount')), 'no host mounts');
  assert.ok(args.includes(BOOTSTRAP), 'runs the trusted bootstrap from this service, not from the request');
});

test('refuses an image that is not digest-pinned', () => {
  assert.throws(() => dockerArgs('x', 'python:3.12-slim'));
});

test('always removes the container, even when the run fails', async () => {
  const calls = [];
  const launcher = async (args) => {
    calls.push(args);
    return args[0] === 'rm' ? { ok: true, stdout: '' } : { ok: false, stdout: '', overflow: false };
  };
  await assert.rejects(runPayload(validateRunRequest(good), image, launcher));
  assert.equal(calls.at(-1)[0], 'rm');
  assert.equal(calls.at(-1)[2], calls[0][calls[0].indexOf('--name') + 1]);
});

test('returns stdout for the app to parse', async () => {
  const launcher = async (args) => ({ ok: true, stdout: args[0] === 'rm' ? '' : 'FYDELL-RESULT:abc:xyz\n' });
  const out = await runPayload(validateRunRequest(good), image, launcher);
  assert.equal(out.stdout, 'FYDELL-RESULT:abc:xyz\n');
});
