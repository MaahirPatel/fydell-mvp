// Isolated engineering test runner: request validation and container launch.
//
// Each run is a disposable gVisor container with no network, a read-only
// root filesystem, a non-root user, dropped capabilities and hard resource
// limits. The workspace travels on stdin and lives only in the container's
// tmpfs; nothing from the host is mounted. The trusted bootstrap
// (bootstrap.py, kept identical to src/lib/engineering/bootstrap.ts by the
// app's test suite) runs pytest in a child process and prints one
// nonce-tagged result envelope. This service never executes candidate code
// on its own host.

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const BOOTSTRAP = readFileSync(new URL('./bootstrap.py', import.meta.url), 'utf8');

export const LIMITS = {
  maxBodyBytes: 8 * 1024 * 1024,
  maxFiles: 600,
  maxTimeoutSeconds: 120,
  maxOutputBytes: 1024 * 1024,
  maxStdoutBytes: 16 * 1024 * 1024,
};

const SAFE_ARG = /^[A-Za-z0-9_./=:{}\-]+$/;

export function unsafePathReason(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 256) return 'bad length';
  if (p.startsWith('/') || p.includes('\\') || p.includes('\0')) return 'absolute or backslash';
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(p)) return 'control character';
  if (p.split('/').some((s) => s === '' || s === '.' || s === '..')) return 'reserved segment';
  return null;
}

/** Returns a normalized payload or throws an Error with a client-safe message. */
export function validateRunRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('body must be an object');
  const { files, pytestArgs, timeoutSeconds, maxOutputBytes, nonce } = body;
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('files must be an object');
  const paths = Object.keys(files);
  if (paths.length === 0 || paths.length > LIMITS.maxFiles) throw new Error('bad file count');
  for (const p of paths) {
    if (unsafePathReason(p)) throw new Error(`unsafe path: ${JSON.stringify(p).slice(0, 80)}`);
    if (typeof files[p] !== 'string') throw new Error('file contents must be strings');
  }
  if (!Array.isArray(pytestArgs) || pytestArgs.length > 64 || !pytestArgs.every((a) => typeof a === 'string' && SAFE_ARG.test(a))) {
    throw new Error('invalid pytestArgs');
  }
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || timeoutSeconds > LIMITS.maxTimeoutSeconds) {
    throw new Error('invalid timeoutSeconds');
  }
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0 || maxOutputBytes > LIMITS.maxOutputBytes) {
    throw new Error('invalid maxOutputBytes');
  }
  if (typeof nonce !== 'string' || !/^[a-f0-9]{32}$/.test(nonce)) throw new Error('invalid nonce');
  return { files, pytestArgs, timeoutSeconds, maxOutputBytes, nonce };
}

export function dockerArgs(name, image) {
  if (!/^.+@sha256:[a-f0-9]{64}$/.test(image ?? '')) {
    throw new Error('FYDELL_RUNNER_IMAGE must be pinned by digest (name@sha256:...)');
  }
  return [
    'run', '--rm', '--pull=never', '--runtime=runsc', '--name', name,
    '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--user=65534:65534', '--memory=768m', '--memory-swap=768m', '--cpus=1', '--pids-limit=128',
    '--ulimit=nofile=256:256', '--ulimit=fsize=33554432:33554432', '--log-driver=none',
    '--tmpfs=/tmp:rw,nosuid,nodev,noexec,size=64m', '--env=HOME=/tmp', '--workdir=/tmp',
    '-i', image, 'python3', '-I', '-B', '-c', BOOTSTRAP, '-',
  ];
}

function launch(args, input, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
    let stdout = '';
    let bytes = 0;
    let overflow = false;
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > LIMITS.maxStdoutBytes) {
        overflow = true;
        child.kill('SIGKILL');
      } else {
        stdout += chunk.toString('utf8');
      }
    });
    child.stdin.on('error', () => {});
    child.on('error', () => {
      clearTimeout(timer);
      resolve({ ok: false, stdout: '', overflow });
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ ok: !overflow, stdout, overflow });
    });
    child.stdin.end(input);
  });
}

/**
 * Runs one validated payload. Returns { stdout } for the app to parse, or
 * throws when the platform itself failed (the app records that as an
 * infrastructure error, never a candidate result).
 */
export async function runPayload(payload, image, launcher = launch) {
  const name = `fydell-run-${randomUUID()}`;
  try {
    const result = await launcher(
      dockerArgs(name, image),
      JSON.stringify(payload),
      (payload.timeoutSeconds + 30) * 1000
    );
    if (!result.ok) throw new Error(result.overflow ? 'runner output limit exceeded' : 'container failed to start');
    return { stdout: result.stdout };
  } finally {
    // Killing the docker client does not stop its container. Always remove it.
    await launcher(['rm', '--force', name], '', 10000);
  }
}
