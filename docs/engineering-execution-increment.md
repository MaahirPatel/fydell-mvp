# Engineering execution increment

This increment adds a Python code task to the Applied AI demonstration workbench.
It is not yet the complete employer-invited engineering assessment.

## Implemented

- Same-origin Monaco editor, task brief, code saving and per-tab draft recovery.
- Polling no longer replaces in-progress form edits or newer server revisions.
- Code and execution records persist in versioned proof artifacts and events.
- Test results are tied to source SHA-256, suite version and environment version.
- Infrastructure errors, runtime errors and failed checks remain distinct.
- Vercel Sandbox adapter: disposable, network-denied microVM, dedicated candidate
  user, bounded CPU/memory/process/file resources, command timeout, bounded output,
  and cleanup. Expected outcomes remain outside the candidate environment.
- A separate Docker/gVisor worker is available as an alternative deployment.
- Per-run execution reservation and demonstration execution limits.
- Evidence screen displays code results separately from synthetic model metrics.
- Submission refuses unsaved code in the new workbench. The existing Wave 1
  submission endpoint now authorizes before merging answers and refuses to
  finalize when the last save fails or conflicts.

## Managed execution setup

Use the Vercel project `fydell-mvp`. Authenticate the CLI, pull a current
development OIDC token, and load it in the local environment. Run
`node --env-file=.env.local scripts/create-execution-snapshot.mjs` once to create
a clean, versioned Python environment. The script writes the snapshot ID and
`FYDELL_EXECUTION_PROVIDER=vercel` into the ignored local environment file.

Configure those same two settings in Vercel Preview. Deployed SDK authentication
uses Vercel OIDC. Never pass application secrets or a source repository to the
candidate VM. The snapshot contains no candidate code or application credentials.

Reference: https://vercel.com/docs/sandbox/sdk-reference

Only `fydell-dev` (`btbmvrvynnrhapjdkunz`) was used for staging checks.
The Applied AI catalog seed was applied there. Production was not used.
Preview database settings remain unverified because the CLI masks sensitive
values; verify the deployment binding before running the deployed flow.

## Verification

- Production Next.js build passed.
- TypeScript checks passed before the final commit checks.
- Execution transport/grade contract tests passed (7 tests).
- Live Vercel Sandbox smoke test executed an intentionally incorrect Python
  solution: execution completed and all six authoritative checks failed as
  expected. This proves the real execution path, not the full isolation audit.
- Browser checks passed at 1440, 1024 and 390 pixels, including edit preservation,
  explicit save, refresh recovery, unavailable execution and browser errors.
- Live staging exercised ownership refusal, code saving/reload, artifact version
  persistence, the synthetic episode, immutable submission, written follow-up,
  human review, report and receipt. Its temporary run and organization were removed.
- Existing scoring, state-machine, disclosure, October pilot, redirect,
  database-security, environment-guard, workspace identity and availability checks
  passed. The aggregate release command stops at existing copy-lint violations
  in older authored files. Generated Monaco dependency assets are excluded from
  that product-copy scan.

## Remaining release gates

- Connect this task to real employer invitations and the canonical engineering
  report. The current new workspace is still the clearly labeled sandbox demo.
- Finish managed execution acceptance, including hostile resource workloads and
  concurrent requests, and verify result persistence through the live UI.
- Make code execution a required, versioned part of the invited assessment;
  do not silently change requirements for an existing invitation.
- Add durable execution jobs and operational recovery beyond bounded synchronous
  execution. Harden billing, email delivery, and Preview configuration end to end.
- Finish candidate draft recovery for all written fields, not only code.
