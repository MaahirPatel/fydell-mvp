# Customer brief (synthetic)

Enterprise operations handles thousands of support and incident tickets.
They want an AI-assisted triage workflow before a production pilot.

## Goals
- Classify incoming tickets
- Extract structured fields
- Recommend a next action with evidence
- Abstain when confidence is insufficient
- Preserve human approval for sensitive actions

## Constraints
- Do not auto-execute refunds, account locks, or data deletion
- Log abstentions
- Prefer precision over recall on P0/security tickets
