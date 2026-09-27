# Fydell customer terms — data responsibilities (SEC-03) — DRAFT

> **Status: draft. Not legal advice. Must be reviewed by qualified counsel
> before first paid contract. No certifications or blanket compliance claims
> are made.**

Last drafted: 2026-09-27.

## 1. Roles

- **Fydell** processes candidate and workspace data as a processor/service
  provider on the employer's instructions, and as a controller for its own
  account, billing, and security operations.
- **Employer customers** are responsible for: lawful basis/notice to
  candidates they invite, the content of their reviewer notes and decisions,
  and designating which team members may access candidate data (roles are
  enforced in-product: member / reviewer / admin / owner).
- **Candidates** control their passport evidence and sharing scope; sharing
  with an employer organization is explicit and revocable.

## 2. Allowed use

The service may be used for engineering hiring evaluation only. Customers must
not: attempt to access other organizations' data, upload malicious content
(hostile uploads are rejected per E2E-08 handling), or use candidate data for
purposes beyond hiring evaluation without candidate consent.

## 3. Subprocessors

Current subprocessors: Supabase (auth/database/storage), hosting provider,
Resend (email), Stripe (payments), the configured model provider, and the
sandbox execution provider. Fydell will notify customers of subprocessor
changes before they take effect — NEEDS-LIVE: confirm notification mechanism.

## 4. Data processing terms (where required)

Where applicable law requires data-processing terms, Fydell will execute them
with the customer before processing candidate personal data. NEEDS-LIVE: DPA
template and regional hosting options (SEC-13) are prepared when a buyer
requires them — they are not pre-claimed.

## 5. Security measures (summary, not exhaustive)

TLS in transit; secrets server-side only (never in frontend bundles or git
history); Row Level Security plus server-side access checks on every path;
immutable audit events for security actions; revocation honored in new
processing; short-lived signed URLs for private artifacts. See
`docs/DATA_FLOWS.md` and `docs/INCIDENT_RESPONSE.md`.

## 6. Breach notification

Fydell will notify affected customers of a confirmed personal-data breach
without undue delay, with what happened, what data was affected, what we did,
and what the customer should do — per `docs/INCIDENT_RESPONSE.md`. NEEDS-LIVE:
confirm jurisdiction-specific timelines with counsel.

## 7. Retention, return, deletion

On contract end or verified request: workspace data is exported on request,
then deleted per `docs/RETENTION_SCHEDULE.md`. Backups expire on schedule.
