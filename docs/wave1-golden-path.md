# Wave 1 golden-path and adversarial gate

The complete DA-01 path must pass **twice** without database repair, manual state edits, or developer intervention.

## Required recorded runs

1. Fresh-browser full run: signup → workspace → invite → accept → workbench (autosave) → submit → report → receipt share → revoke.
2. Recovery run: refresh or temporary interruption during active work, then finish the same loop.

Record for each run:

- Browser session
- Timestamps
- Invitation outcome (`created` / `not_configured` / `sent` / `failed` — never “delivered” without provider confirmation)
- Analysis engine and version (`v2` only for DA-01)
- Report ID
- Receipt revocation result

A copyable development link is not an emailed invitation.

## Adversarial cases (Wave 1, not later extras)

- Expired invitation
- Revoked invitation
- Already-used token
- Unauthorized candidate/session access
- Cross-organization report access
- Failed invitation write
- Resend
- Refresh during active work
- Temporary offline state
- Conflicting autosave revision
- Double-click / duplicate submission
- Analysis failure (must become `analysis_failed` / `review_required` / `report_status=failed`, never keyword scoring)
- Report still processing
- Citation that no longer resolves
- Revoked Work Receipt link
- Removed workspace member
- Empty workspace
- No Resend configuration

## Visual approval

Regenerating screenshots does not constitute approval. Compare against the baseline and reject any page that still resembles the pre-Wave-1 layout, contains miniature unreadable product UI, or combines excessive empty space with cramped content.

Required captures: first viewport and full page; 100% and 200% zoom; loading / empty / error / populated; menu/modal; selected evidence claim; autosave failure; report processing; revoked receipt. No console or hydration errors. Manual keyboard review and an automated accessibility scan are part of the handoff.
