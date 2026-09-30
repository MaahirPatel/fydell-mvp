# Scenario catalog

Source of truth: `src/lib/scenario-catalog/families.ts` (typed by
`schema.ts`, checked by `npm run test:catalog`). This page summarizes it;
if they disagree, the code wins and this page is stale.

**No family is published.** One scenario runs end to end; thirteen are
substantive blueprints that are not yet runnable. An entry existing does not
mean a role is supported.

## Status per family

| Family | Initial scenario | Effort | Status | Runnable | Employer availability | Next blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Backend | Webhook retry incident (INC-2291) `1.0.0` | 60 min | `expert_review` | yes | `pilot_unreviewed` (invitable, disclosed) | SCEN-09: qualified independent review |
| Full-stack / product | Refund request silently fails | 75 min | `draft` | no | unavailable → role request | Starter, protected tests, fixtures |
| Forward-deployed / integration | Customer inventory sync with a messy supplier API | 90 min | `draft` | no | unavailable | Fixture API server; allowlisted loopback in runner |
| Frontend | Search combobox loses results and traps keyboard users | 60 min | `draft` | no | unavailable | Starter; accessibility-specialist review |
| Applied AI | Support assistant cites the wrong policy | 75 min | `draft` | no | unavailable | Stub model, held-out cases |
| Data engineering | Daily revenue job double-counts and drops late orders | 75 min | `draft` | no | unavailable | Data fixtures, reconciliation tests |
| ML engineering | Churn model looks great offline, fails in production | 75 min | `draft` | no | unavailable | Synthetic dataset generator |
| MLOps / model serving | Canary model shipped without a rollback path | 75 min | `draft` | no | unavailable | Traffic simulator, metric fixtures |
| Platform / DevOps / SRE | Connection pool exhaustion after a config rollout | 60 min | `draft` | no | unavailable | Load simulator, incident fixtures |
| Mobile | Checkout loses the cart after backgrounding offline | 75 min | `draft` | no | unavailable (device runtime required) | No emulator/device farm |
| QA / test automation | Find and report defects in a booking API | 60 min | `draft` | no | unavailable | Reference, seeded and hotfix builds |
| Application security | Invoice download exposes other customers' invoices | 60 min | `draft` | no | unavailable | Lab app; security-engineer review |
| Systems / embedded | Sensor frames corrupted under burst traffic | 75 min | `draft` | no | unavailable | Deterministic preemption harness, C toolchain |
| Game / graphics | Physics jitters and tunnels at low frame rates | 75 min | `draft` | no | unavailable | Harness, traces, C++ toolchain |

Implementation order (priority field): backend (1) → full-stack, FDE (2) →
frontend, applied AI (3) → data, ML, QA (4) → MLOps, SRE, mobile, security,
embedded, game (5).

## What every blueprint contains

Business situation, candidate role, starter assets, intended problem, in/out
of scope, 2–3 personas (each with what they know, what they do not know, and
escalation behaviour), clarification facts, one requirement update with its
trigger and evaluation relevance, expected artifacts, rubric dimensions with
demonstrated / partial / not-demonstrated anchors (at least one hard-skill
dimension), at least two valid approaches, at least two defective fixtures,
and explicit runtime needs.

The schema rejects an entry missing any of these, so an empty folder cannot
be marked as covered.

## Honest scope statements

Every family carries a `scopeDisclosure` saying what the initial task does
**not** cover. The ones the prompt called out:

- **Platform / DevOps / SRE:** one isolated service incident; not cloud IAM,
  networking at scale, on-call design or the full role.
- **Mobile:** headless logic tests do not validate on-device behaviour; the
  runtime requires a physical device or emulator farm, so the lifecycle
  refuses publication until that exists.
- **Application security:** one seeded vulnerability in a closed lab; not
  penetration testing, cloud security or security operations.
- **Systems / embedded:** a host harness simulates preemption; it does not
  reproduce real hardware timing.
- **Game / graphics:** CPU-only deterministic harness; any GPU variant needs
  `remote_container_gpu` and stays unpublishable until that exists.
- **Applied AI:** a deterministic stub model; results do not predict any live
  provider. The older browser-sandbox prototype (`sim-engine`
  `ai-workflow-hardening`) is a different runtime and is not counted.

## Availability semantics

- `published`: passed automated validation, a qualified independent expert
  review, and a deliberate human publication action (`isPublished`).
- `pilot_unreviewed`: runnable, passed automated validation, and currently
  invitable in the product, but expert review is pending. Always returned
  with a disclosure; never labelled published.
- `unavailable`: blueprint only. Role intake records a `role_requests` row
  instead of offering it.
