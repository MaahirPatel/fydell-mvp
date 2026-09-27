# Isolated Python execution

This service belongs on a dedicated Linux worker, separate from Next.js, the
evidence worker, production credentials, and customer storage. It requires Docker
with the gVisor `runsc` runtime. It never falls back to executing code on its host.

Configure:

- `FYDELL_RUNNER_IMAGE`: a pre-pulled Python 3.12 image pinned by `@sha256:…`.
- `FYDELL_EXECUTION_TOKEN`: dedicated random secret, at least 32 characters.
- `HOST` and `PORT`: default to `127.0.0.1:8091`; place behind an authenticated
  HTTPS reverse proxy with request/body time limits. Do not expose the Docker API.

Start with `node services/code-execution/server.mjs`. In the Next.js environment,
set `FYDELL_EXECUTION_URL` to the service's HTTPS origin and the same
`FYDELL_EXECUTION_TOKEN`. These must never use a `NEXT_PUBLIC_` prefix.

Only the Python standard library is available. Each request gets a disposable,
non-root gVisor container with no network, no host mounts, a read-only root,
128 MiB memory, 0.5 CPU, 32 processes, bounded output and a ten-second wall limit.
Cleanup force-removes the named container even when the client times out. The
worker accepts at most two concurrent requests. Expected outcomes stay outside
the container; candidate output is treated as data, never as test verdicts.

The task is intentionally narrow: implement `handle_events(events)` with strict
authorization, positive finite numeric amounts, and within-batch idempotency.
The suite version, source hash, environment digest, outcome and checks are saved
with the workspace and its append-only execution event. Synthetic model metrics
remain separate and must not be interpreted as measurements of this code.

Run contract tests: `node --test services/code-execution/runner.test.mjs`.
These mock the Docker transport and do not prove container isolation. Before
enabling customer runs, verify actual correct/incorrect solutions, infinite loops,
memory/output exhaustion, denied networking, concurrent requests and cleanup on
the intended worker. No worker was available in the development checkout.

Current scope: the authenticated-by-capability demonstration workspace. Employer
invitation integration, durable queued execution, required code-task submission,
and production execution operations are still release gates. Do not advertise
this increment as the complete paid engineering assessment.
