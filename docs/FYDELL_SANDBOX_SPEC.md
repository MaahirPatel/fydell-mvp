# Fydell Sandbox Specification

Status: **acceptance contract**.

The Sandbox is the Fydell product running against an isolated proof graph. It is
not a demo page, not a marketing simulation, and not a second application.
A visitor in the Sandbox is operating the real interface.

- Reference bands `F1`–`F15`: `STRIPE_REFERENCE_FORENSICS.md`
- Navigation rules `IA-1`–`IA-15`: `FYDELL_APP_INFORMATION_ARCHITECTURE.md`
- Screen contracts: `FYDELL_SCREEN_MAP.md`
- Defects `UI-1`–`UI-15` and anti-slop constraints: `FYDELL_UI_SYSTEM.md`

---

## 1. The three invariants

### SB-A. Shared chrome

Live and Sandbox render the **same shell**: the same rail with the same seven
destinations in the same order, the same toolbar, the same components, the same
tokens, the same geometry bands.

**Test SB-A1.** The ordered array of accessible names in the Sandbox rail is
identical to the Live rail: Home, Roles, Candidates, Work, Evidence, Work
Receipts, Outcomes, Settings.

**Test SB-A2.** For each of the seven destinations, the shell DOM structure
(element order, roles, geometry) in Sandbox is structurally identical to Live.
Only the environment bar content and the record data differ.

**Test SB-A3.** No component renders in Sandbox that does not exist in Live, and
no Sandbox-only layout wrapper exists.

**Current gap.** `SandboxApp` builds a second copy of the shell rather than
mounting the shared one: its own environment bar, its own 224px rail, its own
`h-14` toolbar, its own nav array, its own `max-w-[1320px]` main. The two copies
have already drifted — see the defect table in §7. This is defect **SB-D1**, and
**UI-15** in `FYDELL_UI_SYSTEM.md`.

### SB-B. Explicit environment separation

The environment is stated in persistent chrome, and enforced at the data layer.

**Test SB-B1.** The environment bar is present on 100% of Sandbox routes,
28–32px (F2), token-coloured, stating that the data is isolated demo data.

**Test SB-B2.** Requesting a Sandbox record identifier through a Live API
returns 403 or 404. Requesting a Live record identifier through a Sandbox API
returns 403 or 404.

**Test SB-B3.** No Sandbox record appears in any Live list. No Live record
appears in any Sandbox list. Asserted by comparing returned identifier sets.

**Test SB-B4.** Switching environment preserves the current destination where an
equivalent destination exists. `location.pathname` after the switch resolves to
the same destination, not to Home.

### SB-C. Isolated proof graph

The Sandbox reads and writes the proof graph under
`src/lib/sim-engine/proof/sandbox/` and nothing else.

Permitted surface:

| Module | Role |
| --- | --- |
| `fixture.ts` | `ACME_ROLLOUT_FIXTURE`, `ACME_FIXTURE_VERSION`, `getSandboxFixture` — the only source of Sandbox seed data |
| `steps.ts` | `SANDBOX_STEPS`, `canTransition`, `assertTransition` — the only legal state machine |
| `world-state.ts` | `sandboxWorldStateSchema`, `parseWorldState`, `createWorldState`, `nextWorldState` |
| `events.ts` | `EVENT_STREAMS`, `parseEventContract`, `streamForEventType` |
| `analysis.ts` | `analyzePassA`, `analyzePassB` |
| `receipt-hash.ts` | `canonicalize`, `publicReceiptProjection` |
| `repositories.ts`, `proof-repos.ts` | Sandbox persistence and `ArtifactWorkReceiptIssuer` |
| `kill-switch.ts` | `readSandboxAvailability`, `checkSandboxHealth` |
| `lifecycle.ts`, `cleanup.ts`, `credentials.ts`, `client.ts`, `capability.ts`, `access.ts`, `service.ts`, `view.ts` | Session lifecycle, isolation, and the `SandboxSessionView` projection |

**Test SB-C1.** Static analysis of every module reachable from a Sandbox route
yields zero imports of `WorkbenchRunner`, v2 scoring, live report generation, or
any `sim_session_events` write path.

**Test SB-C2.** Every Sandbox write targets a `proof_*` table. No Sandbox code
path writes to a production simulation table.

**Test SB-C3.** No Supabase migration is introduced by any change made under
this specification.

---

## 2. Demo identities

The Sandbox uses **generic demo identities only**:

```
Candidate 01
Candidate 02
Candidate 03
Candidate 04
```

Four. No more, no fewer. These are labels, not people.

### Rules

1. No named synthetic person appears anywhere in the Sandbox — not in fixtures,
   not in copy, not in transcripts, not in receipts, not in screenshots, not in
   test data.
2. No synthetic photograph, avatar image, or generated portrait. Identity marks
   are initials derived from the label (`C1`–`C4`) or a neutral glyph.
3. No synthetic company other than the fixture's own workspace label. No logos
   of real companies.
4. No synthetic email address that resembles a real person. Where an address is
   structurally required, it is derived deterministically from the label.
5. No biography, no résumé, no location, no tenure, no pronouns. A demo identity
   has a label and a state, and nothing else.

**Test SB-ID1.** Grep across every Sandbox fixture, every Sandbox-rendered
string, and every Sandbox test asset for a personal-name pattern returns zero
matches. The only permitted candidate identifiers are `Candidate 01` through
`Candidate 04`.

**Test SB-ID2.** The count of distinct candidate identities in the Sandbox is
exactly 4.

**Test SB-ID3.** No `<img>` in the Sandbox resolves to a portrait asset.

**Current state.** Conformant. `ACME_ROLLOUT_FIXTURE` in
`src/lib/sim-engine/proof/sandbox/fixture.ts` declares exactly four identities,
`candidate-01` through `candidate-04`, labelled `Candidate 01` through
`Candidate 04`, and the same four labels are the only candidate strings rendered
by `SandboxApp`. No named synthetic person exists in the fixture or in Sandbox
copy. This is a regression test, not an open defect — see **SB-D8** for the
missing assertion.

---

## 3. What the Sandbox may show

The Sandbox demonstrates the product's mechanism. It does not demonstrate
results the product has not produced.

### Permitted

| Category | Permitted content |
| --- | --- |
| Records | Records created by the fixture and by the visitor's own actions in this session |
| States | The literal states in `SANDBOX_STEPS`, reached through `canTransition` |
| Events | Events that pass `parseEventContract`, on the stream given by `streamForEventType` |
| Analysis | Output of `analyzePassA` / `analyzePassB` on fixture data |
| Evidence | Items labelled `OBSERVATION` or `INFERENCE`; outcomes including `INSUFFICIENT_EVIDENCE` |
| Receipts | Receipts issued by `ArtifactWorkReceiptIssuer`, projected through `publicReceiptProjection` |

### Forbidden

| Category | Why |
| --- | --- |
| Any metric the product does not compute | Fabrication |
| Time-to-hire, quality-of-hire, accuracy, correlation, or predictive claims | Not produced by this system |
| Benchmarks, industry averages, percentile ranks | This workspace owns no such data |
| Customer logos, testimonials, counts of customers | Fabrication |
| ATS, HRIS, calendar, or any integration surface | No integration exists |
| Named synthetic people | §2 |
| Aggregate outcome rates | Requires outcome volume the Sandbox does not have |
| "Trusted by", "used by N teams", or any social proof | Fabrication |

**Test SB-P1.** Every numeric value rendered in the Sandbox traces to a fixture
field or to a value computed by a named function in the permitted module surface.
A number with no traceable source is a failure.

**Test SB-P2.** Zero occurrences of an integration name, a company logo, or a
testimonial in any Sandbox surface.

---

## 4. Sandbox screen contracts

Sandbox renders the same seven destinations. Where a destination has no fixture
data, it renders the same `EmptyState` component Live uses.

| Destination | Sandbox source | Contract |
| --- | --- | --- |
| Home | Derived from Sandbox session state | Same triage layout as Live (H-1…H-8). Metric band absent when all values are 0. |
| Roles | `getSandboxFixture` | One fixture role with its evaluation and the simulation subordinate to it (IA-3). |
| Candidates | Fixture identities | Exactly `Candidate 01`–`Candidate 04`, with real session states (C-1…C-7). |
| Work | Sandbox runs | Runs in the states given by `SANDBOX_STEPS`, including non-successful terminal states (W-1…W-7). |
| Evidence | `analyzePassA` / `analyzePassB` | Every item labelled `OBSERVATION` or `INFERENCE`; `INSUFFICIENT_EVIDENCE` renders where applicable (ED-1…ED-7). |
| Work Receipts | `ArtifactWorkReceiptIssuer` | Public receipts resolve only under the Sandbox receipt path; identical canonical hash on internal and public views (WR-1…WR-8). |
| Outcomes | Sandbox outcome records | Renders "no outcome recorded" where none exists. No rate, no forecast (O-1…O-8). |
| Settings | Sandbox workspace | Read-only where a setting has no effect in Sandbox; a setting with no effect is not rendered at all (S-6). |

---

## 5. Session lifecycle

| Property | Contract | Test |
| --- | --- | --- |
| Creation | A Sandbox session is created on the visitor's first action, through `POST /api/sandbox`. | A visitor who has taken no action has no session record. |
| Transition | Every state change goes through `canTransition` / `assertTransition`. | An illegal transition is rejected server-side with a stated reason, not silently ignored. |
| Idempotency | Every action carries an idempotency key. | Replaying the same key does not produce a second state change. |
| Revision | The session view carries a revision that advances on every accepted action. | The client never applies a response whose revision is not greater than the current one. |
| Reset | Reset deletes this visitor's Sandbox records and confirms destructively before doing so. | After reset, requesting any prior Sandbox record ID for that visitor returns not-found. |
| Expiry | Sandbox sessions are cleaned up by `cleanup.ts`. | An expired session's records are unreachable and its receipts return not-found. |
| Kill switch | `readSandboxAvailability` / `checkSandboxHealth` gate every Sandbox route and API. | With the Sandbox disabled, every Sandbox route renders the unavailable surface and every Sandbox API returns 503. |
| Persistence honesty | Sandbox persistence is described as a demo session, never as durable storage. | No Sandbox copy claims saved, permanent, or archived data. |

---

## 6. Polling and motion

| Property | Contract |
| --- | --- |
| Polling | Polling stops when the document is hidden and when the session reaches a terminal state. Backoff is exponential and capped. |
| Autoplay | Any automatic advance is opt-in, pauses when the document is hidden, and is stoppable at any time. |
| Motion | Motion uses `--motion-fast` / `--motion-panel` and `--ease`. No decorative motion. `prefers-reduced-motion` is honoured. |
| Loading | Loading renders `Skeleton` at the true final geometry. No spinner substitutes for a known layout. |

---

## 7. Known defects against this specification

| ID | Defect | Evidence | Required resolution |
| --- | --- | --- | --- |
| SB-D1 | Sandbox reimplements the chrome instead of sharing it. | `SandboxApp` renders its own environment bar, its own `w-[224px]` rail, its own `sticky top-8 h-14` toolbar, its own nav array, and its own `max-w-[1320px]` main, none of which come from `EmployerShell`. | Mount the Sandbox on the shared shell and reduce `SandboxApp` to the data layer (SB-A). |
| SB-D2 | The Sandbox rail has seven items and no Settings. | The `nav` array in `SandboxApp` lists Home through Outcomes; the foot of the rail carries a "Reset demo" button where Live carries Settings and the account menu. | The Sandbox rail is the Live rail: eight entries, Settings last (SB-A1, IA-1, IA-2). |
| SB-D3 | The Sandbox environment bar is outside the token system. | `bg-[#263a5b]` is a hardcoded hex and `text-white/80` carries hierarchy through opacity — the exact pattern already removed from the Live bar. | Use the shared bar. Environment identity resolves from a token; text uses solid token colours (EB-3, EB-4, AS-19, AS-20). |
| SB-D4 | Legacy surfaces remain in the union and remain routable. | `Surface` still carries `overview` and `simulation`; `/sandbox/overview` and `/sandbox/simulation` route and are aliased onto Roles and Work. | Remove both members and both routes (IA-1, IA-15). |
| SB-D5 | The Sandbox has no navigation below 768px. | The rail is `md:flex` and there is no `MobileNav` counterpart, so no destination is reachable on a phone. | The shared shell's mobile navigation applies to both environments (SB-A2). |
| SB-D6 | Reset confirmation uses `window.confirm`. | `SandboxApp.reset()` calls `window.confirm`. | Use the product's `Dialog`, naming what will be deleted (S-7, AS-17). |
| SB-D7 | Unavailable state is an unstyled sentence. | The 503 branch renders a bare `<main>` with one `<p>`, no shell and no recovery action. | Use `EmptyState` within the shared shell, stating the condition and the next action (AS-16). |
| SB-D8 | Sandbox candidate identities are not asserted by a test. | `fixture.ts` correctly declares `Candidate 01`–`Candidate 04`, but nothing prevents a fifth identity or a personal name being added. | Add the SB-ID1 and SB-ID2 assertions to the Sandbox test suite. |

---

## 8. Untouched by this specification

Nothing in this document authorises a change to:

- `WorkbenchRunner`
- v2 scoring
- `sim_session_events` write paths
- live report generation
- production `/sim/[sessionId]` and `/sim/[sessionId]/result` routes
- any Supabase migration

**Test SB-U1.** A diff of any change made under this specification touches no
file implementing the above.

---

## 9. Sandbox acceptance checklist

| ID | Assertion |
| --- | --- |
| SB-A1 | Sandbox rail equals Live rail, same order, same eight entries. |
| SB-A2 | Sandbox shell DOM is structurally identical to Live. |
| SB-A3 | No Sandbox-only component or layout wrapper exists. |
| SB-B1 | Environment bar present on 100% of Sandbox routes, 28–32px, token-coloured. |
| SB-B2 | Cross-environment record access returns 403 or 404. |
| SB-B3 | Zero record identifiers are shared between environments. |
| SB-B4 | Environment switch preserves the destination. |
| SB-C1 | Zero imports of production simulation paths from Sandbox code. |
| SB-C2 | Every Sandbox write targets a `proof_*` table. |
| SB-C3 | Zero Supabase migrations introduced. |
| SB-ID1 | Zero named synthetic people. |
| SB-ID2 | Exactly four demo identities: Candidate 01–04. |
| SB-ID3 | Zero portrait assets. |
| SB-P1 | Every rendered number traces to a fixture field or a named computation. |
| SB-P2 | Zero integrations, logos, or testimonials. |
| SB-U1 | Zero changes to `WorkbenchRunner`, v2 scoring, `sim_session_events` writes, or `/sim/*`. |

### 9.1 Current pass / fail

| Group | State |
| --- | --- |
| SB-ID1, SB-ID2, SB-ID3 | pass |
| SB-C1, SB-C2, SB-C3, SB-U1 | pass |
| SB-A1, SB-A2, SB-A3 | fail — SB-D1, SB-D2, SB-D5 |
| SB-B1 | partial — a bar exists on Sandbox routes but it is a duplicate outside the token system (SB-D3) |
| SB-B2, SB-B3, SB-B4 | unverified — no test asserts cross-environment isolation |
| SB-P1, SB-P2 | unverified — no test asserts numeric provenance |
