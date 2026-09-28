# Checklist progress — chunk-platform (SEC / OPS / BILL / DATA / DEMO backend)

Branch: `feature/desktop-sim-client`. Worker: chunk-platform subagent. Date: 2026-09-27.

Test commands (all green):
- `npx tsx --conditions react-server scripts/test-platform-grind-security.ts` — 94 assertions
- `npx tsx --conditions react-server scripts/test-platform-grind-billing.ts` — 35 assertions
- `npx tsx --conditions react-server scripts/test-platform-grind-ops.ts` — 55 assertions
- `npx tsx scripts/test-platform-grind-data.ts` — 34 assertions
- `npx tsc --noEmit` — **fails overall** (46 errors, all in other chunks' in-progress files: invitations/employer/grants/orgs/passport/permissions/sim + narrow2.tmp.ts); **zero errors in chunk-platform files**.
- `npm run verify:migrations` — fails closed: "Missing Supabase URL or service role key" (no live Supabase in this environment).

| ID | STATUS | one-line note |
|---|---|---|
| SEC-01 | MANUAL-OK | docs/DATA_FLOWS.md maps auth/hosting/storage/email/model/execution recipients, scope, retention; counsel review NEEDS-LIVE |
| SEC-02 | MANUAL-OK | docs/PRIVACY_NOTICE.md draft (collection, AI use, sharing, rights, demo); counsel review NEEDS-LIVE, no certifications claimed |
| SEC-03 | MANUAL-OK | docs/CUSTOMER_TERMS.md draft (roles, allowed use, subprocessors, DPA/breach); counsel review NEEDS-LIVE |
| SEC-04 | DONE-TESTED | Code-audit test: no getDisplayMedia/getUserMedia/mediaDevices in src/ |
| SEC-05 | DONE-TESTED | secret-scan lib + repo-wide scan (0 real secrets; doc fixtures allowlisted); log redaction tested |
| SEC-06 | DONE-TESTED | Access-abuse matrix: orgA/B, candidateA/B, anonymous, revoked member denied across api/storage/export |
| SEC-07 | DONE-TESTED | Validation, HTML escaping, safe-Markdown renderer (hostile input escaped), redirect allowlist, secure-cookie defaults |
| SEC-08 | DONE-TESTED | Per-route throttles (login/invite/upload/import/ai/sandbox/demo_reset) with quota, window-reset, per-identity buckets |
| SEC-09 | DONE-TESTED | Data-request state machine + fulfillment checklist (db/objects/jobs/vendors/backups); vendor automation NEEDS-LIVE |
| SEC-10 | DONE-TESTED | Revocation registry; new imports/shares blocked, in-flight jobs re-check before publish |
| SEC-11 | MANUAL-OK | Env separation documented; fixtures are fictional; live env/credential separation NEEDS-LIVE |
| SEC-12 | MANUAL-OK | docs/INCIDENT_RESPONSE.md (roles, containment, rotation, evidence, comms); named responder + drill NEEDS-LIVE |
| SEC-13 | DEFERRED-P1 | SSO/SCIM/regional hosting only when a buyer requires it |
| OPS-01 | DONE-TESTED | Structured JSON logger, correlation IDs (header reuse/mint), secret redaction at write time |
| OPS-02 | MANUAL-OK | Correlation-ID + attempt/report reference plumbing done; visible support channel copy is design-owned |
| OPS-03 | DONE-TESTED | Operator recovery actions (retry/extend/quarantine/reissue/credit) require actor + reason; external sends need deliberate confirmation; audit-logged |
| OPS-04 | DONE-TESTED | Feature-flag kill switch for evaluator + per-scenario; held-not-failed semantics; actor/reason history |
| OPS-05 | MANUAL-OK | docs/SERVICE_TARGETS.md draft targets; p50/p95 measurement NEEDS-LIVE |
| OPS-06 | DONE-TESTED | Per-attempt cost caps (model calls, compute, storage, email); over-cap runs blocked for operator review |
| OPS-07 | DONE-TESTED | Idempotency guard: retries return original outcome, no duplicate submissions/billing; full restart drill NEEDS-LIVE |
| OPS-08 | MANUAL-OK | No known blocking defects in platform slice; final launch sign-off needs full-tree review |
| BILL-01 | MANUAL-OK | docs/BILLING_POLICY.md: Stripe hosted checkout or manual invoice; terms/payer/scope/currency/refund explicit |
| BILL-02 | MANUAL-OK | Card collection is Stripe-hosted only; no card data stored (architectural, code-verified); secrets server-only |
| BILL-03 | DONE-TESTED | Webhook signature verified via real Stripe SDK path with test secret; wrong/tampered/stale rejected |
| BILL-04 | DONE-TESTED | Event-id dedupe (stripe_webhook_events); duplicates + out-of-order reconciled, no double credit |
| BILL-05 | DONE-TESTED | Plan inferred from Stripe price IDs server-side; checkout line items from server config, never client input |
| BILL-06 | DONE-TESTED | Usage ledger (entitlement/usage/credit/adjustment); idempotent usage; retry reuses key (no double charge); credits need actor+reason |
| BILL-07 | DONE-TESTED | Lifecycle: success, payment failure (no entitlement change), canceled checkout ignored, delayed event, repeat deduped, refund recorded |
| BILL-08 | MANUAL-OK | Receipts via Stripe customer portal route; billing support route NEEDS-LIVE confirmation |
| BILL-09 | DEFERRED-P1 | No self-service subscription UI beyond Stripe portal |
| DATA-01 | DONE-TESTED | Entity coverage asserted across migrations (users/orgs/invites/billing/audit + new security/ledger tables) |
| DATA-02 | DONE-TESTED | Ownership boundaries in access-guard policy + RLS (service-role only) on new tables |
| DATA-03 | DONE-TESTED | Unique/idempotency/check constraints asserted (no orphan charges, no duplicate grants/events) |
| DATA-04 | MANUAL-OK | Version pinning modeled in 025_proof_graph (other chunk); evaluation-version recording not re-verified here |
| DATA-05 | MANUAL-OK | Server authz + RLS on new tables; full path audit (views/RPCs/realtime/exports) NEEDS-LIVE |
| DATA-06 | NEEDS-LIVE | Private-bucket posture must be verified against the live Supabase project |
| DATA-07 | NEEDS-LIVE | verify:migrations fails closed without creds; run against staging; migration recovery plan documented in checklist note below |
| DATA-08 | NEEDS-LIVE | No staging env: restore drill not performed (per task brief) |
| DATA-09 | MANUAL-OK | docs/RETENTION_SCHEDULE.md with periods + exceptions; automated deletion jobs NEEDS-LIVE |
| DATA-10 | MANUAL-OK | Indexes on hot lookups in 030/031; latency/storage monitoring NEEDS-LIVE |
| DEMO-05 | DONE-TESTED | Demo guard blocks email/paid-jobs/charges/live-writes; reset route scoped to registered demo_* namespaces; throttled |
| E2E-14 | DONE-TESTED | Payment journey in-process: success/failure/cancel/delayed/repeat/refund, correct entitlement, no duplication |
| E2E-16 | DONE-TESTED | Anonymous demo -> signup: fictional artifacts dropped, live profile contains no fixture data |

## Notes / blockers for parent

1. **Migration number collision (needs parent resolution):** this chunk wrote
   `supabase/migrations/030_platform_security.sql` and `031_billing_ledger.sql`
   per its brief, but the tree also contains `030_submit_transfer_state.sql`
   and `031_passport_sharing_corrections.sql` from other chunks. Duplicate
   version numbers will break ordered migration runs — renumber before merge.
2. **WIP checkpoint commit:** commit `cc8bb75` (made by another process during
   the session) swept in-progress files, including this chunk's rewritten
   `src/app/api/billing/webhook/route.ts`. This chunk itself did not commit.
3. **tsc:** 46 errors, all in other chunks' in-progress files
   (invitations/employer/grants/orgs/passport/permissions/sim, plus
   `narrow2.tmp.ts`); zero in chunk-platform files.
4. **Secret-scan calibration:** the repo scan flags the AWS documentation
   example key (`AKIAIOSFODNN7EXAMPLE`) in another chunk's test and treats it
   as an allowlisted doc fixture; fabricated `FAKE`/`EXAMPLE`-marked values
   are allowlisted; `.next` dev runtime chunks are excluded via the
   node_modules path filter while app bundles remain scanned.
5. **DATA-07 recovery plan:** migrations are additive (`create table if not
   exists`, `on conflict do nothing` seeds); recovery = re-run `supabase db
   push` / `verify:migrations`; no destructive resets. Live verification
   still NEEDS-LIVE.
