# Pilot definition of done

Status values: `PASS` | `FAIL` | `UNVERIFIED`. Cite evidence. Updated 2026-08-11 (same-day full implementation).

## Foundation

- [x] Existing user changes were preserved. - PASS (additive work only; local tooling files left uncommitted)
- [ ] Supabase authentication and refresh remain functional. - UNVERIFIED (manual sign-in smoke still needed)
- [x] Existing valid data was not destructively replaced. - PASS (021 additive)
- [x] Additive migrations apply successfully to a disposable environment. - PASS (applied `october_pilot_cohort` to project `qtrhwrcxthtqvkeerptp`; tables verified)
- [ ] Organization isolation is enforced in RLS/server authorization. - PARTIAL: structural PASS (`npm run test:rls-smoke`); live two-tenant UNVERIFIED (needs `RLS_LIVE_*` credentials)
- [x] Service-role and provider credentials never reach the client. - PASS (server-only admin client pattern retained)
- [x] Production build succeeds. - PASS (`npm run build` exit 0)
- [x] Rollback/deployment assumptions are documented. - PASS (`docs/pilot-runbook.md`)

## Employer flow

- [ ] Employer onboarding persists through refresh/errors. - UNVERIFIED
- [x] Employer dashboard uses real organization data. - PASS (existing + cohort metrics from DB)
- [x] Data Analyst pilot cohort can be opened, paused, and closed safely. - PASS (API `/api/pilot/cohort` + UI `/app/employer/cohort`)
- [x] Candidate invitations are secure and persisted. - PASS (token hash; cohort-bound create)
- [x] Email/link-delivery status is truthful. - PASS (`Link created - not emailed` labels)
- [x] Candidate status updates correctly. - PASS (cohort queue maps invitation/session/report)
- [x] Duplicate active invitations are prevented or explicitly resolved. - PASS (invite API)
- [ ] Refresh/direct navigation preserves employer state. - UNVERIFIED (manual)

## Candidate flow

- [x] Valid invitation opens the correct organization/cohort/evaluation version. — PASS (pinned version on cohort invite)
- [x] Malformed, expired, revoked, and submitted invitations fail safely. — PASS (`invitation-gate` + invite page states; e2e malformed)
- [x] Consent is explicit, versioned, and persisted. — PASS (`candidate_consents` + workbench gate)
- [x] System checks report real results. — PASS (`evaluatePreflight` + `/preflight`)
- [x] Candidate identity status is factual. — PASS (email match language retained)
- [x] Desktop requirement is communicated before the timer starts. — PASS (invite + begin gate)
- [x] Simulation starts once and can be resumed. — PASS (existing startSession idempotent + consent gate)
- [x] Server-authoritative timer does not reset. — PASS (`ends_at`)
- [x] Candidate work survives refresh and interruption. — PASS (state persist + offline retry queue)
- [x] Resources, data tools, stakeholder interaction, notes, and artifact editor work. — PASS (WorkbenchRunner + ops-yield content)
- [x] Curveball changes the task meaningfully and arrives exactly once. — PASS (CAS present + content)
- [x] Final artifact persists as an immutable submitted snapshot. — PASS (existing submissions guard)
- [x] Double/replayed submission is prevented. — PASS (existing submit path)

## Evidence and evaluation

- [x] Meaningful candidate actions are captured as typed, disclosed events. — PASS (events + schema_version)
- [x] Scoring derives from an immutable versioned rubric. — PASS (v2 opportunities/indicators)
- [x] No random/hardcoded/keyword-only/click-count scoring in pilot path. — PASS (v2 deterministic path)
- [x] Deterministic calculations are tested. — PASS (`npm run test:v2`, `npm run test:october`)
- [x] Coverage and confidence remain separate from performance. — PASS
- [x] Integrity remains separate from performance. — PASS (humanReviewRequired separate)
- [x] Every major report claim links to exact source evidence. — PASS (clickable citation anchors)
- [x] Strengths, counterevidence, and missing evidence are represented. — PASS
- [x] AI evaluation structured/versioned/citation-required or human-review fallback. — PASS (human_review_required when low coverage)
- [x] Platform failure does not become negative candidate performance. — PASS (failed report_status)
- [x] No automated rejection occurs. — PASS
- [x] Oral-defense questions use actual candidate evidence. — PASS (`buildDefenseQuestions` + persistence)
- [x] Defense responses/notes preserve collection provenance. — PASS (facilitator attestation)

## Employer decision support

- [x] Report renders from persisted versioned data after refresh/direct navigation. — PASS (EvidenceReport)
- [x] Evidence citations open the correct evidence. — PASS (anchor links)
- [x] Incomplete/failed evidence is labeled honestly. — PASS
- [x] Reviewer notes, overrides, review status, and human decisions persist with audit history. — PASS (decision + influence + pilot_audit_events)
- [x] Candidate comparison works only for compatible candidates in one cohort. — PASS (`/app/employer/compare`)
- [ ] Cross-organization candidate/report access is blocked. - UNVERIFIED live (structural RLS PASS)

## Work Receipt

- [x] Candidate can view and claim a private Work Receipt. — PASS (credential issue path)
- [x] Unclaimed receipts are not public. — PASS (private default)
- [x] Receipt excludes employer-private and raw surveillance data. — PASS (field projection)
- [x] Receipt is not public by default. — PASS
- [x] Candidate can create a restricted, expiring authorized share. — PASS (`sim_receipt_shares`)
- [x] External view reveals only permitted fields. — PASS (`/record/[token]`)
- [x] Candidate can revoke sharing. — PASS (DELETE share)
- [x] Revoked/expired shares stop working immediately. — PASS (`resolveReceiptShare`)
- [x] Sharing and access actions are auditable. — PASS (access log + audit)

## Product quality and operations

- [x] No dead buttons remain in the pilot flow. — PASS (cohort/compare/review wired)
- [x] No fake customer, email, AI, recording, integration, or compliance claims remain. — PASS (homepage/runbook)
- [x] No legacy FDE/finance/Meridian/Relay/six-role/marketplace content in active pilot flow. — PASS (nav CTAs corrected; legacy routes not primary)
- [x] Empty, loading, error, permission, and recovery states exist. — PASS
- [ ] Keyboard focus, semantics, and contrast are usable. - UNVERIFIED (manual a11y pass)
- [ ] Marketing, auth, report-share, and receipt-share pages work responsively. - UNVERIFIED
- [x] Type checking passes. - PASS (`npm run typecheck`)
- [ ] Linting passes. - FAIL/pre-existing: `npm run lint` reports 42 errors, mostly legacy `require()` and React Compiler setState-in-effect outside the new pilot surface; WorkbenchRunner offline persist self-ref fixed
- [x] Automated tests pass. - PASS (`npm run test:release`, `test:rls-smoke`)
- [x] Production build passes. - PASS (`npm run build`)
- [ ] Full staging pilot smoke test is complete. - UNVERIFIED (runbook day-of checklist; needs logged-in employer/candidate)
- [ ] One non-developer can operate the cohort from the runbook. - UNVERIFIED
- [x] Remaining limitations are documented truthfully. - PASS (runbook)

## Opening recommendation

**Code + DB ready for pilot loop.** Migration `october_pilot_cohort` applied; `ops-yield-investigation` published v1; `npm run build` and `npm run test:release` PASS.

**Still before live employer use:** fill `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for local seeding/admin scripts; run day-of smoke from `docs/pilot-runbook.md`; run live two-tenant RLS when `RLS_LIVE_*` credentials exist; treat repo-wide lint debt as non-blocking unless CI gates on it.
