# Pilot contract (pre-launch)

Status: draft for founder confirmation. Technical build proceeds against Applied Technical Roles; flagship vertical slice is **Data Analyst — The Missing Delays** until GlobalFoundries confirms a different requisition.

## Confirmed product wedge

- Six Applied Technical Roles; curated simulations only (no freeform AI generator).
- Candidate completes credible work in a role workbench; employer reviews citation-backed evidence.

## Pilot assumptions (update when GF confirms)

| Item | Working assumption |
|---|---|
| Role / requisition | Data Analyst (primary); BI Analyst secondary |
| Flagship simulation | The Missing Delays (`missing-delays`) |
| Candidates | Small cohort (5–15) via employer invitation links |
| Mode | Shadow / evidence for interview decisions; Fydell does not auto-advance or reject |
| Who invites | Employer admin in Fydell workspace |
| What hiring manager receives | Citation-backed evidence report + performance / coverage / confidence |
| Decision improved | Who advances to interview / what to ask next |
| Success criteria | Candidate completes without P0 failure; report trusted enough to schedule follow-ups; at least one real-candidate pilot interest |
| Export | In-app report + PDF/print; CSV feedback export for pilot admin |
| Owners | Fydell founder + GF hiring lead (TBD) |
| Support | Email hello@fydell.com; reopen/invalidate attempt via admin if session stuck |

## Engineering invariants (acceptance)

- Published simulation definitions are immutable; edits create a new version.
- Every session stores the exact definition version consumed.
- In-flight sessions never change when a template is edited.
- Semantic events are append-only.
- Submission is transactional and idempotent.
- Timers are server-authoritative.
- Candidate payloads never contain rubrics, weights, or answer keys.
- Cross-tenant RLS: Employer A cannot read Employer B data.
- Every report claim cites a stored event or artifact.
- Technical failures reduce coverage/confidence, not performance.
- Integer 1–100 = performance in this simulation only, not identity or employability.

## Retired-term scan policy

Fail on retired terms in active UX and current product logic. Allowlist: `docs/FYDELL_POLISH_PROMPT.md`, historical migrations, archived DB rows, fixtures labeled legacy.

## Operational readiness checklist

Before October pilot go-live, confirm each item (details in [OPS_RUNBOOK.md](./OPS_RUNBOOK.md)):

- [ ] Production env vars set (`NEXT_PUBLIC_FDE_MARKETPLACE=1`, Resend, Supabase, `CRON_SECRET`)
- [ ] Email domain verified; `/admin/email` outbox processing on cron
- [ ] Migrations applied on staging and production; `verify-migration-state` clean
- [ ] Production backup taken and rollback owner named
- [ ] Admin login + `/admin/repair` smoke-tested (extend invite, retry email)
- [ ] Employer golden path: invite → candidate `/sim/{sessionId}` → report
- [ ] Pilot feedback CSV export tested at `/admin/pilot-feedback`
- [ ] Incident contacts shared with GF hiring lead (hello@fydell.com, P0 escalation path)
- [ ] `ALLOW_DEMO_DATA=false` and no dev seed on production
