// Operator setup for FYDELL_EXECUTION_PROVIDER=vercel.
//
// Creates a versioned Vercel Sandbox snapshot with Python and the pinned test
// packages that engineering scenarios declare (.fydell/evaluation.json ->
// runtime.packages). Network access is used only here, during setup; every
// candidate run restores this snapshot with networking denied. No candidate
// code, application secrets or repository contents enter the VM.
//
// Usage (with Vercel OIDC credentials loaded, e.g. `vercel env pull`):
//   node --env-file=.env.local scripts/create-engineering-runtime-snapshot.mjs
// Then set FYDELL_ENGINEERING_SNAPSHOT_ID and FYDELL_EXECUTION_PROVIDER=vercel
// in the deployment's environment.

import { Sandbox } from '@vercel/sandbox';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const packages = new Set();
for (const dir of readdirSync('scenarios')) {
  const descriptor = join('scenarios', dir, '.fydell', 'evaluation.json');
  if (!existsSync(descriptor)) continue;
  for (const pkg of JSON.parse(readFileSync(descriptor, 'utf8')).runtime.packages) {
    if (!/^[A-Za-z0-9_.-]+==[A-Za-z0-9_.-]+$/.test(pkg)) throw new Error(`Package must be pinned exactly: ${pkg}`);
    packages.add(pkg);
  }
}
if (packages.size === 0) throw new Error('No engineering scenario declares runtime packages');

const sandbox = await Sandbox.create({ persistent: false, timeout: 10 * 60 * 1000, env: {}, ports: [] });
try {
  const run = async (cmd, args) => {
    const result = await sandbox.runCommand(cmd, args);
    if (result.exitCode !== 0) throw new Error(`${cmd} ${args.join(' ')} failed with ${result.exitCode}`);
    return (await result.stdout()).trim();
  };
  console.log(await run('python3', ['--version']));
  await run('python3', ['-m', 'pip', 'install', '--no-cache-dir', ...packages]);
  for (const pkg of packages) {
    const [name, version] = pkg.split('==');
    const installed = await run('python3', ['-c', `import importlib.metadata as m; print(m.version(${JSON.stringify(name)}))`]);
    if (installed !== version) throw new Error(`${name} installed ${installed}, expected ${version}`);
  }
  const snapshot = await sandbox.snapshot();
  if (!snapshot.snapshotId) throw new Error('Snapshot was not created');
  console.log(`Created engineering runtime snapshot ${snapshot.snapshotId} with ${[...packages].join(', ')}.`);
  console.log('Set FYDELL_ENGINEERING_SNAPSHOT_ID to this value and FYDELL_EXECUTION_PROVIDER=vercel.');
} finally {
  await sandbox.stop().catch(() => undefined);
}
