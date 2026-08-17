# Current-state visual audit

Branch: `feature/visual-productization`  
Starting commit (branch point): `c265a49` (`Add strangler-fig simulation architecture engine for all RoleKeys.`)  
Working tree at audit start: dirty with prior pilot repairs (identity, workbench routes, unavailable state, availability tests).  
Unit baseline: `npm run test:unit` — **passed** (2026-08-17).

Master brief: `c:\Users\Maahi\Downloads\FYDELL_VISUAL_PRODUCTIZATION_MASTER_PROMPT.md`

## Product truth (do not break)

1. Authentication, authorization, persistence, valid user data.
2. Pilot: one employer cohort, Data Analyst, Northline ops-yield evaluation.
3. Exact Fydell chain mark + lowercase wordmark, Geist, graphite foundation.
4. Migrations `022`–`024` were already applied to production earlier today (user-approved). This visual run applies **no further** production migrations.

## Surfaces inspected

| Surface | Route / source | Visual state | Verdict |
|---|---|---|---|
| Employer shell | `/app/employer/*` (preview) | Grouped rail, identity footer | Functional; density closer to Linear than marketing |
| Employer Home | `/app/employer` | First-run / populated fixtures | Operational console exists; still MVP card grammar in places |
| Workbench (engine) | `/app/employer/workbench/q3-churn-investigation` | Loads client-side; Northline pilot content is **marketing/v3**, engine DA is Q3 churn | Engine workbench is the first visual surface; Northline truth lives in fixtures + v3 |
| Marketing investigation canvas | `HeroSimPreview` + home | Real Northline table, stages, notes | Closest to the brief’s “simulation” visual; still nested-card / uniform type |
| Evidence report (marketing/product) | `ReportInspector` etc. | Claim → source idea present | Thin report hierarchy vs decision-surface requirement |
| Pricing | `/pricing` | Existing page | Needs Guided Pilot / Platform / Enterprise model from brief |
| Candidate | `/app/candidate`, invite | Thin | Lifecycle-aware portal incomplete |

## Why it still reads as MVP (measured against brief)

1. **One device for every job** — bordered graphite panel + small header + muted text + one accent appears on sim, report, changed fact, oral defense, receipt marketing frames.
2. **Weak type-scale contrast** — application surfaces cluster ~12.5–14px; page titles exist but many screens lack a 1.7×+ focal level.
3. **Nested containment** — panels inside panels (especially report and marketing product frames).
4. **Product shown too small on marketing** — framed screenshots / inset compositions reduce legibility.
5. **Simulation immersion gap** — engine workbench has real tools for DA/BI/IC/TSE/BSA, but the pilot Northline narrative is stronger in marketing fixtures than in the engine scenario catalog (`q3-churn-investigation` vs Northline ops-yield).
6. **Status / pill leakage** — improved in places (e.g. fake “Saved” removed from hero sim), still present across console.
7. **Dark mode mistaken for craft** — graphite is correct; hierarchy and deletion are the gap.

## Token layer

Canonical: [`src/app/globals.css`](../src/app/globals.css) (`--color-canvas`, `--color-action`, `text-app-*`).  
Problem: simulation components still use many hardcoded `text-[Npx]` values, forking the semantic scale.

## Routes that will change (this run)

**Phase 2 gate:** no production UI code until a direction is approved.

Then, in order:

1. Simulation workbench shell + DA/Northline investigation composition (engine hosts + shared parts).
2. Evaluation builder, candidate portal, report, oral defense, Work Receipt.
3. Employer Home / evaluations / candidates / reports / settings.
4. Evidence-thread diagrams (code-native SVG/HTML).
5. Public site + pricing.

## Untouched by design intent

- `WorkbenchRunner` live `/sim/[sessionId]` write paths (until persistence cutover is explicit).
- Valid Supabase data.
- Brand mark / wordmark files.
- Empty legacy table generations (do not drop).

## Hard failures already addressed (foundation)

- Workspace unavailable: honest `supabaseAdminStatus` + `WorkspaceUnavailable` (not empty console).
- `/onboarding/employer` reachable again.
- Production RLS migrations 022–024 applied (documented; no further prod DDL in this run).

## Baseline captures

| ID | Path | Notes |
|---|---|---|
| Employer baselines | `docs/screenshots/employer/*`, `docs/screenshots/dashboard/*` | Prior capture set |
| Marketing viewports | `docs/screenshots/*.png` | home, pricing, login, evaluation |
| Workbench | `docs/screenshots/visual-productization/baseline-workbench-q3-churn.png` | Engine DA; may show loading if CSR pending |
| Linear pack | `assets/linear_refs/Linear_Reference_Pack/assets/*` | Local Linear product scenes |

## First-surface decision (locked)

Candidate **simulation workbench** first — not pricing, not employer Home.  
Northline Components operations-performance investigation is the content target; where engine catalog differs, Phase 4 aligns scenario/fixture presentation to Northline truth without inventing a marketplace of roles.
