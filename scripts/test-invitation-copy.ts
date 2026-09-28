/**
 * Invitation email copy: describes the real assessment and escapes
 * employer/candidate-supplied values (SEC-07).
 * Run: npx tsx scripts/test-invitation-copy.ts
 */
import { invitationEmailCopy } from "../src/lib/simulations/invitation-copy";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "ok  " : "FAIL"} ${name}`);
  if (!cond) failures++;
}

const base = {
  organizationName: "Acme <script>alert(1)</script>",
  candidateName: 'Sam "><img src=x onerror=alert(1)>',
  simulationTitle: "Webhook retry incident",
  roleTitle: "Backend Engineer",
  durationMinutes: 60,
  requiresDesktop: true,
  inviteUrl: "https://app.fydell.example/invite/abc",
  expiresAt: "2026-10-10T00:00:00Z",
};
const copy = invitationEmailCopy(base);
check("organization name is escaped", !copy.html.includes("<script>") && copy.html.includes("&lt;script&gt;"));
check("candidate name is escaped", !copy.html.includes("<img") && copy.html.includes("&lt;img"));
check("names the invited role and assessment", copy.html.includes("Backend Engineer") && copy.html.includes("Webhook retry incident"));
check("states the real duration", copy.html.includes("60-minute"));
check("explains the desktop app and that no local tools are needed", /desktop app/.test(copy.html) && /do not need to install Python/.test(copy.html));
check("never mentions another role's simulation", !/Data Analyst|ops-yield/.test(copy.html));

const web = invitationEmailCopy({ ...base, requiresDesktop: false, roleTitle: "Data Analyst", simulationTitle: "Ops yield", durationMinutes: 20 });
check("web simulations do not mention the desktop app", !/desktop app/.test(web.html) && web.html.includes("20-minute"));

console.log(failures ? `\n${failures} failure(s)` : "\nAll invitation copy checks passed.");
if (failures) process.exit(1);
