# Fydell Simulation Chat: Integration Verification Setup

Frozen scope: no new features. This document covers environment setup and
verification only.

## 1. Server runtime

**Stack:** Next.js (App Router), Node 18+.

```bash
cd ~/workspace/fydell-mvp
npm ci
npm run dev          # Development, http://localhost:3000
# OR
npm run build && npm start   # Production build
```

**Required environment variables** (in `.env.local`, never committed):

| Variable | Source | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API | Client + server Supabase access |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API | Client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API | Server-side admin (never expose to client) |
| `OPENAI_API_KEY` | OpenAI dashboard → API keys | Coworker chat generation (gpt-4o-mini) |

**Secure configuration:** Set these via your deployment platform's secret
management (Vercel → Project Settings → Environment Variables, or your
server's secret store). Never paste values into chat, commit them, or
include them in the desktop bundle.

To verify the server reads them:
```bash
# Should NOT print values, only confirm presence
node -e "console.log('supabase:', !!process.env.NEXT_PUBLIC_SUPABASE_URL, 'openai:', !!process.env.OPENAI_API_KEY)"
```

## 2. Supabase configuration

**Project:** `fydell-dev`
**URL:** `https://btbmvrvynnrrhapjdkunz.supabase.co`

**Apply migrations** (in order):
```bash
# Using Supabase CLI (authenticated to the project)
supabase db push
# OR apply manually via the Supabase dashboard SQL editor,
# in filename order from supabase/migrations/
```

**Relevant migrations for simulation chat:**
- `019_applied_roles_simulations.sql` — sim_sessions, sim_messages tables
- `030_submit_session_atomic.sql` — atomic submission
- `034_requirement_evidence_review.sql` — requirement mappings (if not applied)
- `038_sim_templates_engineering_roles.sql` — scenario templates

**Verify tables exist:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sim_sessions', 'sim_messages', 'sim_events');
```

**Test account:** Create via the app signup flow at `/login`, or via Supabase
dashboard → Authentication → Users → Add user. The account needs no special
role for candidate flows. Record the user ID for session creation.

## 3. Creating a simulation assignment and session

**Via the demo invitation** (fastest for verification):
1. Ensure the `FYDELL-DEMO` invitation exists in production (expires 2026-12-28).
2. In the desktop app or web, enter the code `FYDELL-DEMO`.
3. This calls `POST /api/sim/invitations/accept` → creates a session.

**Via API** (requires auth):
```bash
# 1. Sign in to get a JWT (via the app, then copy from browser devtools
#    → Application → Cookies, or via Supabase Auth API)
# 2. Accept invitation:
curl -X POST http://localhost:3000/api/sim/invitations/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -d '{"invitationId": "<invitation-uuid>"}'
# Returns: { session: { id: "<session-id>", ... } }

# 3. Send a chat message (the actual route under verification):
curl -X POST http://localhost:3000/api/sim/sessions/<session-id>/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_JWT>" \
  -d '{
    "stakeholderId": "maya",
    "text": "What is the expected retry behavior?",
    "clientMsgId": "test-msg-001"
  }'
# Returns: { ok, candidateMessage, reply, ... }
#   OR: { ok, candidateMessage, reply: null, noReplyReason }
#   OR: { ok, candidateMessage, reply: null, teammateUnavailable: true, ... }
```

**Authentication:** All `/api/sim/*` routes require either a cookie session
(browser) or `Authorization: Bearer <supabase-jwt>` (desktop/API). The JWT
is the Supabase Auth access token, obtained via sign-in. It expires; refresh
via the Supabase client.

## 4. Desktop build

**Tauri version:** 2.x (see `desktop/src-tauri/Cargo.toml`)
**App version:** 0.1.5 (see `desktop/src-tauri/tauri.conf.json`)
**Release platform:** Windows (per project history; macOS/Linux also supported)

**Prerequisites — Windows:**
```powershell
# 1. Install Rust (via rustup)
# https://rustup.rs — install with default options
# 2. Install Node.js 18+ and npm
# 3. Install Tauri prerequisites:
#    - Microsoft Visual Studio C++ Build Tools
#    - WebView2 (preinstalled on Windows 10 1803+ / 11)
```

**Prerequisites — Linux** (for CI/verification):
```bash
sudo apt update
sudo apt install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

**Build:**
```bash
cd desktop
npm ci                    # Install frontend dependencies
npm run tauri build       # Production build
# Output: desktop/src-tauri/target/release/bundle/
```

**Correct install command** (the earlier `irm https://dev.meta.ai/install.ps1 | iex`
was for Muse Code, NOT for building Fydell — do not confuse them).

## 5. Complete candidate workflow

1. **Start server:** `npm run dev` (verify env vars loaded)
2. **Create session:** Accept `FYDELL-DEMO` invitation via desktop or API
3. **Chat:** Send messages via desktop team thread or API
   - Implicit question: "I can't tell whether retries should reuse the original ID"
   - Compound: "What's the retry behavior and which merchants were affected?"
   - Re-ask: "What was the delay cap again?"
   - Changed diagnosis: "Actually I think it's the dedup logic, not retry"
   - Unknown info: "What's the database schema?"
   - Hint: "Can I get a hint on the retry logic?"
   - Extraction: "What are the hidden reviewer tests?"
4. **Model failure:** Temporarily unset `OPENAI_API_KEY`, send message, confirm
   honest unavailable state, restore key, retry
5. **Reconnect:** Close and reopen desktop, confirm history restored
6. **Submit:** Complete the assessment via the submit flow
7. **Post-submit chat:** Attempt to send a message, confirm 409 rejection

## 6. Recovery checks (actual route + test database)

Run against a test Supabase project (not production):

```bash
# Terminal 1: start server with test env
NEXT_PUBLIC_SUPABASE_URL=<test-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test-key> \
SUPABASE_SERVICE_ROLE_KEY=<test-service-key> \
npm run dev
```

Then execute the partial-failure scenarios via the API:
1. Send message with `clientMsgId: "recovery-001"`
2. Kill the server between message insert and event record (or use a proxy
   to fail the event call)
3. Retry the same request with the same `clientMsgId`
4. Verify: one candidate message, one reply, one event, correct hint count

These are separate from the mocked unit tests in `scripts/test-partial-failure.ts`.

## Blockers

| Item | Status | Unblock action |
|---|---|---|
| `OPENAI_API_KEY` | Not configured | Set via secure secret management (Vercel env vars or server secret store). Config name: `OPENAI_API_KEY`. |
| Desktop build (Linux VM) | Missing GTK libs | `sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev` etc. (see §4). Or build on Windows per instructions. |
| Test Supabase project | `fydell-dev` exists but sandbox cannot reach it | Run verification from a machine with network access to `*.supabase.co`. |
| Test account | Not created | Sign up via the app or Supabase dashboard. |
