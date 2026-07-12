# Button / route audit (pilot critical path)

| Control | Route | Backend | Loading | Failure |
| --- | --- | --- | --- | --- |
| Sign up | `/signup` → `POST /api/platform/signup` | Supabase Auth + profile + onboarding row | button disabled | inline error |
| Sign in | `/login` → `POST /api/platform/login` | SSR session + role resolver | button disabled | inline error / confirmation |
| Auth callback | `/auth/callback` | `exchangeCodeForSession` | n/a | `/auth/link-invalid` |
| Onboarding continue | `/onboarding/employer` → `POST /api/pilot/onboarding` | save_step / complete txn | saving flag | inline error |
| Invite candidate | Dashboard modal → `POST /api/pilot/invites` | candidate+invitation+assignment+outbox | busy | inline error |
| Accept invite | `/candidate/invite/[token]` | consent + link auth user | busy | error / login redirect |
| Start Meridian | `/candidate/assignments/[id]` | `startPilotSession` idempotent | start click | error |
| Autosave | same | `autosavePilotSession` + version | Saving… | Save failed |
| Submit | same | submit txn + report placeholder | click | error |
| Approve org | `/admin/repair` | `POST /api/admin/repair` | click | error JSON |
| Sign out | shell | `POST /api/platform/logout` | n/a | soft ignore |

No production route may fall back to `dashboard-demo.ts`.
