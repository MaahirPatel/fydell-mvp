# Fydell Master Prompt — Phase 2 Verification

**Date:** 2026-10-04
**Scope:** Developer standalone value (imports, claims, profile, sharing)

## 1. GitHub Import (§9)

**Route:** `POST /api/passport/github`

**Verified:**
- ✅ Explicit repository selection (1 to `maxRepositoriesPerImport`)
- ✅ Per-user and per-IP rate limiting (12/min authenticated, 6/min anonymous)
- ✅ Input validation (must be owner/repo format)
- ✅ Scope limits enforced before any GitHub API calls
- ✅ Throttling is per-instance (documented as not a global quota)

**Master prompt §9 compliance:**
- ✅ Minimum read scope (selection is explicit, not indiscriminate)
- ✅ Rate limiting handled
- ⚠️ Contribution vs fork distinction: needs verification in `extract.ts`
- ⚠️ Partial import recovery: needs verification

## 2. Claims and Corrections (§10)

**Routes:**
- `GET /api/passport/corrections` — list filed corrections
- `POST /api/passport/corrections` — file a correction
- `PATCH /api/passport/corrections` — mark resolved with note

**Verified:**
- ✅ Corrections preserve history (stored separately, not rewriting)
- ✅ Employer audit history preserved when corrections filed
- ✅ Resolution appends notes rather than deleting

**Master prompt §10 compliance:**
- ✅ Draft review supported (corrections flow)
- ✅ History preserved on correction
- ✅ Candidate disagreement preserved

## 3. Profile Sharing (§11)

**Routes:**
- `GET /api/passport/shares` — list shares
- `POST /api/passport/shares` — create scoped share
- `GET /api/passport/shares/[id]` — share details

**Verified:**
- ✅ Field-level scope (must include at least "projects")
- ✅ Optional expiry (`expiresAt`)
- ✅ Bearer token URLs (`/p/[token]`)
- ✅ Label for organization

**Master prompt §11 compliance:**
- ✅ Private by default (shares are explicit)
- ✅ Unlisted bearer links (token URLs)
- ✅ Expiry supported
- ✅ Scope is field-level, not all-or-nothing
- ⚠️ Recipient-authenticated sharing: bearer links exist; identity-bound grants need verification
- ⚠️ Revocation behavior: `revoked_grants` table exists; flow needs verification

## 4. Export (§8)

**Route:** `GET /api/passport/export`

**Verified:**
- ✅ Versioned export format (`PASSPORT_EXPORT_VERSION`)
- ✅ Contains only candidate's data + corrections
- ✅ Explicitly excludes employer-private notes and hidden assessment material
- ✅ Downloadable JSON with content-disposition

**Master prompt §8 compliance:**
- ✅ Human-readable evidence summary
- ✅ Provenance preserved (versioned)
- ✅ Limitations: excludes private data by design

## 5. Phase 2 Summary

| Requirement | Status | Evidence |
|---|---|---|
| GitHub import with scope limits | ✅ Verified | Route inspection |
| Claim corrections with history | ✅ Verified | Corrections API |
| Scoped sharing with expiry | ✅ Verified | Shares API |
| Export with provenance | ✅ Verified | Export route |
| No-GitHub path | ⚠️ Unclear | Page not found at expected path |
| Cross-employer reuse | ⚠️ Partial | Tables exist; flow unverified |

**Phase 2 core flows are implemented.** The no-GitHub onboarding path and
cross-employer acceptance flow need verification in a live environment.
