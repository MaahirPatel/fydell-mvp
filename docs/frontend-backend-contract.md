# Frontend–backend contract

Stable shapes the frontend and desktop can build against. Types live in
code (named per endpoint); this page is the index. Do not copy these shapes
into a second schema file: import the types.

## Conventions

- **Errors:** `{ "error": "<readable message>", "code": "<category>", ...details }`.
  `error` stays a string so existing clients keep working. Codes:
  `unauthorized` (401), `forbidden` (403), `not_found` (404),
  `validation_failed` (400), `criteria_rejected` (422), `conflict` (409),
  `quota_exceeded` (402/429), `retryable_provider_failure` (503, with
  `retryable: true`), `unavailable_capability` (501/409). Older `/api/sim/*`
  routes return `{ error }` without `code`; new and touched routes add it.
- **Idempotency:** mutating calls take a client id (`clientMsgId`,
  `clientEventId`, `clientRunId`, or the `Idempotency-Key` header). A
  replay returns the original result, never a second effect.
- **Order:** server sequence (`seq`) or server timestamps. Never client clocks.
- **Delivery:** at least once. Clients dedupe; there is no exactly-once claim.
- **Auth:** cookie session (web) or `Authorization: Bearer <supabase access
  token>` (desktop). Authorization is enforced server-side and in RLS; hidden
  UI controls are not security.

## New on this branch

### Role catalog — `GET /api/employer/role-intake`

Org members only. Returns every family's employer-safe summary
(`CatalogSummary` in `src/lib/scenario-catalog/index.ts`):

```jsonc
{ "ok": true, "families": [{
  "family": "backend", "label": "Backend engineering",
  "scopeDisclosure": "…", "scenarioId": "webhook-retry-incident",
  "scenarioTitle": "…", "scenarioVersion": "1.0.0", "templateSlug": "webhook-retry-incident",
  "effortMinutes": 60, "responsibilityTags": ["…"], "stackTags": ["python", "…"],
  "capabilitiesAssessed": ["…"], "capabilitiesNotAssessed": ["…"],
  "runtimeConstraints": "…",
  "rubric": [{ "key": "correctness", "label": "…", "kind": "hard_skill" }],
  "validationStatus": "expert_review",
  "availability": "pilot_unreviewed",   // published | pilot_unreviewed | unavailable
  "disclosure": "…",                    // non-null for pilot_unreviewed
  "blockers": ["…"]
}]}
```

No answer keys, fixtures, valid approaches, clarification answers or the
intended defect are included (tested).

### Role intake — `POST /api/employer/role-intake`

Roles `owner`, `admin`, `hiring_manager`. Optional `Idempotency-Key` header
(8–80 of `[A-Za-z0-9_.:-]`). Body is `RoleIntakeInput`
(`src/lib/employer/intake.ts`):

```jsonc
{
  "title": "Senior Backend Engineer, Payments",
  "family": "backend",                  // a family key, or "other" + customFamily
  "responsibilities": ["…"],            // 1–8
  "stack": ["Python"],                  // 0–12
  "level": "senior",                    // entry | mid | senior | staff | unspecified
  "autonomy": "independent",            // guided | independent | leads_others | unspecified
  "jobDescription": "…",                // optional, untrusted, ≤ 20000 chars
  "needToLearn": ["…"],                 // 1–6
  "criteria": ["…"], "mustHaves": ["…"],
  "effortLimitMinutes": 90,             // 15–240
  "deadline": "2026-10-15",             // optional
  "aiPolicy": "documentation_only",     // none | documentation_only | assistants_allowed_disclosed
  "workPractices": ["Clarifies ambiguous acceptance requirements"],
  "accommodationContact": "talent@example.com"
}
```

Responses:

- `200` → `{ ok, screening[], recommendations[], unavailable, roleRequest, intakeId, roleRequestId, persisted, replayed }`.
  Each recommendation is a `CatalogSummary` plus `matchingResponsibilities`,
  `unmatchedResponsibilities`, `stackOverlap`, `fitsEffortLimit`.
  `roleRequest` is non-null when the family is unavailable, custom, or the
  stack is not covered; a `role_requests` row is stored.
- `422 criteria_rejected` → `{ screening[] }` with a reason per rejected item.
  Nothing is stored. Items with `needs_clarification` are accepted but are
  never converted into assessment criteria.
- `400 validation_failed` → `{ issues[] }`.

### Event replay — `GET /api/sim/sessions/{id}/events?after=<seq>&limit=<n>`

Candidate of the session only. `after` defaults to 0; `limit` ≤ 200.

```jsonc
{ "ok": true,
  "events": [{ "seq": 6, "type": "curveball_presented", "actor": "system",
               "at": "2026-09-29T12:00:06Z", "data": { "curveballId": "retry_after_rollout" } }],
  "cursor": 7,        // pass back as `after`
  "hasMore": false }
```

Visible types and fields: `session_started`, `curveball_presented`
(`curveballId`), `curveball_acknowledged`, `message_sent` / `message_received`
/ `proactive_message_delivered` (`stakeholderId`), `deadline_extended`
(`extraMs`, `reason`, `newEndsAt`), `teammate_service_outage` /
`teammate_service_recovered`, `test_run_completed` (`runId`, `snapshotHash`,
`status`, `summary`), `submission_confirmed`. Other events advance the cursor
but are not shown. Source: `src/lib/simulations/event-replay.ts`.

Recommended client loop: on reconnect or wake, call with the last stored
`cursor` until `hasMore` is false, then fetch messages for any
`message_*` events.

## Existing endpoints the desktop uses (unchanged)

| Purpose | Endpoint |
| --- | --- |
| Config / version gate | `GET /api/desktop/config`, `GET /api/desktop/version` |
| Sign-in code exchange | `POST /api/auth/desktop/exchange` |
| Invitations | `GET /api/sim/invitations/mine`, `GET/POST /api/sim/invitations/{token}`, `POST /api/sim/invitations/accept` |
| Session bootstrap | `GET /api/sim/sessions/{id}` (includes `filePackage`) |
| Consent, preflight, start | `POST /api/sim/sessions/{id}/consent`, `/preflight`, `/start` |
| Working state (CAS on revision) | `PATCH /api/sim/sessions/{id}/state` (read via the session GET) |
| Events (write) | `POST /api/sim/sessions/{id}/events` |
| Team | `GET/POST /api/sim/sessions/{id}/messages` |
| Requirement update | `POST /api/sim/sessions/{id}/curveball` (`present` / `acknowledge`) |
| Practice runs | `POST/GET /api/sim/sessions/{id}/runs` |
| Submit and receipt recovery | `POST /api/sim/sessions/{id}/submit`, `GET/POST /api/sim/sessions/{id}/finalize` |
| Employer report | `GET /api/sim/sessions/{id}/report` (held until review release) |

## Known contract debts

- `GET /report` returns `recommendation` (`advance | review |
  further_evidence_required`). The prompt forbids automatic hire/reject
  outcomes; removing it needs a coordinated frontend change.
- `sim_messages` has no server sequence; order is `created_at`.
- The attempt state machine in the prompt (`provisioning … withdrawn / expired`)
  is not yet represented in `sim_sessions.status`.
