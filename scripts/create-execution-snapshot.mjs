import { Sandbox } from '@vercel/sandbox';
import { readFile, writeFile } from 'node:fs/promises';

// Operator setup only. No candidate code or application secrets enter this VM.
const sandbox = await Sandbox.create({ persistent: false, timeout: 60000, networkPolicy: 'deny-all', env: {}, ports: [] });
try {
  const version = await sandbox.runCommand('python3', ['--version']);
  if (version.exitCode !== 0) throw new Error('Python is unavailable in the base image');
  // Snapshots expire by default; a missing snapshot would turn every run into an infrastructure error.
  const snapshot = await sandbox.snapshot({ expiration: 0 });
  const id = snapshot.snapshotId;
  if (!id) throw new Error('Snapshot was not created');
  let local = await readFile('.env.local', 'utf8');
  for (const [key, value] of Object.entries({ FYDELL_EXECUTION_PROVIDER: 'vercel', FYDELL_EXECUTION_SNAPSHOT_ID: id })) {
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    local = pattern.test(local) ? local.replace(pattern, `${key}=${value}`) : `${local.trimEnd()}\n${key}=${value}\n`;
  }
  await writeFile('.env.local', local);
  console.log(`Created versioned Python environment ${id}. Local execution is configured.`);
} finally { await sandbox.stop().catch(() => undefined); }
