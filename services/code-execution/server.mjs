import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { execute, dockerArgs } from './runner.mjs';

const token = process.env.FYDELL_EXECUTION_TOKEN;
const image = process.env.FYDELL_RUNNER_IMAGE;
if (!token || token.length < 32) throw new Error('Set a dedicated FYDELL_EXECUTION_TOKEN of at least 32 characters');
dockerArgs('configuration-check', image);
let active = 0;
createServer(async (req, res) => {
  const reply = (status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const supplied = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return reply(401, { error: 'Unauthorized' });
  if (req.method !== 'POST' || req.url !== '/execute') return reply(404, { error: 'Not found' });
  if (active >= 2) return reply(429, { error: 'Execution capacity is busy' });
  active++;
  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 40000) return reply(413, { error: 'Request too large' });
    }
    let body;
    try { body = JSON.parse(raw); } catch { return reply(400, { error: 'Invalid JSON' }); }
    if (typeof body.source !== 'string' || !body.source.trim() || Buffer.byteLength(body.source) > 24000) return reply(400, { error: 'Invalid source' });
    reply(200, await execute(body.source, image));
  } catch { reply(503, { error: 'Execution service unavailable' }); }
  finally { active--; }
}).listen(Number(process.env.PORT ?? 8091), process.env.HOST ?? '127.0.0.1');
