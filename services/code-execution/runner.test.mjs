import test from 'node:test';
import assert from 'node:assert/strict';
import { dockerArgs, execute, grade } from './runner.mjs';
const image = `python@sha256:${'a'.repeat(64)}`;

test('container requires pinned image and isolation controls', () => {
  assert.throws(() => dockerArgs('test', 'python:latest'));
  const args = dockerArgs('test', image);
  for (const flag of ['--runtime=runsc', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--memory=128m', '--pids-limit=32', '--user=65534:65534']) assert.ok(args.includes(flag));
  assert.ok(!args.some(arg => arg.includes('docker.sock')));
});
test('authoritative grading rejects forged pass flags and malformed output', () => {
  assert.throws(() => grade('{"passed":true}'));
  const allWrong = grade(JSON.stringify(Array.from({ length: 6 }, () => [])));
  assert.equal(allWrong.filter(t => t.passed).length, 0);
});
test('candidate output is graded outside the container and linked to source', async () => {
  const calls = [];
  const result = await execute('trusted test source', image, async (args, input) => {
    calls.push(args);
    if (args[0] === 'rm') return { code: 0 };
    const payload = JSON.parse(input);
    assert.equal(payload.expected, undefined);
    const output = payload.inputs.map(events => {
      const accepted = new Set();
      return events.map(e => {
        const valid = e.authorized === true && typeof e.amount === 'number' && Number.isFinite(e.amount) && e.amount > 0;
        const status = !valid ? 'rejected' : accepted.has(e.id) ? 'duplicate' : 'accepted';
        if (status === 'accepted') accepted.add(e.id);
        return { id: e.id, status };
      });
    });
    return { code: 0, output: JSON.stringify(output) };
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.tests.filter(t => t.passed).length, 6);
  assert.match(result.sourceHash, /^[a-f0-9]{64}$/);
  assert.equal(calls.at(-1)[0], 'rm');
});
for (const [run, status] of [[{ code: 125 }, 'infrastructure_error'], [{ code: 1 }, 'runtime_error'], [{ reason: 'timeout' }, 'timeout'], [{ reason: 'output_limit' }, 'output_limit']]) {
  test(`${status} is not recorded as failed test evidence; cleanup still runs`, async () => {
    const calls = [];
    const result = await execute('source', image, async args => { calls.push(args); return run; });
    assert.equal(result.status, status);
    assert.deepEqual(result.tests, []);
    assert.equal(calls.at(-1)[0], 'rm');
  });
}
