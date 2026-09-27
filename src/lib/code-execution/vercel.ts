import 'server-only';
import { Sandbox } from '@vercel/sandbox';
import { Writable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';
import { grade, executionInputs, harness, SUITE_VERSION } from '../../../services/code-execution/runner.mjs';
import type { ExecutionResult } from './contract';

export async function executeOnVercel(source: string): Promise<ExecutionResult> {
  const snapshotId = process.env.FYDELL_EXECUTION_SNAPSHOT_ID;
  if (!snapshotId) throw new Error('A versioned Python sandbox snapshot must be configured before running code.');
  const base: ExecutionResult = {
    executionId: randomUUID(), sourceHash: createHash('sha256').update(source).digest('hex'),
    suiteVersion: SUITE_VERSION, environmentVersion: `vercel-snapshot:${snapshotId}`,
    completedAt: new Date().toISOString(), status: 'infrastructure_error', tests: [],
  };
  // Never forward the application's env, clone its repository, or mount storage.
  const sandbox = await Sandbox.create({ source: { type: 'snapshot', snapshotId }, persistent: false,
    timeout: 45000, resources: { vcpus: 1 }, networkPolicy: 'deny-all', env: {}, ports: [] });
  let output = '', bytes = 0, exceeded = false;
  const sink = (capture: boolean) => new Writable({ write(chunk, _encoding, callback) {
    bytes += chunk.length;
    if (bytes > 65536) { exceeded = true; void sandbox.stop().catch(() => undefined); }
    else if (capture) output += chunk.toString();
    callback();
  } });
  try {
    const user = await sandbox.createUser('candidate');
    await user.writeFiles([{ path: 'input.json', content: JSON.stringify(executionInputs(source)) }]);
    const limits = `import resource\nresource.setrlimit(resource.RLIMIT_AS,(268435456,268435456))\nresource.setrlimit(resource.RLIMIT_CPU,(5,5))\nresource.setrlimit(resource.RLIMIT_NPROC,(32,32))\nresource.setrlimit(resource.RLIMIT_FSIZE,(65536,65536))\n`;
    const program = limits + harness.replace('json.load(sys.stdin)', "json.load(open('input.json'))");
    const command = await user.runCommand({ cmd: 'python3', args: ['-I', '-B', '-c', program],
      timeoutMs: 10000, stdout: sink(true), stderr: sink(false) });
    if (exceeded) return { ...base, status: 'output_limit' };
    if (command.exitCode !== 0) return { ...base, status: command.exitCode === 137 || command.exitCode === 124 ? 'timeout' : 'runtime_error' };
    try { return { ...base, completedAt: new Date().toISOString(), status: 'completed', tests: grade(output) }; }
    catch { return { ...base, status: 'runtime_error' }; }
  } catch {
    return { ...base, status: exceeded ? 'output_limit' : 'infrastructure_error' };
  } finally {
    // The VM also has a provider-enforced 45-second lifetime if cleanup fails.
    await sandbox.stop().catch(() => undefined);
    await sandbox.delete().catch(() => undefined);
  }
}
