# Wave 1 contract

Frozen 2026-08-14. No implementation may invent a competing local version of routes, permissions, envelopes, lifecycle labels, tokens, breakpoints, or the DA-01 fixture.

No implementation begins until this file and `src/lib/contracts/` agree. Agents consume these sources. They do not invent competing statuses or tokens.

## Absolute routes

Public: `/`, `/product`, `/simulations`, `/trust`, `/request-pilot`, `/login`, `/signup`, `/privacy`, `/terms`, `/security`.

Employer (auth + org member): `/app/employer`, `/app/employer/assessments`, `/app/employer/candidates`, `/app/employer/reports`, `/app/employer/settings`.

Candidate: `/invite/[token]`, `/sim/[sessionId]`, `/sim/[sessionId]/result`, `/record/[token]`.

Do not write employer paths as `/assessments` or `/candidates`. Ownership, auth, data source and empty/error expectations live in `WAVE1_ROUTE_OWNERSHIP`.

Empty: honest empty state. Error: stable `code` + safe `message`. Unauthorized: redirect to `/login?next=`.

## Permissions

See `src/lib/contracts/permissions.ts`.

| Action | owner | admin | reviewer | viewer | candidate |
|---|---|---|---|---|---|
| invite / revoke invitation | yes | yes | no | no | no |
| view report | yes | yes | yes | yes | no |
| release report / record decision | yes | yes | yes | no | no |
| workbench / submit | no | no | no | no | yes |
| create / revoke receipt share | no | no | no | no | yes |
| manage members / edit workspace | yes | yes | no | no | no |

## API envelope

See `src/lib/contracts/api.ts`. Frontend never branches on raw Supabase or Resend text.

## Lifecycle → label → action

See `src/lib/contracts/lifecycle.ts`. A copyable link is not an emailed invitation, and neither may display as delivered without provider confirmation.

Required invitation UI distinctions, mapped to existing backend fields (`status` + `email_delivery`):

- Invitation record created
- Email queued
- Email sent
- Email delivered (only where provider confirmation exists)
- Email not configured
- Copyable development/test link available
- Email failed
- Invitation opened
- Invitation accepted
- Invitation expired
- Invitation revoked

## Design tokens / breakpoints / controls

`src/lib/contracts/tokens.ts`, `breakpoints.ts`. Geist Sans + Geist Mono. Display `clamp(3.75rem, 6vw, 5.5rem)`.

Control states: default, hover, pressed, selected, focus-visible, disabled, loading, error.

Icon family: Lucide, stroke 1.5. No component-local arbitrary font sizes. Public body not below 15px. WCAG 2.2 AA.

Product-frame sidebar, if visible, is Home / Evaluations / Candidates / Reports / Settings. Do not invent a three-item marketing sidebar unless it is visibly cropped.

## DA-01 fixture

Slug `ops-yield-investigation`. Analysis engine pinned to `v2`. Content version `northline-ops-yield@3.0.0`. Keyword micro-scoring is a defect, not a fallback. If v2 fails, the attempt is `analysis_failed` / `review_required` / `report_status=failed`. Never present keyword scoring as equivalent.

Typed views: `Da01InvitationView`, `Da01AttemptView`, `Da01ReportView`, `Da01ReceiptView`.

## Feature flags

`FYDELL_UI_PREVIEW=1` for synthetic UI only. `SIMULATION_V3_ENABLED` does not rewire the live workbench in Wave 1.

## Demo data

Northline is labeled synthetic. No fake customers, completion counts, or certifications.

## Retention

No automatic deletion window. Delete on request. Receipt revoke is server-side and immediate.

## Audit and analytics

See `src/lib/contracts/events.ts`.

## Keep / rebuild / delete

See `src/lib/contracts/inventory.ts`.

Preserve existing APIs, persistence, URLs and valid production data for invitations, the workbench, reports and Work Receipts. Rebuild or restyle their frontend presentation to the Wave 1 system. Repair every broken or misleading behavior in the DA-01 loop.

## Out of Wave 1

The other 17 simulations, the AI generator, Stripe, and the 30/60/90 outcome system stay scheduled, not faked.
