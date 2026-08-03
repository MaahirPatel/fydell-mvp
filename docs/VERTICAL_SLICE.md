# Vertical slice status (pilot flagship)

Goal: prove one complete customer loop before finishing the rest of the platform.

## Loop

Employer workspace → invite → candidate workbench → semantic events → submit → scoring v2 → citation report → Work Receipt

## Flagship

| Field | Value |
|---|---|
| Role | Data Analyst (working assumption until GF confirms) |
| Simulation | The Missing Delays (`missing-delays`) |
| Runtime | `WorkbenchRunner` via `/sim/[sessionId]` |
| Definition | `microToV2` + candidate-safe `workbench` payload |
| Scoring | `runV2Scoring` (`engine_version: "v2"`), micro fallback |
| Report | `EvidenceReportV2` |
| Receipt | `/record/[token]` via share API |

## Acceptance for this slice

- [x] Candidate payload has no answer keys / weights
- [x] Workbench with interactive tables, decisions, deliverable, stakeholder
- [x] Autosave + server timer
- [x] Submit → analyze → performance / coverage / confidence
- [x] Citation-backed result UI
- [x] Work Receipt share link
- [x] Hiring decision UI on employer report (clears needs-review)
- [ ] Live end-to-end with real invite email in staging
- [ ] Hiring-manager trust check on one completed attempt
- [ ] Interrupt / refresh recovery verified manually

## Not in this slice

Full template builder, all 30 deep migrations, public marketing rebuild, six-role flagship depth (Phase 4B).
