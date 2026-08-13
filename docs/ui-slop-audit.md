# UI slop audit, before and after

Before column is the state recorded in `docs/production-rescue-baseline.md` at commit
`7290f5c`. After column is the state at the end of the rescue and redesign pass.

Contrast, heading order, accessible-name, alt-text and 200 percent zoom results are
machine-checked by `npm run test:a11y`, not asserted by eye. Screenshots are produced by
`npm run capture:screens`.

## Failure classes, per public route

Classes: **A** text hierarchy faked with alpha, **B** decorative chrome with no meaning,
**C** marketplace or role-catalog framing, **D** unsupported commercial or legal claims,
**E** primary action below the fold or absent, **F** contrast below WCAG AA.

| Route | A before | A after | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | FAIL | PASS | FAIL to PASS | FAIL to PASS | PASS | FAIL to PASS | FAIL to PASS |
| `/product` | FAIL | PASS | FAIL to PASS | PASS | PASS | PASS | FAIL to PASS |
| `/simulations` | FAIL | PASS | FAIL to PASS | FAIL to PASS | PASS | PASS | FAIL to PASS |
| `/trust` | FAIL | PASS | PASS | PASS | FAIL to PASS | PASS | FAIL to PASS |
| `/pricing` | FAIL | PASS | FAIL to PASS | PASS | FAIL to PASS | FAIL to PASS | FAIL to PASS |
| `/request-pilot` | FAIL | PASS | PASS | PASS | FAIL to PASS | FAIL to PASS | FAIL to PASS |
| `/privacy` | PASS | PASS | PASS | PASS | FAIL to PASS | PASS | PASS |
| `/security` | PASS | PASS | PASS | PASS | FAIL to PASS | PASS | PASS |
| `/terms` | PASS | PASS | PASS | PASS | FAIL to PASS | PASS | PASS |
| `/roles`, `/roles/[key]` | FAIL | removed | removed | removed | removed | removed | removed |
| `/candidates`, `/employers` | FAIL | removed | removed | removed | removed | removed | removed |

`/roles`, `/roles/[key]`, `/candidates` and `/employers` now redirect. The route files
remain only as redirects; `src/lib/simulations/roles.ts` and
`src/lib/simulations/content/index.ts` are untouched and simply unrendered.

## Failure classes, per authenticated route

Classes: **G** every object is an undifferentiated white rectangle, **H** zero-value
metric cards on first run, **I** filters and controls shown before any data exists,
**J** internal or stale copy leaking into the product, **K** no empty state.

| Route | G | H | I | J | K |
| --- | --- | --- | --- | --- | --- |
| `/app/employer` (Home) | FAIL to PASS | FAIL to PASS | n/a | FAIL to PASS | FAIL to PASS |
| `/app/employer/assessments` | FAIL to PASS | n/a | PASS | FAIL to PASS | FAIL to PASS |
| `/app/employer/candidates` | FAIL to PASS | n/a | FAIL to PASS | FAIL to PASS | FAIL to PASS |
| `/app/employer/reports` | FAIL to PASS | n/a | FAIL to PASS | PASS | FAIL to PASS |
| `/app/employer/settings` | FAIL to PASS | n/a | n/a | PASS | n/a |
| `/app/employer/cohort` | FAIL to PASS | n/a | n/a | FAIL to PASS | FAIL to PASS |
| `/app/employer/compare` | FAIL to PASS | n/a | n/a | PASS | FAIL to PASS |
| report detail | FAIL to PASS | n/a | n/a | PASS | FAIL to PASS |

Authenticated routes were rendered and audited against local fixtures in both a
first-run and a populated state, at all three widths. What that covers and what it does
not is set out under "Dashboard verification" below.

## Root causes, and what closed them

| Defect at baseline | Measurement then | Measurement now |
| --- | --- | --- |
| Hierarchy encoded as alpha | 205 `text-white/N` across 29 files | 92 across 12 files, all in `/admin`, the sim runtime and `account/setup-required` |
| Dead decorative CSS | `.glass-card`, `.platform-glow`, `.text-gradient`, `.text-gradient-sheen`, `.wordmark-sheen`, `.spotlight-card`, `.eyebrow::before`, hero purple glow | 0 occurrences in `src/` |
| No shared UI layer | 1 unused `AnimatedButton` | 11 primitives in `src/components/ui`, documented in `docs/design-system.md` |
| Divergent redirect validators | 3, one accepting any single-slash path | 1, `src/lib/auth/safe-next.ts`, covered by `npm run test:auth` |
| Duplicate signup headings | "Create your account" twice, sign-in prompt twice | Once each |
| Onboarding | 5-line `redirect()` stub | Real "Create your workspace" flow on the existing `/api/auth/role` contract |
| Unused font payload | Inter fetched, never applied | Removed |
| Dead components | 9 unreferenced files, 57 KB | Deleted |

The remaining 92 alpha utilities are in the operator console, the simulation runtime and
one auth-adjacent page. The simulation engine was explicitly out of scope for this pass,
and `/admin` is not customer-facing. They are listed here rather than quietly excluded.

## Machine-checked results

`npm run test:a11y` against all 13 public and auth routes:

| Check | Result |
| --- | --- |
| Text contrast, 4.5:1 normal and 3:1 large, computed against the real composited background | 0 findings |
| Exactly one `h1` per route, no skipped heading level | 0 findings |
| Accessible name on every visible link, button, input, select and textarea | 0 findings |
| `alt` present on every `img` | 0 findings |
| Visible focus indicator on every keyboard tab stop, WCAG 2.4.7 | 0 findings, 216 stops traversed |
| No horizontal scroll at 200 percent zoom, WCAG 1.4.10 | 0 findings |

The focus pass presses real Tab keys so `:focus-visible` resolves as it does for a
keyboard user, and it resets the sequential-navigation starting point to the document
body first, so autofocused fields do not hide the controls above them. Tab-stop counts
match the focusable-element count on each route, which is how the traversal is confirmed
to be complete rather than merely quiet.

Captures are taken with `reducedMotion: "reduce"` and `colorScheme: "dark"`, so the audit
reflects the reduced-motion rendering as well as the default one.

The audit was run twice: against the dev server, and against `next start` on the
production build. Results were identical, so nothing above depends on dev-only
rendering. The unauthenticated redirect behaviour was re-checked in production mode too,
because the destination path is carried from middleware to the layout in a request
header and that is the part most likely to differ between runtimes.

## Release suite

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:sims` | PASS, 31 simulations, scoring determinism |
| `npm run test:v2` | PASS, adapter and candidate-view redaction |
| `npm run test:october` | PASS, Northline content, defense, preflight, receipts, invitation gates |
| `npm run test:auth` | PASS, redirect-safety cases |
| `npm run test:copy` | PASS, no retired terms, no em dashes |
| `npm run test:a11y` | PASS, 0 findings |
| `npm run lint` | 71 problems, 36 errors, 35 warnings |

Lint was 73 problems and 38 errors at baseline. This pass introduced none and removed two
by deleting dead code. The remaining backlog is `react-hooks/rules-of-hooks` in
`src/lib/platform-store.ts` and `react-hooks/set-state-in-effect` across pre-existing
client components; clearing it was not in scope.

## Screenshot evidence

39 captures, 13 routes at 1440x900, 1366x768 and 1280x800, in `docs/screenshots/`,
named `<route>-<width>.png`. Public pages are full-page; auth pages are first-viewport,
because the point of those captures is that the form fits without scrolling.

No screenshot contains a real email address, workspace name or production identifier.
All captures are unauthenticated, so no customer data is present in any of them.

## Dashboard verification

The seven employer screens were rendered by temporarily feeding the real pages fixture
data through their existing data functions, so what was audited is the shipped component
tree and not a mock of it. The fixture layer was removed afterwards and is not in the
repository. Screens were captured first-run and populated at 1440x900, 1366x768 and
1280x800 into `docs/screenshots/dashboard/`.

`npm run test:a11y` accepts a comma-separated route list as its second argument, which is
how the signed-in routes were audited. Both states returned 0 findings across contrast,
heading order, accessible names, focus visibility and 200 percent zoom.

Three defects were found this way and fixed:

| Defect | Effect on a company | Fix |
| --- | --- | --- |
| Evaluations listed all 31 catalogue entries, 30 of them unpublished five-minute drafts | The screen read as a marketplace of short tests and contradicted the public site, and 30 rows could not be invited to | `getEmployerCatalog()` now returns only published templates, so the workspace lists what it can actually use |
| API errors returned `err.message` verbatim | Cohort and Compare showed end users the names of environment variables and `.env.local` | The configuration error now logs operator detail server-side and throws a neutral message; both dashboard routes return a fixed string |
| The employer layout sent every unauthenticated request to the workspace root | Signing in from a deep link dropped the requested page | The path is carried from middleware and the layout redirects to it |

Overlays were exercised rather than eyeballed: the invite drawer opens from the top-bar
action and closes on Escape, the candidate preview dialog opens from an Evaluations row,
and the row menu offers preview and invite. No page errors were raised during any of it.

What this does **not** cover, because it needs a real backend: invitation delivery,
session persistence across refresh, authorization boundaries between workspaces, report
generation, and Work Receipt sharing and revocation.

## Claims held back pending owner sign-off

Left out of the shipped copy rather than invented:

- The no-payment, no-contract, 24-hour-report and founder-managed claims previously on
  `/request-pilot`.
- Any specific pricing. `/pricing` now describes founding-pilot scope only.
- Substantive Privacy and Terms text. Both pages describe only what the code does.
- Any third-party certification. `/security` states plainly that none is implied.

## Open item

A development or preview Supabase environment is still needed to verify the authenticated
journeys end to end: refresh persistence, authorization boundaries, invitation delivery,
simulation completion, report generation, and Work Receipt sharing and revocation. The
live project was deliberately left untouched; it holds real organizations and sessions, so
it is not a safe place to seed test candidates.
