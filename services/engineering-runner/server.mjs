// Authenticated HTTP front for the isolated engineering runner.
//
// POST /run   Authorization: Bearer <FYDELL_RUNNER_TOKEN>
//   body: { files, pytestArgs, timeoutSeconds, maxOutputBytes, nonce }
//   200:  { stdout, environmentVersion }
// GET /health  -> { ok, active, capacity }
//
// Bind to localhost and put an authenticated HTTPS reverse proxy in front.
// Never expose the Docker API. See README.md.

import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { LIMITS, dockerArgs, runPayload, validateRunRequest } from './runner.mjs';

const token = process.env.FYDELL_RUNNER_TOKEN;
const image = process.env.FYDELL_RUNNER_IMAGE;
const capacity = Number(process.env.FYDELL_RUNNER_CONCURRENCY ?? 2);
if (!token || token.length < 32) throw new Error('Set a dedicated FYDELL_RUNNER_TOKEN of at least 32 characters');
dockerArgs('configuration-check', image); // fails fast unless the image is digest-pinned
const environmentVersion = `fydell-bootstrap/1;image:${image}`;

let active = 0;

function authorized(req) {
  const supplied = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

createServer(async (req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  if (!authorized(req)) return reply(401, { error: 'Unauthorized' });
  if (req.method === 'GET' && req.url === '/health') return reply(200, { ok: true, active, capacity });
  if (req.method !== 'POST' || req.url !== '/run') return reply(404, { error: 'Not found' });
  if (active >= capacity) return reply(429, { error: 'Runner at capacity' });

  active++;
  try {
    let raw = '';
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > LIMITS.maxBodyBytes) return reply(413, { error: 'Request too large' });
      raw += chunk;
    }
    let payload;
    try {
      payload = validateRunRequest(JSON.parse(raw));
    } catch (err) {
      return reply(400, { error: err instanceof Error ? err.message : 'Invalid request' });
    }
    const { stdout } = await runPayload(payload, image);
    return reply(200, { stdout, environmentVersion });
  } catch {
    return reply(503, { error: 'Runner unavailable' });
  } finally {
    active--;
  }
}).listen(Number(process.env.PORT ?? 8092), process.env.HOST ?? '127.0.0.1');
