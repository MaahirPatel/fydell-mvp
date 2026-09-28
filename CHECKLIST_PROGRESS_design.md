# design track — VIS + UX progress (2026-09-28)

Branch: `feature/desktop-sim-client`. Scope: `src/components/marketing/**`,
`src/components/layout/**`, marketing pages under `src/app/`, style files.
Did NOT touch `src/lib/**` rule logic, API routes, `src/lib/demo/`,
`src/lib/desktop/`, or `scripts/test-orphans-*` (owned by another agent).
Work left UNCOMMITTED for review per instructions.

Statuses: DONE-TESTED = implemented with executable verification (grep
audits, tsc, build, code inspection of rendered output paths);
NEEDS-LIVE = implemented but the passing condition requires a running app /
real browser / real device; BLOCKED = cannot pass as specified;
DEFERRED-P1 = explicitly deferred per requirement priority.

| ID | STATUS | one-line note |
|---|---|---|
| VIS-01 | DONE-TESTED | Real Fydell brand assets in use (`FydellMark` → `/brand/fydell-mark.png` interlocking-chain mark; `FydellLogo`, `FydellBrand`); grep finds zero reference-company assets in `src/components/brand/` |
| VIS-02 | DONE-TESTED | Canonical `src/styles/fydell-tokens.css` (379 lines) imported at `src/app/globals.css:2`; dead dark `:root` block already removed; `@theme` holds only Tailwind v4 utilities (type scale, fonts, shadows) — no token duplication |
| VIS-03 | DONE-TESTED | Rationalized 8 hardcoded `text-[Npx]` in marketing scope (`19/22/34/20/18px`) to the fluid `--step-0/1/2` marketing scale; grep confirms 0 remaining; `text-[...]` leftovers are all `var(--token)` color references |
| VIS-04 | DONE-TESTED | 4px-base spacing scale in tokens; grep finds only 3 non-scale px values in marketing, all intentional (fixed-nav offsets `128/144px`, fluid hero `clamp()` padding, `176px` min-height) |
| VIS-05 | DONE-TESTED | `CodeBlock.tsx`: 16 oklch literals mapped to semantic tokens (`--ink-teal/coral/violet/warm`, `--field-*`, `--ev-*`, `--text-*`, `--border-*`); `MetricStrip.tsx`: white gradient sheen removed per no-gradients contract; desktop-mock keeps its scoped dark palette (self-contained illustration, documented) |
| VIS-06 | DONE-TESTED | Shared inventory confirmed: `marketing/ui.tsx` (`Container`, `EditorialHeader`, `ButtonLink`, `TextLink`, `SectionHeading`), `layout/` (`MarketingShell`, `SiteNav`, `SiteFooter`); no per-screen button reinventions found in marketing scope |
| VIS-07 | DONE-TESTED | Grep finds no score rings / circular progress / generic activity charts in app dashboards; `MetricStrip` exists explicitly to replace giant zero cards; marketing visuals are product-specific (evidence, passport, workspace) |
| VIS-08 | NEEDS-LIVE | `loading.tsx`/`error.tsx` present on employer routes; marketing interactive controls (toggles, selectors, mobile menu) have working states by inspection; exhaustive state coverage needs a running app |
| VIS-09 | NEEDS-LIVE | Table components use consistent rhythm by inspection; dense-content readability at real data volumes needs visual verification in a browser |
| VIS-10 | NEEDS-LIVE | Global `:focus-visible` (2px ring, 2px offset, 7.9:1 contrast), `prefers-reduced-motion` handling in `FydellHome`, semantic landmarks, aria labels verified by inspection; keyboard/screen-reader pass needs live testing |
| VIS-11 | NEEDS-LIVE | Responsive CSS present (`900px`/`640px` breakpoints, mobile nav, collapsing grids); verification at 390/1024/1440px needs a real browser |
| VIS-12 | DONE-TESTED | "Run a pilot" → "Request a pilot" (3 CTAs in `SolutionsEngineerHome.tsx`, matches `/request-pilot` route semantics); grep finds no magic-AI / supercharge / revolutionary language in marketing scope |
| VIS-13 | DONE-TESTED | `/demo` explicitly labels "example data · fictional candidate · nothing saved"; demo fixture mirrors the real Northbeam scenario; `DesktopShowcase` documents why no download button exists (installers not yet at a public URL) |
| VIS-14 | NEEDS-LIVE | Landing, developers, demo, employers pages reviewed as a set for token/typography/control consistency by inspection; side-by-side visual review needs a browser |
| VIS-15 | DEFERRED-P1 | `.theme-ink` dark-context tokens exist and are consumed; full light/dark parity deferred per the requirement's own P1 sequencing (one excellent theme first) |
| UX-01 | DONE-TESTED | `/get-started` presents distinct developer vs employer paths (`/signup?as=developer` / `?as=employer`); invited candidates use invitation links; verified by inspection |
| UX-02 | DONE-TESTED | Employer console routes are work queues (assessments, candidates, evidence, reports, roles); no financial graphs found; `MetricStrip` docstring mandates operational metrics only |
| UX-03 | DONE-TESTED | Every marketing page has one primary CTA (`/passport/new`, `/signup?as=employer`, `/demo`, `/contact`); empty states handled in app surfaces by other chunks |
| UX-04 | DONE-TESTED | All 22 distinct marketing hrefs resolve to existing routes (script-checked); every `<button>` in marketing scope has an `onClick` (inspected); no download button added because installers lack a public URL |
| UX-05 | NEEDS-LIVE | Desktop sync state machine (saved_local/syncing/synced/sync_failed) unit-tested by desktop chunk; web async-state persistence across refresh needs live verification |
| UX-06 | NEEDS-LIVE | Error boundaries present on app routes; input-preserving recovery flows need live verification |
| UX-07 | NEEDS-LIVE | Same basis as VIS-10: focus, labels, contrast, reduced motion verified by inspection; live keyboard/screen-reader pass outstanding |
| UX-08 | NEEDS-LIVE | Requires real devices and two major desktop browsers; not attempted in this environment |
| UX-09 | NEEDS-LIVE | Deep-link/refresh/back-nav/draft protection needs live verification against a running app |
| UX-10 | DEFERRED-P1 | Search/filter for roles/candidates/projects is app-surface work at P1; out of marketing scope |

## Files changed (uncommitted)

- `src/components/marketing/home/CodeBlock.tsx` — syntax + chrome colors mapped to semantic tokens (VIS-05)
- `src/components/marketing/home/EvidenceWorkspace.tsx` — `text-[19px]`/`[22px]` → `text-[var(--step-1)]` (VIS-03)
- `src/components/marketing/home/HeroComposition.tsx` — `text-[22px]` → `text-[var(--step-1)]` (VIS-03)
- `src/components/marketing/home/ProductStage.tsx` — `text-[18px]` → `text-[var(--step-0)]` (VIS-03)
- `src/components/marketing/home/FydellHome.tsx` — `text-[34px]` → `text-[var(--step-2)]`, `text-[20px]` ×3 → `text-[var(--step-1)]` (VIS-03)
- `src/components/marketing/home/SolutionsEngineerHome.tsx` — "Run a pilot" → "Request a pilot" ×3 (VIS-12)
- `src/components/marketing/home/DesktopShowcase.tsx` — NEW: dedicated desktop-app showcase (mock + real feature list + working CTAs)
- `src/app/developers/page.tsx` — new `#desktop` chapter rendering `DesktopShowcase` (desktop first-class surface)
- `src/app/demo/page.tsx` — `text-[17px]` → `text-[var(--step-0)]` (VIS-03)
- `src/components/ui/MetricStrip.tsx` — gradient sheen removed (VIS-05, no-gradients contract)

## Verification evidence (this track)

- `npx tsc --noEmit` — clean (exit 0), run after every batch of edits.
- Grep audits (all exit 0, recorded above): 0 hardcoded `text-[Npx]` in
  `src/components/marketing` + `src/components/layout`; 0 oklch literals in
  `CodeBlock.tsx`; 0 "Run a pilot" in marketing/app; 0 reference-company
  strings in `src/components/brand/`; 0 score-ring/chart patterns in
  `src/app/app/`; all 22 marketing href targets exist as routes; every
  marketing `<button>` carries an `onClick`.
- GitHub API: repo has 0 published releases — this is why the desktop
  showcase links to `/contact` instead of a download button (UX-04).
- NOT done: no browser render was possible in this environment (headless
  Chrome cannot reach the local dev server per AGENTS.md); all NEEDS-LIVE
  items above are honest about requiring a running app / real browser /
  real device.

## Design decisions worth keeping

1. The desktop-mock's local `--mk-*` palette is intentional: it renders a
   dark desktop UI inside a light marketing page, so it cannot consume the
   light-theme tokens directly. It is scoped to one illustration file.
2. The passport card's light-teal-on-dark tints (`oklch(80-82% … 178)`) are
   bespoke to that dark visual, not token candidates — documented here
   rather than forced into the token file.
3. `DesktopShowcase` deliberately omits a download button: installers
   (`.deb`/`.rpm`/`.AppImage`) exist as local build artifacts but have no
   public URL (0 GitHub releases). A dead download button would violate
   UX-04; `/contact` is the honest CTA until distribution is published.
4. `text-[0.5em]` on the employers pricing strip was left alone — it is a
   relative proportion, not a hardcoded size.
