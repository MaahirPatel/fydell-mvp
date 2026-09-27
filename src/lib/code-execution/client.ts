import 'server-only';
import { createHash } from 'node:crypto';
import { executionResultSchema } from './contract';

export function executionConfigured() {
  if (process.env.FYDELL_EXECUTION_PROVIDER === 'vercel') return Boolean(process.env.FYDELL_EXECUTION_SNAPSHOT_ID);
  return Boolean(process.env.FYDELL_EXECUTION_URL && process.env.FYDELL_EXECUTION_TOKEN);
}

export async function executeCode(source: string) {
  if (!executionConfigured()) throw new Error('Code execution is not configured. Your code can still be saved.');
  if (process.env.FYDELL_EXECUTION_PROVIDER === 'vercel') {
    const { executeOnVercel } = await import('./vercel');
    return executionResultSchema.parse(await executeOnVercel(source));
  }
  const url = new URL(process.env.FYDELL_EXECUTION_URL!);
  if (url.protocol !== 'https:' && !(['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:')) {
    throw new Error('Execution service requires HTTPS');
  }
  const response = await fetch(new URL('/execute', url), {
    method: 'POST', headers: { authorization: `Bearer ${process.env.FYDELL_EXECUTION_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ source }), signal: AbortSignal.timeout(20000), cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'Execution capacity is busy. Try again shortly.' : 'Execution service unavailable. Your saved work is unchanged.');
  const result = executionResultSchema.parse(await response.json());
  if (result.sourceHash !== createHash('sha256').update(source).digest('hex')) throw new Error('Execution result does not match the saved code');
  if (result.status === 'completed' && result.tests.length !== 6) throw new Error('Execution result is incomplete');
  return result;
}
