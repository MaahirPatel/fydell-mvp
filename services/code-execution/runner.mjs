import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

export const SUITE_VERSION = 'workflow-handler-v1';
// Expected outcomes stay in the control process, outside candidate containers.
const cases = [
  { id: 'valid', title: 'Accept an authorized request', input: [{ id: 'a', authorized: true, amount: 12 }], expected: [{ id: 'a', status: 'accepted' }] },
  { id: 'denied', title: 'Reject unauthorized requests', input: [{ id: 'b', authorized: false, amount: 12 }], expected: [{ id: 'b', status: 'rejected' }] },
  { id: 'duplicate', title: 'Prevent duplicate writes', input: [{ id: 'c', authorized: true, amount: 3 }, { id: 'c', authorized: true, amount: 3 }], expected: [{ id: 'c', status: 'accepted' }, { id: 'c', status: 'duplicate' }] },
  { id: 'validation', title: 'Validate malformed amounts', input: [{ id: 'd', authorized: true, amount: -1 }, { id: 'e', authorized: true, amount: '12' }], expected: [{ id: 'd', status: 'rejected' }, { id: 'e', status: 'rejected' }] },
  { id: 'strict', title: 'Check authorization and numeric types strictly', input: [{ id: 'f', authorized: 'true', amount: 1 }, { id: 'g', authorized: true, amount: true }], expected: [{ id: 'f', status: 'rejected' }, { id: 'g', status: 'rejected' }] },
  { id: 'retry', title: 'Allow a corrected request after rejection', input: [{ id: 'h', authorized: false, amount: 1 }, { id: 'h', authorized: true, amount: 1 }], expected: [{ id: 'h', status: 'rejected' }, { id: 'h', status: 'accepted' }] },
];

export const harness = `import sys,json,contextlib,io
p=json.load(sys.stdin)
scope={}
with contextlib.redirect_stdout(io.StringIO()):
 exec(p['source'],scope)
 results=[scope['handle_events'](events) for events in p['inputs']]
print(json.dumps(results,allow_nan=False))`;

export function executionInputs(source) { return { source, inputs: cases.map(c => c.input) }; }

export function dockerArgs(name, image) {
  if (!/^.+@sha256:[a-f0-9]{64}$/.test(image ?? '')) throw new Error('A digest-pinned FYDELL_RUNNER_IMAGE is required');
  return ['run', '--rm', '--pull=never', '--runtime=runsc', '--name', name, '--network=none', '--read-only',
    '--cap-drop=ALL', '--security-opt=no-new-privileges', '--user=65534:65534',
    '--memory=128m', '--memory-swap=128m', '--cpus=0.5', '--pids-limit=32',
    '--ulimit=nofile=64:64', '--ulimit=fsize=65536:65536', '--log-driver=none',
    '--tmpfs=/tmp:rw,noexec,nosuid,size=8m', '-i', image, 'python', '-I', '-B', '-c', harness];
}

function command(args, input, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let output = '', bytes = 0, reason = null;
    const timer = setTimeout(() => { reason = 'timeout'; child.kill(); }, timeoutMs);
    child.stdout.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 65536) { reason = 'output_limit'; child.kill(); }
      else output += chunk.toString();
    });
    child.stderr.on('data', chunk => { bytes += chunk.length; if (bytes > 65536) { reason = 'output_limit'; child.kill(); } });
    child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); resolve({ reason: 'infrastructure_error', code: -1, output: '' }); });
    child.on('close', code => { clearTimeout(timer); resolve({ reason, code, output }); });
    child.stdin.end(input);
  });
}

export function grade(output) {
  const values = JSON.parse(output);
  if (!Array.isArray(values) || values.length !== cases.length) throw new Error('Invalid program output');
  return cases.map((test, index) => ({ id: test.id, title: test.title, passed:
    Array.isArray(values[index]) && values[index].length === test.expected.length &&
    values[index].every((row, i) => row && Object.keys(row).length === 2 && row.id === test.expected[i].id && row.status === test.expected[i].status) }));
}

export async function execute(source, image, launch = command) {
  const name = `fydell-run-${randomUUID()}`;
  const result = { executionId: randomUUID(), sourceHash: createHash('sha256').update(source).digest('hex'),
    suiteVersion: SUITE_VERSION, environmentVersion: image, completedAt: new Date().toISOString(), status: 'infrastructure_error', tests: [] };
  const args = dockerArgs(name, image);
  try {
    const run = await launch(args, JSON.stringify({ source, inputs: cases.map(c => c.input) }));
    if (run.reason) return { ...result, status: run.reason };
    if (run.code !== 0) return { ...result, status: [125, 126, 127, -1].includes(run.code) ? 'infrastructure_error' : 'runtime_error' };
    try { return { ...result, status: 'completed', tests: grade(run.output) }; }
    catch { return { ...result, status: 'runtime_error' }; }
  } finally {
    // Killing the docker client does not stop its container. Always remove it.
    await launch(['rm', '--force', name], '', 5000);
  }
}
