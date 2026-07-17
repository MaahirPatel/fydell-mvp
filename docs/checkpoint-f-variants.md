# Checkpoint F — Bounded generative Relay variant pipeline (ops-gated)

A **real but bounded** pipeline for producing alternate Project Relay scenarios: every
variant is a deterministic, seed-derived mutation of the exact same known-good files that
already ship at `scenarios/project-relay/`. There is no open-ended generation, no live model
call, and no path by which a draft/unapproved/invalid variant can reach a candidate session.

## What "bounded" means here

- Every variant is produced by `materializeVariant(spec)` (`src/lib/relay/variants/materialize.ts`),
  which always starts from `getKnownGoodBaseline()` — the real files on disk — and applies
  **exactly one** hand-written mutator selected by `spec.defectFocus` (a closed enum: only three
  focuses exist today — `missing_approval_check`, `missing_severity_filter`,
  `stale_confidence_threshold`).
- A tiny seeded PRNG (`createSeededRandom`, mulberry32) only ever picks between a couple of
  equivalent, pre-written options *inside* a mutator (which of two marker-comment phrasings to
  use, or a stale threshold value from a fixed, safe list) — it never invents new files, new
  endpoints, or new facts.
- Same `VariantSpec` (same id/seed/defectFocus) always produces a byte-identical `FileMap`. This
  is asserted directly in `scripts/test-relay-variants.ts`.
- Every mutation is never invents PII: `validateVariant` rejects any file containing an
  email-looking string.

## Files

| File | Purpose |
| --- | --- |
| `src/lib/relay/variants/types.ts` | `VariantSpec` type + closed `DefectFocus` enum |
| `src/lib/relay/variants/materialize.ts` | Deterministic materialization + seeded PRNG + 3 mutators |
| `src/lib/relay/variants/validate.ts` | Static validation (required files, golden set, defect marker, PII, evals script) |
| `src/lib/relay/variants/catalog.ts` | The three approved `VariantSpec` constants + known-good facts |
| `src/lib/relay/variants/store.ts` | File-backed ops override store (`.data/relay-variants-state.json`, gitignored) |
| `src/lib/relay/variants/resolve.ts` | `resolveScenarioForSession` — the only thing that decides what a session gets |
| `src/app/ops/variants/page.tsx` + `OpsVariantsList.tsx` | Ops review UI |
| `src/app/api/ops/variants/route.ts` + `[id]/route.ts` | List / approve / reject / retire / re-validate / sign-release API |
| `src/app/ops/validation/page.tsx` | Human-acceptance status page ("Not yet collected") |
| `scripts/test-relay-variants.ts` (`npm run test:relay-variants`) | Determinism + validation + fallback acceptance tests |

## The three approved variants

| id | defectFocus | difficulty | what's different from the baseline |
| --- | --- | --- | --- |
| `relay-variant-alpha` | `missing_approval_check` | baseline | Marks the same approval-bypass defect the canonical scenario already ships with — makes it explicit/auditable rather than only described in a docstring. |
| `relay-variant-bravo` | `missing_severity_filter` | harder | Reorders `triage.classify()`'s keyword checks so billing runs before security/P0, so overlap-keyword tickets can lose severity precedence. |
| `relay-variant-charlie` | `stale_confidence_threshold` | harder | Lowers `router.py`'s `CONFIDENCE_ESCALATION_THRESHOLD` to a stale value, under-escalating to the model-assisted second opinion. |

All three ship with `status: "approved"` in the catalog constant — but **catalog status is not
the last word**. `resolveScenarioForSession` checks the *effective* status (catalog status,
overridable by an operator via the store), and it never serves a variant regardless of status
unless `validateVariant` also passes on a freshly materialized copy.

## How serving actually works today (safest-for-demo default)

`beginSession` (`src/lib/fde/relay-session.ts`) calls:

```ts
resolveScenarioForSession({ preferVariantId: process.env.RELAY_ACTIVE_VARIANT_ID || null })
```

- With `RELAY_ACTIVE_VARIANT_ID` unset (the default in every environment today), every session
  is seeded from the known-good canonical baseline — identical to before this checkpoint.
- The resolved `releaseId` (`"project-relay@known-good"` or `"variant:<id>@<seed>:<hash>"`) is
  stored on the session's `workspace_state.scenarioReleaseId` and logged on the
  `session_started` event + `relay_session.started` audit entry, every single time — so which
  release seeded a session is always provable, even though the answer is always "known-good" by
  default.
- To actually demo serving a variant, an operator sets `RELAY_ACTIVE_VARIANT_ID` to an approved,
  validated variant id before a session starts. If that variant fails validation or isn't
  approved at that moment, sessions silently and safely fall back to known-good — there is no
  failure mode where a broken variant reaches a candidate.

## How operators approve, validate, and sign a release

1. Sign in with an ops role (`super_admin` / `admin` / `operator` / `reviewer`) and open
   `/ops/variants`.
2. Each of the three variants shows its live validation result (materialized fresh on every
   page load — never a stale cached "ok").
3. **Re-validate** re-runs `materializeVariant` + `validateVariant` right now and records the
   result + timestamp in `.data/relay-variants-state.json`.
4. **Approve** / **Reject** / **Retire** write a status *override* to the same file-backed store
   (and an `audit_logs` row via `writeAudit`) — this is what `resolveScenarioForSession` actually
   checks, not the catalog constant directly. An operator can reject one of the three
   "approved-by-default" variants and it will immediately stop being eligible to serve.
5. **Sign release** is only enabled once a variant's effective status is `approved` and its
   latest validation passed. It computes a content hash of the materialized files, appends a
   signed-release record (`releaseId`, `contentHash`, `signedBy`, `signedAt`) to the store, and
   writes an audit entry. This is the durable, auditable proof that "an operator looked at this
   exact set of files and signed off" — it does not, by itself, change what
   `RELAY_ACTIVE_VARIANT_ID` points at (that remains an explicit, separate operational step, on
   purpose).

`.data/relay-variants-state.json` is the only mutable state in this pipeline; it is gitignored
(`.data/` was already in `.gitignore` before this checkpoint) and safe to delete — deleting it
just resets every variant back to its catalog-default status with no validation/signature
history.

## Human validation status

`/ops/validation` shows expert/usability interview status. As of this checkpoint: **Not yet
collected** — no candidate or hiring-lead sessions have been run. Nothing on that page is
estimated or fabricated ahead of real interviews; see `docs/fde-rebuild-checkpoints.md`
(Checkpoint H) for the tracked target (≥3 candidates, ≥3 hiring leads).

## Gate

```
npm run test:relay-variants
```

Covers: three approved catalog specs; deterministic materialization (same spec ⇒ identical
files, twice); each variant validates cleanly; each variant carries an `INTENTIONAL_DEFECT`
marker; `validateVariant` actually rejects a fabricated PII email and a missing-marker/missing-
required-file `FileMap` (negative cases, not just happy path); `resolveScenarioForSession`
defaults to known-good with no preference, falls back for an unknown id, serves an approved+valid
variant only when explicitly preferred, and never serves a variant an operator has rejected via
the store override.

Also re-run to confirm no regression from wiring `scenarioReleaseId` into the session flow:

```
npm run test:relay-spike
npm run test:evidence-math
npm run test:fde-unit
```

## Known limitations (honest)

- The mutator set is closed (3 defect focuses) — expanding it means writing a new mutator
  function, not configuring anything at runtime. That is intentional for this checkpoint.
- `.data/relay-variants-state.json` is a single JSON file, not a database table — fine for one
  operator on one machine in this prototype, not a concurrent multi-operator store.
- `RELAY_ACTIVE_VARIANT_ID` is an environment variable, not a UI toggle — switching which release
  candidates actually see is deliberately a separate, more deliberate step than approving/signing
  a variant in the ops UI.
- Human usability validation (`/ops/validation`): **not yet collected**.
