import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';

export const SCENARIO_KEY = 'backend-webhook-retry';
export const SCENARIO_DIR = path.join(process.cwd(), 'scenarios', SCENARIO_KEY);
export const STARTER_ROOT = 'harbor-webhooks';
// Fixed timestamp so the same files always produce the same archive bytes.
// fflate encodes DOS timestamps from local-time getters, so the date is built
// from local fields to keep the archive bytes identical in every timezone.
export const ZIP_MTIME = new Date(2026, 8, 27, 0, 0, 0);

export async function readTree(root) {
  const out = {};
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__') continue;
        await walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        out[rel] = (await readFile(full, 'utf8')).replace(/\r\n/g, '\n');
      }
    }
  }
  await walk(root);
  return out;
}

export function buildStarterZip(files) {
  const entries = {};
  for (const name of Object.keys(files).sort()) {
    entries[`${STARTER_ROOT}/${name}`] = [strToU8(files[name]), { mtime: ZIP_MTIME }];
  }
  return zipSync(entries, { level: 9, mtime: ZIP_MTIME });
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
