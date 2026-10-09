# Control inventory

Crawled on October 9, 2026 against the shared dev server with the employer and engineer walk accounts and signed out. The crawler opens every internal page it can reach from the seeds, records each link and button, then requests every internal link target without following redirects. Source was also scanned for `href="#"`, `javascript:` links, empty click handlers and download links.

| Scope | Pages opened | Unique link targets | Broken targets (4xx/5xx) | `#` or empty links | Unnamed controls |
| --- | --- | --- | --- | --- | --- |
| Signed out (marketing, auth) | 21 | 31 | 0 | 0 | 0 |
| Employer walk account (workspace and Demo workspace) | 63 | 176 | 0 | 0 | 0 |
| Engineer walk account | 37 | 117 | 0 | 0 | 0 |

Source scan: no `href="#"`, `javascript:` links or empty click handlers outside `lab` and `prototypes`.

Downloads: all five download links point at two endpoints, and both return real attachments for the signed-in engineer: `/api/account/export` (JSON account export) and `/api/passport/export` (JSON Passport export).

Destinations reached by several labels were reviewed by hand. Each one is the same real page reached from navigation, a card and a call to action (for example `/signup` from Sign up, Sign up free and Create account), so none of them is a generic catch-all.

## Findings

| Route | Control | Failed check | Fix or owner |
| --- | --- | --- | --- |
| `/app/employer/assessments` | Breadcrumb | Shows "Overview" because the route is not in the workspace navigation, so it falls back to the first item | Owner of `src/lib/workspace/navigation.ts`: add the route or map it to Assessments |
| `/app/employer/assessments` | Navigation label versus page title | Rail says Assessments, page says Evaluations | Product agent (naming) |
| `/pricing` versus `/app/employer/settings?section=plan` | Choose Starter, Choose Team | Settings offers checkout whenever billing is configured, while Pricing states checkout is not open; true today only because production billing is off | Owner decision before billing goes live |
| `lab/code-workspace` (internal) | Verify remaining proof, Create verification workspace, Copy verification link | "Verification" wording on synthetic sandbox work | Not linked from the product; retire with the lab page |
| Fixed in commit 8e00250 | Sign-in showcase | Decorative code sample took a Tab stop | Showcase is `inert` |
| Fixed in commit 8e00250 | Pricing plan actions | Starter and Team looked purchasable | Labelled Checkout not open with a contact route |
| Fixed in commit 7d48592 | Global error page support link | Pointed at an address nobody reads | Uses the configured contact address |
