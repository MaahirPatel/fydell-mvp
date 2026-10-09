# Handoff (pause on Oct 9, 12:15)

Source of truth: `docs/IMPLEMENTATION_CHECKLIST.md`. Resume by reading it, then `git log --oneline -30`.

## Agents running at pause

| Agent | ID | Task |
| --- | --- | --- |
| G | 3341446e-bfcc-42ea-9d51-dda211e46a9f | Synthetic showcase engineer through the real pipeline; colour pass on profile and report; browser proof of relationship, contribution and corrections |
| S | 3eceb2a5-04c3-4987-a963-e638241845fe | Validated scenario packages per role; journeys 8, 9 (one crash point left: no evaluation after kill post-queue), 10 |
| F | edc43321-6ba2-4d47-9ae6-a0644a8ab423 | Desktop submit with same receipt on desktop, web, employer; local handoff drafts; restore `fydell://` handler to the installed app |
| B | 01bf3ba2-b5a4-4af0-b723-30fee1ea4c94 | Employer workflow (long run). Next: role links, interrupted signup, queue, decision brief, export |
| D | a23ba678-3d7b-470e-bddf-22a7f08407ed | UI contract. Next: settings, billing, admin, auth, product pages, control crawl |

## Release steps (not yet done)

1. Review agent reports against the checklist.
2. Apply to prod (`qtrhwrcxthtqvkeerptp`), one at a time after reading each: 081, 085, 086, 087, 088, 089, 090, 091, 092, 093, 094, plus any newer.
3. Production build in a `%TEMP%` worktree, `npx --yes vercel deploy --prod --yes`, smoke test.
4. Background jobs: generate a new `CRON_SECRET`, set it in Vercel and copy it to the clipboard. The owner pastes it into Vault in the Supabase SQL editor (see `docs/operations/admin-guide.md`), then runs `select public.fydell_schedule_workers();`.
5. Owner: turn on Supabase "Confirm email" and set the signup template link (admin guide).
6. Push main to GitHub after prod matches.
7. Send the owner the test guide.

## Decisions

- Stay on Groq. Gemini and Cerebras providers exist (`MODEL_PROVIDER`); switch later.
- Deferred: Stripe, code signing, GitHub App, CLI.
- Local installer: `Downloads\Fydell_0.1.6_x64-setup.exe` (prod only, unsigned).
- The dev watchdog runs hidden (`.scratch/dev-watchdog.ps1`); stop it when done.

## After pause

- Agent S finished (a1984e9, migration 094). Open: real-model chat evidence (needs Groq quota), desktop client submission id (agent F), authorization and cache templates.
- Agent B finished (a092358, 8b90863; migrations 081, 092). Open: customized simulation template blocked by Groq rate limit; interrupted signup on a role link; teammate lacks decision permission in walk data; E9 (employer reading a share against a role) not walked.
- Agent D finished (1ec4ba7, d47f06e, 9d15a6b). Open: assessments page naming and breadcrumb; criteria truncated mid-word in attempt results; work-sample creator summary shows defaults before a track is chosen; Input lacks aria-describedby; admin routes unverified.
