# Checklist progress — chunk-passport (2026-09-27)

Owner paths: `src/lib/passport/**`, `src/app/api/passport/**`, `scripts/test-passport-grind-*.ts`.
Branch: `feature/desktop-sim-client`. No commits made by this worker. `package.json` untouched.

## Test totals (real in-process `tsx` runs, fake GitHub Fetcher)

| Suite | File | Passed | Failed |
|---|---|---|---|
| Extraction GH-01..GH-09 | `scripts/test-passport-grind-extract.ts` | 56 | 0 |
| Sharing GH-10/GH-11, PASS-05/06/07 | `scripts/test-passport-grind-sharing.ts` | 41 | 0 |
| Passport PASS-01..04/08/09 + E2E-01 journey | `scripts/test-passport-grind-passport.ts` | 55 | 0 |
| **Total** | | **152** | **0** |

TypeScript: `npx tsc --noEmit` exits 0 — zero errors project-wide (verified 2026-09-27;
earlier unrelated errors in analysis/auth/sim/grants were resolved separately).

## GitHub extraction (GH-01..GH-12)

| ID | Status | Evidence |
|---|---|---|
| GH-01 | DONE-TESTED | Public-only intake: `INTAKE_SCOPE` in `src/lib/passport/github/types.ts`; `parseGithubRepoRef` + private-repo refusal in `src/lib/passport/github/extract.ts`; scope returned by `src/app/api/passport/github/route.ts`. Extract suite asserts non-github refs rejected and private repos refused before any file fetch. |
| GH-02 | DONE-TESTED | Fork/re-export handling: `isFork`/`forkNotice` in `src/lib/passport/assemble.ts`; unverified-attribution copy. Extract suite asserts fork notice present and attribution marked unverified. |
| GH-03 | DONE-TESTED | Commit-pinned imports: snapshots keyed by `{repoFullName, commitSha}` with `analyzedAt` in `src/lib/passport/snapshots.ts`; extractor pins the repo's reported SHA in `src/lib/passport/github/extract.ts`; `analyzed_at` persisted by `src/lib/passport/store.ts`. Same-commit re-runs produce deterministic finding IDs (sharing suite). Live DB round-trip still to run. |
| GH-04 | DONE-TESTED | Bounded work: file/size/time caps in `src/lib/passport/github/extract.ts`; extract suite asserts caps enforced. |
| GH-05 | DONE-TESTED | Failure modes + bounded retries: `src/lib/passport/github/retry.ts` (`isRetryableStatus`, terminal 401/404, bounded attempts); `src/lib/passport/github/client.ts` maps 401/404/429/403. Suite asserts terminal statuses are not retried and attempts stay within the budget. |
| GH-06 | DONE-TESTED | Static-only: extractor never executes repo code; text-file gating in `src/lib/passport/github/select.ts`. Suite asserts binary/unsupported files are skipped, never run. |
| GH-07 | DONE-TESTED | Hostile README: secret redaction in `src/lib/passport/github/redact.ts` (applied to stored excerpts, displayed excerpts, and model-bound evidence); pagination refuses off-host links in `src/lib/passport/github/client.ts`. Suite covers hostile README, token-like excerpts, and cross-host page links. |
| GH-08 | DONE-TESTED | Citation validation: findings carry `{path, startLine, endLine}` citations validated in `src/lib/passport/github/extract.ts`. Suite asserts malformed/out-of-range citations are dropped. |
| GH-09 | DONE-TESTED | Coverage display: `coverage {filesAnalyzed, filesSkipped, languages, skippedReasons}` in `src/lib/passport/github/types.ts` + `extract.ts`; `describeCoverage` in `src/lib/passport/view.ts`. Suite asserts languages listed and skip reasons counted. |
| GH-10 | DONE-TESTED | Re-imports: deterministic finding IDs (`extract.ts`); `reconcileSnapshots` in `src/lib/passport/snapshots.ts` keeps older snapshots and marks them stale; `projectForShare` in `store.ts` excludes stale snapshots. Sharing suite asserts idempotent IDs, stale marking, and exclusion from new shares. Live DB verification of multi-snapshot retention pending. |
| GH-11 | DONE-TESTED | Removal/disconnect: `removeProjectExplanation`, `disconnectGithubExplanation`, `githubRemovalImpact` in `src/lib/passport/removal.ts`; `disconnectGithub` in `store.ts`; DELETE on `src/app/api/passport/github/route.ts`. Sharing suite asserts copy content and disconnect semantics. Live DB verification pending. |
| GH-12 | DEFERRED-P1 | Private repos: intake refuses private repos until scoped GitHub auth is verified (`INTAKE_SCOPE`, extract-suite refusal test). P1, intentionally deferred. |

## Passport (PASS-01..PASS-09) + E2E-01

| ID | Status | Evidence |
|---|---|---|
| PASS-01 | NEEDS-LIVE | Persistence layer written in `src/lib/passport/store.ts` (owner-scoped Supabase access, no fixture data paths); `projectFromResult` guard unit-tested in the passport suite (failed imports never materialize as passport projects). Cross-device persistence and RLS scoping need live Supabase verification. |
| PASS-02 | DONE-TESTED | Evidence-linked roles only: `src/lib/passport/assemble.ts`. Passport suite asserts no fit percentages, seniority labels, or personality labels appear. |
| PASS-03 | DONE-TESTED | Missing-public-work copy frames absence as insufficient evidence, not low ability (`missingWorkCopy` in `src/lib/passport/view.ts`). Asserted in passport suite. |
| PASS-04 | DONE-TESTED | Role/capability logic stays evidence-linked (`assemble.ts`, `src/lib/passport/simulationEvidence.ts`). Asserted in passport suite. |
| PASS-05 | DONE-TESTED | Scoped projection: `SHAREABLE_FIELDS` allowlist + `projectForShare` in `store.ts` exclude hidden tests, canonical answers, employer notes, and reference solutions by construction (they live in other tables and are never copied). Sharing suite asserts exclusions. |
| PASS-06 | DONE-TESTED | Sharing model: `validateExpiryInput` + `shareState` in `src/lib/passport/sharing.ts`; `createShare`/`resolveShare`/`revokeShare` in `store.ts`; routes `src/app/api/passport/shares/route.ts` and `src/app/api/passport/shares/[id]/route.ts`. Sharing suite covers expiry validation, state transitions, revocation boundaries. **Schema integration required:** `passport_shares.expires_at` column (migration removed as out-of-ownership; schema owner to provide) + live round-trip. |
| PASS-07 | DONE-TESTED | Share preview/explanation copy in `src/lib/passport/view.ts` (`sharePreviewCopy`, `shareExplanationCopy`); revocation semantics asserted in sharing suite. |
| PASS-08 | DONE-TESTED | Corrections: `flagFinding`/`listCorrections`/`resolveCorrection` + `validateCorrectionReason` in `src/lib/passport/corrections.ts`; original findings preserved, corrections appended and included in export (`src/lib/passport/export.ts`); routes `src/app/api/passport/corrections/route.ts`, `src/app/api/passport/export/route.ts`. Passport suite asserts originals untouched and correction lifecycle. **Schema integration required:** `passport_corrections` table (migration removed as out-of-ownership; schema owner to provide) + live round-trip. |
| PASS-09 | DONE-TESTED | Portable JSON export: `buildPortablePassport` + `sanitizePortablePassport` in `src/lib/passport/export.ts`; adversarial sanitizer tests (prototype pollution, hidden fields, oversized input) in passport suite; export route returns the portable document. |
| E2E-01 | NEEDS-LIVE | In-process journey (import → flag finding → share → revoke → export → delete) passes in `scripts/test-passport-grind-passport.ts`. Full E2E needs live Supabase auth + dev server. |

## Implementation notes

- Validators (`validateExpiryInput`, `validateCorrectionReason`) return single-shape
  `{ ok: boolean; …; error: string }` results instead of discriminated unions: this
  repo's tsconfig sets `"strict": false`, under which `if (!result.ok)` does not
  narrow the failure member for imported union types (verified by probe 2026-09-27).
  Single-shape results need only property access and compile cleanly.
- Out-of-ownership files created earlier in this chunk (`docs/passport-github-intake.md`,
  `docs/passport-sharing-portability.md`, `supabase/migrations/031_passport_sharing_corrections.sql`)
  were removed to respect file ownership. The migration's schema
  (`passport_shares.expires_at`, `passport_corrections`) is now an explicit
  integration requirement for the schema owner — see below.

## Outstanding schema / deployment requirements

1. **Migration (schema owner):** add `passport_shares.expires_at timestamptz null` and
   create `passport_corrections` (`id`, `passport_id`, `repo_full_name`, `finding_id`,
   `reason`, `status`, `created_at`, `resolved_at`) with owner-scoped RLS, mirroring
   the pre-existing passport tables. Code in `store.ts` already reads/writes these.
2. **Live verification (needs Supabase + dev server):** PASS-01 cross-device persistence;
   PASS-06 share round-trip incl. expiry; PASS-08 correction round-trip; GH-10
   multi-snapshot retention; GH-11 disconnect/remove; full E2E-01 with real auth.
3. **GH-12 (P1):** verify scoped GitHub auth before allowing private-repo intake.
