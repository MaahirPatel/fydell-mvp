# Design program decisions

Running log of coordinator decisions. 2026-09-28.

- **Spec source**: researched stripe.com, linear.app, figma.com homepages (text fetch; JS-heavy visuals assessed from structure + known design language). Principles extracted, nothing copied.
- **Track boundaries**: marketing routes are top-level (no `(marketing)` group exists). Track A owns `src/app/page.tsx`, public marketing route pages, `src/components/marketing/**`, and `src/components/layout/{MarketingShell,SiteNav,SiteFooter}.tsx`. Track B owns `src/app/app/**`, `src/app/passport/**`, `src/app/get-started/**`, `src/app/dashboard/**`, and all other `src/components/**`. `src/components/layout/LenisProvider.tsx` is global — neither track touches it. `src/app/globals.css` and `src/styles/fydell-tokens.css` are coordinator-owned: workers add scoped styles via CSS modules, never edit tokens. (If a token addition is truly needed, worker reports it and coordinator applies.)
- **Brand mark**: chain-mark from `public/brand/` is the approved asset (founder-approved via earlier branding commit). Master prompt's "rings logo" note refers to the same asset family; keeping chain-mark.
- **Typefaces**: repo's intentional Geist Sans/Mono system kept per master prompt ("if the repository already has an intentional, licensed font system that fits, keep it").
- **/download honesty**: buttons link to the real GitHub Releases page; explicit "installers publish with v0.1.0" state until release pipeline exists. Not dead buttons — they go somewhere real and say exactly what to expect.
- **Metric strip**: real numbers only. Workers must source every number from the repo (scenario count, route count, etc.) or omit it.
- **Desktop theme**: retheme to light per founder instruction (overrides earlier dark desktop). `desktop/src-tauri/**` and `tauri.conf.json` untouched — frontend-only change.
- **No commits**: all tracks leave the tree uncommitted and reviewable. No `git add -A` anywhere.

- **Dead marketing components removed** (coordinator): 13 unreferenced files in `src/components/marketing/home/` (AppliedAiHome, SolutionsEngineerHome, HeroComposition, HeroShortlistScene, HomeMotionController, HomeProductStory, NarrativeScenes, PrincipleDiagrams, ProductFrame, SharingPreview + 3 CSS modules). Verified zero references incl. no dynamic imports before deleting. Kept HeroEvidenceScene/HeroSimPreview/ProductStage/CodeBlock/EvidenceWorkspace/DesktopWorkspaceMock (all referenced).
- **StatusTag/EmptyState light fix** (coordinator): Track B left these as dark-era rgba; on light surfaces `text-[#9db1ff]` was unreadable and white washes invisible. Remapped StatusTag tones to light field/ink tokens (active→field-blue/ink-blue, changed→status-attention, risk→surface-counter/fydell-risk, good→status-positive, neutral→surface-selected). EmptyState wash → surface-panel. Admin surfaces (`src/components/admin/*`) intentionally left dark — separate internal tool, out of scope.
- **EvidenceTrace hover** (coordinator): `hover:bg-[rgba(255,255,255,0.045)]` → `hover:bg-[var(--surface-hover)]` to match selected state on light surfaces.
- **desktop/DESIGN_SYSTEM.md**: status header + §1/§3/§5/§8 updated to reflect the landed light retheme; dark-era values marked historical. Inventory/gaps/states matrix kept as current reference.
