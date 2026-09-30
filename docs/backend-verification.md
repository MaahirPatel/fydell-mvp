# Backend verification (2026-09-29)

Everything below was executed in this session. Nothing here ran against a
live Supabase project, a deployed app, a production runner or the desktop
binary.

## Environment

- Windows 11 Enterprise 10.0.26100, Git Bash + PowerShell 7
- Node.js 24.19.0, npm 11.17.0 (installed this session; none was present)
- Python 3.12.10 + pytest 9.1.1 (installed this session; `python3` on PATH
  is the Microsoft Store stub)
- `FYDELL_LOCAL_PYTHON` set to the Python 3.12 interpreter
- Branch `backend/master-prompt-2026-09-29` from `main` `f6087ae`

## Baseline on `main` before any change

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npx eslint` | **40 errors, 40 warnings** |
| `npm run test:unit` without Python | fail: 128 scenario-validation failures (no interpreter) |
| `npm run test:unit` with Python | pass |
| `npm run validate:scenario` | **FAIL 1/17**: infinite-loop fixture did not hit the time limit |

Root cause of the validator failure: `core.autocrlf=true` checked scenario
files out with CRLF, so the validator's injected loop never matched and the
run completed normally. The same CRLF bytes would be packaged and hashed on
any Windows build. Fixed with `.gitattributes` (`scenarios/** text eol=lf`)
and a re-checkout of `scenarios/`; no scenario content changed in git.

## Final results on this branch

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npx eslint` | 22 errors, 40 warnings; **all 22 errors are in frontend-owned UI files** (below) |
| `npm run test:unit` | pass (exit 0); includes the new catalog and replay suites; eng units 90/90, engineering runner 54/54 and 23/23, file package 45/45, runner service 7/7 |
| `npm run test:catalog` | pass: catalog honesty, lifecycle rules, criteria screening (including no false positives on "race condition", "white-box tests", "over 10 years of experience"), intake matching, no answer-key leakage |
| `npm run test:event-replay` | pass: cursor resume without loss or repeats, exact paging, hidden events advance the cursor, payload projection, bad cursors refused |
| `npm run validate:scenario` | **VALIDATION PASSED, 17/17** (matrix in `docs/evaluation-validation.md`) |
| `node scripts/test-migration-039.mjs` (PGlite, real Postgres engine) | pass, 35 checks: 019+038+039 apply and 039 re-applies; lifecycle order; no self-approval; human-only approval and publication; qualification required; append-only reviews; published content immutable; draft versions deletable; intake freeze; idempotency per org; RLS isolates org A from org B; clients cannot read reviews or write requests |
| `npx tsx scripts/test-sim-grind-{content,journey,milestones,teammates,timing}.ts` | pass: 243, 53, 38, 79, 53 checks |
| `npm run build` | pass: compiled, 94 static pages generated |

## Remaining lint errors (frontend-owned, not changed)

`react/no-unescaped-entities` and `react-hooks/set-state-in-effect` in:
`desktop/src/App.tsx` (5), `desktop/src/components/Panels.tsx` (4),
`Profile.tsx` (3), `Inbox.tsx` (2), `AnalysisPanel.tsx`, `CommandPalette.tsx`,
`Home.tsx`, `Workspace.tsx` (1 each), `src/components/marketing/home/HeroSimWorkspace.tsx` (2),
`src/components/marketing/DownloadClient.tsx` (1), `src/components/sandbox/CodeWorkspace.tsx` (1).

The `set-state-in-effect` ones can change render behaviour when fixed, so
they belong to the component owner.

## Not verified

- Migration 039 on Supabase (fydell-dev or production); PGlite stubs the
  `auth` schema and org helpers.
- The two new routes over HTTP with a real session (logic is tested; the
  route handlers typecheck and build).
- Desktop: Rust build, installer, deep links, keychain, sleep/resume.
- Production environment variables for the desktop execution path.
- Any live runner isolation (RUN-01/02).
