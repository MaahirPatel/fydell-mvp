# Product visual manifest

| # | Visual | Source route / component | Fixture | Viewport | Capture | Marketing use |
|---|---|---|---|---|---|---|
| 1 | Employer Home populated | `/app/employer` | `FYDELL_UI_PREVIEW` active | 1440 | `docs/screenshots/dashboard/home-1440.png` | — |
| 2 | Employer Home empty | `/app/employer` | preview empty | 1440 | `docs/screenshots/dashboard/home-empty-1440.png` | — |
| 3 | Engine workbench baseline | `/app/employer/workbench/q3-churn-investigation` | engine DA | 1440 | `docs/screenshots/visual-productization/baseline-workbench-q3-churn.png` | — |
| 4 | Marketing investigation | `/` `HeroSimPreview` | Northline | 1440 | `docs/screenshots/visual-productization/baseline-marketing-home.png` | Hero / story |
| 5 | Direction A contract | comps | Northline intent | 1440/1280 | `docs/screenshots/visual-productization/directions/direction-a-*` | Contract only |
| 6–15 | Remaining golden-path states | TBD after workbench pass | Northline / sim_* | 1440/1280 | pending | Evidence, defense, receipt |

Capture command (preview):

```bash
npm run dev:preview -- --port 3201
# then Playwright or browser screenshot into docs/screenshots/visual-productization/
```
