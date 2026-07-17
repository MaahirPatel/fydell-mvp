# FDE rebuild — Milestone 0 baseline

Date: 2026-07-16
Sequence revision: vertical slice first (Relay spike before broad dashboards).

## Stack
- Next.js 16.2.7, React 19, Supabase, Resend, Tailwind 4
- Fonts: Geist Sans + Inter (preserve). Monospace only in Relay code surfaces.
- No Monaco/xterm/Pyodide yet (spike introduces them).

## Feature flags
- `NEXT_PUBLIC_FDE_MARKETPLACE=1` — enables FDE routes when ready
- `NEXT_PUBLIC_RELAY_SPIKE=1` — exposes Relay spike workspace
- `RELAY_EXECUTION=pyodide` — browser worker execution (no host shell)
- Unfinished nav (network browse, partners, outcomes, full graph) stays **hidden** behind flags — no empty “shells wired to queries.”

## Must-fix for rebuild
- Company-only signup → three-path (employer / FDE / partner)
- FP&A Meridian as live product path → Project Relay
- $10 pricing → $2,500 founding pilot
- Fake marketplace data (already largely cleared) — keep zero seed people

## Preserve
- Supabase Auth SSR, email outbox + cron, admin/ops repair + audit
- Dark visual language, gradients, spacing
- Conceptual sequence: observe → change → evidence → receipt → decision

## Obsolete FP&A (remove from customer surfaces after M7)
- Project Meridian finance workroom, forecast/churn copy, /for-finance, sample FP&A report

## Milestone gates (revised)
0 Audit + flags — this doc
1 Relay spike — edit, persist, run allowlisted tests, recover, submit
2 Minimal schema + three-path auth
3 Employer invites one FDE
4 Complete Relay experience
5 Evidence + permissioned Work Receipt
6 Decision + minimal Execution Graph
7 Public FDE rewrite + pricing
8 Network/partners/outcomes — only after core-loop feedback

## Simulation validity workstream (parallel, non-code)
- Interview 5–10 FDE hiring managers / FDEs
- ≥3 expert reviews of Relay
- Define observable behaviors before scoring
- Inter-rater agreement check
- Compare evidence to later interview/job outcomes
- Document accommodations paths
