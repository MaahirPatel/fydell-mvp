# Paid-product readiness

State of the product after the visual and productization upgrade. Written to
be useful to whoever picks this up next, which means the unfinished parts are
here too.

Companion documents: `docs/paid-product-baseline.md` records where this
started, `docs/ui-slop-audit.md` tracks the named visual defects, and
`docs/design-system.md` describes the tokens and primitives.

## What changed

**Public site.** Every major page now shows the product rather than describing
it. The homepage leads with a report you can click into. Product is three
chapters ending in an interactive walkthrough from source material to a cited
claim. `/simulations` became the detail page for the one released evaluation
instead of a catalogue of one. Trust was rewritten against an audit of the
schema and the row-level policies, which meant deleting claims that were not
true. Signup and login gained a product scene so they are an entrance rather
than a form on a dark page.

**Employer app.** Home, Evaluations, Candidates, Reports and Settings were
rebuilt in both empty and populated states. Evaluations is a detail view
rather than a one-row list. Candidates consolidated four status columns into
one stage, and becomes a card list below the width where a table stops being
readable. Nothing shows a grid of zeros as though it were a metric.

**Candidate path.** The invitation, the pre-start screens, the result and the
shared receipt now use one shell and the shared components. The Work Receipt
gained the controls the backend always supported. The oral defense became
visible to the person being asked to defend their work.

## Verification

Run against the preview server (`npm run dev:preview`).

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | Clean |
| Retired terms and em dashes | `npm run test:copy` | Clean |
| Scoring determinism | `npm run test:v2` | Pass |
| Micro scoring | `npm run test:sims` | Pass |
| Redirect safety | `npm run test:auth` | Pass |
| Pilot validation and lifecycle | `npm run test:unit` | Pass |
| Production build | `npm run build` | Pass |
| Accessibility, 20 routes | `npm run test:a11y` | 0 findings |
| Responsive, 18 routes at 390/768/1280/1440 | `npm run test:responsive` | 0 defects in 72 renders |

The accessibility audit covers contrast against the nearest painted ancestor,
heading order, accessible names, alt text, focus visibility on every tab stop,
and reflow at 200 percent zoom. The responsive audit covers horizontal
overflow, light slabs on the graphite canvas, console errors, non-200
responses, and text below 11.5px.

Screenshots are in `docs/screenshots/` for public pages, `employer/` for the
authenticated app in both empty and populated states, and `candidate/`.

## Defects found and fixed beyond the visual brief

These were found while auditing surfaces that had never been looked at,
because they could not be rendered without a database.

**A permanent public link to every result.** Scoring minted a share token for
every session, stored in plain text on `sim_sessions.share_token`, serving the
full unredacted result at `/results/[token]` to anyone holding the URL, with
no expiry and no way for the candidate to withdraw it. No one asked for it and
nothing told the candidate it existed. No longer minted. Tokens already issued
still resolve, so links handed out before this keep working, and that page now
says what kind of link it is.

**The oral defense answer key was readable by the candidate.**
`GET /api/sim/sessions/[id]/defense` selected whole rows and returned them,
including `expected_understanding`, which describes what a good answer looks
like. The endpoint authorizes the candidate as well as the employer. Responses
are now projected to the fields the caller needs.

**Finishing an evaluation stranded you.** The completed list on the candidate
home rendered the title and date with no link to the result, and the receipt
number was listed separately with nothing to open.

**A share model that silently disabled the other one.** Creating a Work
Receipt nulled the credential's legacy share hash while the UI still offered
both as peers.

## Blockers

### Cannot be closed without a database

No safe Supabase environment was available for this work, so these are
verified by reading the code rather than by running it. They need a run
through before a customer sees them.

1. The complete loop from workspace creation to Work Receipt has not been
   executed end to end. Every screen in it has been rendered against fixtures
   and every server path has been read, but that is not the same thing.
2. The Work Receipt share list, create and revoke calls have not been run
   against real rows. The list endpoint is new.
3. The candidate oral-defense POST has not been run. It writes through
   `saveDefenseResponse`, which is already exercised by the employer path.
4. Invitation delivery, expiry and single-use enforcement are unverified in
   this pass.
5. `npm run test:rls-smoke` and `npm run test:pilot-golden-path` both need a
   live project and have not been run.

### Commercial

1. **No published terms of service.** `/terms` says what governs a pilot today
   and does not invent anything, which is the right interim position, but
   self-serve paid subscriptions cannot open against it.
2. **No retention policy.** Evaluation data stays until someone asks for it to
   be deleted, and deletion is done by hand. Both `/privacy` and `/trust` now
   say so plainly. A fixed window needs to exist before a security review.
3. **No self-serve export.** Same position: honest on the page, still manual.
4. **No SOC 2 and no penetration test.** Stated on `/trust` rather than
   implied away.
5. **Legacy share tokens are still live.** Existing rows in
   `sim_sessions.share_token` remain readable. A migration should either null
   them or move them behind the revocable receipt model.
6. **Email delivery is not configured in every environment.** Invitations can
   land in `not_configured`, which the employer app now surfaces as a stalled
   candidate rather than hiding.

### Product

1. **One released evaluation.** The employer Evaluations screen is honest about
   this and names what is in development, but a buyer hiring for anything other
   than a data analyst has nothing to run.
2. **The workbench keeps its own light surface.** This is deliberate, for
   reading dense material over twenty minutes, and its surrounding screens were
   brought onto the shared chrome. The work surface itself has not been
   rebuilt on the design system, and it is roughly 2,400 lines.
3. **Desktop only for candidates.** The timed session requires 1024px. The
   invitation says so before anyone commits time to it.

## Preview mode

The authenticated and candidate surfaces are auditable without a backend:

```
npm run dev:preview            # populated workspace
npm run dev:preview -- --empty # new workspace, empty states
```

Fixtures live in `src/lib/dev/preview.ts` and are refused when `NODE_ENV` is
`production`. They cover the employer data layer, the evidence report, the
oral defense set, the candidate result and the receipt share list.
