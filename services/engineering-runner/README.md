# Isolated engineering test runner

Runs engineering-scenario tests for the Fydell app (`FYDELL_EXECUTION_PROVIDER=worker`)
on a dedicated Linux host, separate from the web app, databases, storage and
production credentials. It is one of two isolated providers; the other is
Vercel Sandbox (`FYDELL_EXECUTION_PROVIDER=vercel`, see
`scripts/create-engineering-runtime-snapshot.mjs`).

## Isolation per run

- Disposable Docker container on the gVisor `runsc` runtime.
- `--network=none`, read-only root, non-root user, all capabilities dropped,
  `no-new-privileges`, 768 MiB memory without swap, 1 CPU, 128 processes,
  256 open files, 32 MiB max file size, 64 MiB `noexec` tmpfs.
- No host mounts. The workspace arrives on stdin and exists only in tmpfs.
- The trusted bootstrap (`bootstrap.py`) is part of this service, not the
  request. It runs pytest in a child process with a wall-clock limit and
  bounded output, and prints one nonce-tagged result envelope.
- The container is force-removed after every run, including timeouts.
- At most `FYDELL_RUNNER_CONCURRENCY` runs at once (default 2); more get 429.

## Configure

- `FYDELL_RUNNER_IMAGE`: the image from `Dockerfile`, pinned by `@sha256:` digest
  and pre-pulled (`--pull=never`).
- `FYDELL_RUNNER_TOKEN`: dedicated random secret, 32+ characters. Set the same
  value as `FYDELL_RUNNER_TOKEN` in the web app, plus `FYDELL_RUNNER_URL`
  (HTTPS origin of this service). Never use a `NEXT_PUBLIC_` prefix.
- `HOST`/`PORT`: default `127.0.0.1:8092`. Put an authenticated HTTPS reverse
  proxy with body-size and time limits in front. Never expose the Docker API.

Start: `node services/engineering-runner/server.mjs`.

## Verify before enabling paid runs (RUN-01, RUN-02, RUN-09)

The contract tests (`node --test services/engineering-runner/runner.test.mjs`)
fake the Docker launcher. They do not prove isolation. On the real host,
record evidence for each of these:

1. `npm run validate:scenario` equivalents through this service: reference
   passes, defective variants fail as expected.
2. Network denied: a test that opens a socket fails.
3. Resource exhaustion: an infinite loop hits the wall limit; a memory bomb
   is killed; a fork bomb hits the process limit; the host stays healthy.
4. Output flood is truncated and the run still returns an envelope.
5. Cleanup: no `fydell-run-*` containers remain after timeouts or client
   disconnects (`docker ps -a`).
6. Concurrency at the purchased cohort size, plus a worker restart mid-run:
   the app marks the abandoned run and a retry succeeds.

`bootstrap.py` must stay identical to `BOOTSTRAP_PY` in
`src/lib/engineering/bootstrap.ts`; `npm run test:engineering` checks this.
