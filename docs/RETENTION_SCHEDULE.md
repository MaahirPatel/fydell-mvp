# Fydell retention schedule (DATA-09) — DRAFT

Last drafted: 2026-09-27. Enforcement: automated deletion jobs are NEEDS-LIVE
(staging verification required); until then, retention is enforced by
documented manual runs plus the deletion-request process.

## Retention periods

| Data | Retention | After expiry |
|---|---|---|
| Candidate account + profile | Until deletion request, or 24 months of inactivity | Delete/anonymize; confirm vendor erasure |
| Passport evidence / selected GitHub findings | Until deletion request or account deletion | Delete; shared copies already delivered to employers are handled per employer retention below |
| Simulation attempts, submissions, artifacts (source ZIPs, transcripts) | 24 months after attempt close, or contract term + 12 months for employer records | Delete objects + rows |
| Evaluation runs/results, reports | 24 months (evidence for hiring decisions) | Anonymize aggregates; delete raw |
| Employer reviewer notes / decision history | Duration of customer contract + 24 months | Delete on verified request unless legal hold |
| Invites / applications | 24 months after decision | Delete |
| Billing records (invoices, ledger) | 7 years (tax/legal) | Aggregate only; no personal identifiers beyond legal need |
| Usage ledger entries | 7 years (financial record) | Same as billing |
| Security audit events | 24 months (incident investigation) | Delete; incident-linked slices may be held longer with documented reason |
| Operator action log | 24 months | Delete |
| Application logs (structured) | 90 days | Delete; secrets redacted at write time |
| Email delivery logs (vendor) | Per vendor default (see vendor tracing) | Vendor erasure on request |
| Database + object backups | 30 days rolling | Expire automatically; never surgically edited |
| Demo fixtures | Ephemeral; resettable at any time | Reset wipes namespace |

## Exceptions

- **Legal hold:** documented hold suspends deletion for the named scope only.
- **Anonymized aggregates:** statistics with no re-identification path may be
  retained beyond these periods; the anonymization method is documented per use.
- **Deletion requests:** fulfilled against live systems immediately; backups
  expire on the 30-day schedule and subject data is never restored from backup
  (see `src/lib/security/data-rights.ts` BACKUP_EXPIRY_NOTE).

## Enforcement status

- [x] Schedule documented (this file)
- [x] Deletion-request fulfillment checklist covers all surfaces
  (`src/lib/security/data-rights.ts`)
- [ ] Automated deletion jobs with staging verification — NEEDS-LIVE
- [ ] Actual backup-restore drill proving expiry — NEEDS-LIVE (DATA-08)
