# Polish checklist

Acceptance checks from section 17 of the UI contract, with where each one stands. Captures are in `%TEMP%\fydell-audit\ui-contract\before\` and `...\after\` (public, engineer and employer folders, `<route>-<width>.png`; `-y<offset>` files are viewport crops).

| Check | State | Evidence |
| --- | --- | --- |
| Primary task and next action obvious | Builder Report: findings first, source one click away. Employer review: requirements first with the selected requirement's next steps beside it | `after/engineer/app_candidate_projects_1ace0c9d...-1440.png`; `after/employer/app_employer_openings_..._applications_...-1280.png` |
| Readable at 100% zoom | No essential text below 13px on any captured route; 12px only for line numbers and counts | `shots.cjs` logs report `small=0` on every after capture except the demo task's time estimate |
| Hierarchy separates title, finding, body, metadata, controls | rem type steps: page 30px, section 20px, finding 18px, prose 16px, body 15px, controls 14px, metadata 13px | `src/app/globals.css` `@theme` |
| Colour has consistent meaning and measured contrast | Primary text 16.19:1, secondary 6.42:1, tertiary 5.65:1, accent 6.29:1, success 6.76:1, warning 6.84:1, error 6.47:1 on white; control borders 3.06:1 | `src/styles/fydell-tokens.css` comments |
| Status states distinct with explanation | Employer review: Supports it, Relevant but not enough, Not observed, Concern, Waiting on applicant each carry a label, a dot and a sentence | `after/employer/...applications...-1280.png` |
| Keyboard and dialogs | Builder Report drawer opens with focus inside, closes on Escape, returns focus to the finding | `drawer.cjs` run at 390 and 1280 |
| Layout recomposes at 390/768/1280/1440 | Overflow fixed on `/app/candidate` and `/app/candidate/applications` at 768 (tables follow their own width) | `overflow.cjs` reports no overflowing elements |
| Links, buttons and downloads work | 0 broken targets across 121 crawled pages; both export downloads return attachments | `docs/qa/control-inventory.md` |
| No numbered placeholder labels | "Criterion 1" removed from the decision brief; "Requirement 2" removed from the simulation preview | commits 7d48592, 5300511 |
| Marketing: one short heading per section | Homepage headings carry one title with the supporting sentence below at 18px | `after/public/home-1440-y1000.png` versus `before/public/home-1440.png` |

## Required cases

| Case | Where it was checked | State |
| --- | --- | --- |
| Long project title | Builder Report and employer review titles use `overflow-wrap: anywhere` | Verified by code; no long-title fixture in the walk data |
| Large report | Builder Report with grouped findings and a capped reading column | Verified on the walk projects (3 findings each); no 100-finding fixture |
| Missing evidence | Employer review shows "Nothing mapped yet, which is not a negative judgment" and the Not observed state is neutral | Verified |
| Failed import | Not reproduced; needs a failing import fixture | Unverified |
| Unavailable chat | Demo task team panel; not forced offline in this pass | Unverified |
| Empty workspace | Evaluations empty state exists in code; walk workspace is not empty | Partially verified by code |
