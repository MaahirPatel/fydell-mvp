# Passport sharing and portability boundaries (PASS-05 / PASS-06 / PASS-07, GH-11)

## Private by default

There is no searchable public profile and no automatic employer access.
A passport becomes visible to anyone else only when the candidate creates a
share link. Before creating it, the candidate sees exactly what the link
reveals (`describeShareGrant`): audience label, included fields, and expiry.

## Scoped sharing

Each share link specifies:

- **Audience** — a free-text label (e.g. "Acme Corp — backend role").
- **Included fields** — a subset of `projects`, `evidence`, `roles`,
  `capabilities`. Email is never included; `PassportData` has no email field.
- **Expiry** — optional, validated (future date, max 366 days). Expired
  links resolve as `expired`, not as the passport.
- **Revocation** — any link can be revoked instantly; revoked links resolve
  as `revoked`.

Excluded by construction: employer-private notes live in
`employer_passport_reviews` and hidden assessment material lives in the
simulation tables. Neither is reachable from the share projection
(`projectForShare`), which only copies allowlisted passport fields.

## Portability boundaries

- **Revocable hosted access**: share links are revocable at any time.
- **Retained application records**: when an employer opens a share link and
  records a decision or downloads the passport, that copy becomes their own
  retained application record. Revocation stops future access through the
  link; it cannot retract copies already downloaded or decisions already
  recorded. This is stated in the revocation response (`PASS-07`).

## Removal and disconnect (GH-11)

- **Remove a project** (`DELETE /api/passport/projects?repo=…`): deletes the
  imported snapshot and its findings from Fydell's servers. It does not
  delete the public GitHub repository. Existing share links stop showing the
  project; employers keep copies they already downloaded.
- **Disconnect GitHub** (`DELETE /api/passport/github`): removes the linked
  GitHub username so future imports are not associated with it. Passport
  imports use the public API — no GitHub credential is stored, so there is
  no token to revoke. Imported projects stay until removed individually.
- **Reimports** mark older snapshots `stale` instead of deleting them, so
  previously shared records keep resolving to the evidence they cited.
