# Coworker Chat Audit — Actual Causes of Repetition

## Traced path
Candidate message → `POST /api/sim/sessions/[id]/messages` → `insertMessage` →
`draftReply(stakeholder, text, ctx)` → `selectAuthoredReply` (keyword match) →
`insertMessage` (reply) → `deliverDueProactiveMessages` (time-based nudges)

## Root causes

### 1. Fallback reply is a repeated question
`stakeholder.fallbackReply` = "I can clarify the delivery promise, the incident,
or how big the change should be. What do you need to know?"
This fires on EVERY message that matches no keyword rule. The candidate gets
asked the same question over and over. This is the primary "repeatedly asking
the same questions" behavior.

### 2. No onceOnly on rules
In `engineering-webhook-retry.ts`, NONE of the 6 response rules have
`onceOnly: true`. Asking about "404" twice → identical reply twice.
`usedRuleIds` tracking exists but is unused for these rules.

### 3. No conversation memory
`chat-context.ts` tracks counts (messages, events, elapsed minutes) and ID lists
(answered questions, completed tasks), but NEVER the content of what was said.
- Candidate says "I'm checking the retry path first" → not recorded
- Candidate answers a question → answer content discarded
- Next message has no awareness of prior discussion

### 4. Keyword matching, no intent
`selectAuthoredReply`: `text.includes(keyword)`. 
- "Why did you choose this approach?" vs "Can you explain your reasoning?"
  → different keywords or no match → different/no rule fires
- "I fixed the 404 case" (statement) matches the same rule as
  "What about 404 handling?" (question)

### 5. No coordinator
Each message handled in isolation. `draftReply` receives `usedRuleIds` and
session facts, but NOT the actual conversation history. No one decides:
- Should we respond at all?
- Has this already been addressed?
- Which coworker should speak?

### 6. Proactive nudges ignore activity
`proactive.ts` fires on elapsed time (e.g., 48 minutes) regardless of whether
the candidate is actively working. "Time check" messages feel like nagging.

### 7. Single stakeholder, no role distinction
Webhook scenario has ONE stakeholder (Maya). The spec asks for distinct roles
(teammate with implementation knowledge, product/support with user impact).
Currently one character does everything.

## What works (preserve)
- Idempotent message delivery (`clientMsgId` dedup)
- Outage handling (degraded → outage → session extension)
- Authored fallback when AI redraft fails
- Event sourcing (all messages/events persisted)
- Curveball system (versioned requirement changes)
