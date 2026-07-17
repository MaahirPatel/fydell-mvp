# Checkpoint B — Manual golden-path verification

Manual script for walking the full employer → FDE → evidence loop end to end in a browser.
This is not automated — run it by hand after any change that touches signup, missions,
invites, or the Relay session flow.

## Prerequisites

- `.env.local` has `NEXT_PUBLIC_FDE_MARKETPLACE=1` (required — without it, post-login routing
  falls back to the legacy/unaffiliated path instead of `/app/employer` or `/app/fde`).
- Supabase is configured (`NEXT_PUBLIC_SUPABASE_URL` / keys set) so `/signup` actually creates
  accounts.
- Use **Chrome or Edge** for the FDE workspace steps — the preflight check will block other
  browsers (see step 6).
- Use two different browser profiles (or one normal + one incognito window) so you can be
  signed in as the employer and the FDE at the same time.

## 1. Employer signs up

1. Go to `/signup`, create an account with a test email + password.
2. You should land on `/signup/role`. Choose **Employer**.
3. You should be redirected into `/app/employer`. If your org has no missions yet, you should
   see the "Nothing to review yet" / empty Mission Control state with a clear **Create mission**
   CTA — not a fake candidate list.

## 2. Employer creates and submits a mission

1. From Mission Control, click **Create mission** → lands on `/app/employer/missions/new`.
2. Fill in title, objective, and (optionally) customer context / success measures.
3. Submit. This both creates the mission and immediately submits it for review
   (`action: "submit_review"`), so it comes back as **Under review** — no separate ops step is
   required before you can invite.
4. You should land on the mission detail page (`/app/employer/missions/[id]`) showing the
   mission and an **Invite an FDE** section.

## 3. Employer invites an FDE

1. On the mission detail page, fill in the FDE's name and work email, click **Invite**.
2. You should see a one-time **accept URL** (`/s/[token]`) rendered on screen with a
   **Copy link** button — copy it. The page states the link also appears in the FDE's Action
   Inbox once they sign in, even if they never check email.
3. Open the accept URL in the FDE's browser session (second profile / incognito).

## 4. FDE accepts the invitation

1. The `/s/[token]` page shows the mission title/objective and an **Accept invitation** button.
   If not signed in, use **Need an account?** to sign up, or **Sign in first** if you already
   have one — both preserve `?next=` back to the invite link.
2. After signing up/in as the FDE (choose **FDE** on `/signup/role` if new), click
   **Accept invitation**.
3. You should be redirected to the consent screen (`/s/[id]/consent`), which explains Project
   Relay: a 55-minute simulated deployment session running real Python in the browser (no
   install).
4. Back in `/app/fde`, the invitation should also be visible from the **Action Inbox** and
   `/app/fde/invitations`.

## 5. FDE reviews consent, starts preflight

1. From consent, continue to `/s/[id]/preflight`.
2. Confirm the page explicitly calls out that Chrome or Edge is required and mentions Project
   Relay running real Python via Pyodide.
3. Checks should run automatically (browser, WebAssembly, storage, network) but **the 55-minute
   timer must not start yet** — only clicking the explicit "Start session" control should begin
   it.
4. If you intentionally test in an unsupported browser (e.g. Firefox/Safari), you should see a
   clear red "This browser isn't supported" banner telling you to switch to Chrome or Edge, and
   the browser check should show as failed in the checklist.

## 6. FDE works in the workspace

1. Click through to `/s/[id]/workspace`. Confirm the Monaco editor loads with the seeded repo
   files.
2. Edit a file, save, and run the test command from the terminal panel. Confirm output is
   captured (pass/fail).
3. Optionally trigger the mid-session curveball (if scripted into the session) and confirm the
   FDE can respond and keep editing.
4. Use the customer chat panel to send at least one message.

## 7. FDE submits

1. From the workspace, submit the session. Confirm you land on `/s/[id]/submitted` and cannot
   re-edit afterward. A second submit attempt (e.g. re-POSTing) should be idempotent — it returns
   the same already-submitted session rather than creating a duplicate submission.
2. Back in `/app/fde/simulations`, the session should now show a resumable/"submitted" status,
   and the entry should link out via `/s/[id]/...` (resolved through `stageForStatus`) rather
   than a dead link.

## 8. Employer sees the evidence and records a decision

1. As the employer, go to `/app/employer/evidence`. The session should now appear in the list
   (no longer the empty state) with status **Awaiting evidence** or **Evidence ready** depending
   on how far findings generation has progressed.
2. Open the session (`/app/employer/evidence/[sessionId]`). Confirm you can see the evidence
   findings/artifact for that specific session (not a mocked/generic report).
3. Record a decision (advance / pass) if the decision control is available on this build.

## Known limitations (honest)

- Findings generation is rule-based v1 — it is not a substitute for human review, and the UI
  should not claim otherwise.
- Partner accounts are still gated behind `/account/setup-required?reason=partner_pending`;
  there is no self-serve partner flow yet.
- The preflight browser check is a simple user-agent sniff, not a real capability probe — it
  will not catch every environment that technically can't run Pyodide reliably, and it can be
  spoofed by editing the UA string.
- Email delivery for invites is not verified end-to-end in this script; the manual "Copy link"
  path is the reliable one to use for a demo.
- This script assumes a single organization/employer and a single FDE per pass — it does not
  cover concurrent invites, revocation, or expiry edge cases.
