/**
 * Development-only accounts for walking the role page and application flow
 * in a browser: an employer owner with a workspace, and an engineer with two
 * analysed Passport projects. Refuses to run against anything but the dev
 * project.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/seed-role-walkthrough.ts
 *   npx tsx --conditions react-server --env-file=.env.local scripts/seed-role-walkthrough.ts --cleanup <tag>
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { saveProject } from "@/lib/passport/store";
import { ANALYSIS_VERSION, type ExtractionResult } from "@/lib/passport/github/types";

function extraction(repoId: number, name: string, sha: string, finding: string, path: string): ExtractionResult {
  return {
    analysisVersion: ANALYSIS_VERSION,
    status: "complete",
    repository: { id: repoId, fullName: name, htmlUrl: `https://github.com/${name}`, defaultBranch: "main", fork: false, archived: false, primaryLanguage: "TypeScript", sizeKb: 120 },
    commitSha: sha,
    revisionRef: "main",
    manifest: [],
    coverage: { totalFiles: 14, analyzedFiles: 12, analyzedBytes: 18_000, languages: ["TypeScript"], treeTruncated: false, skipped: [] },
    findings: [
      {
        id: `${name.replace(/\W/g, "-")}-f1`,
        detector: "walkthrough",
        category: "reliability",
        finding,
        basis: "repository_observation",
        path,
        startLine: 12,
        endLine: 24,
        excerpt: ["for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {", "  await wait(backoff(attempt));", "}"],
        sourceUrl: `https://github.com/${name}/blob/${sha}/${path}#L12-L24`,
        attribution: "unverified",
        limitations: ["Read from the repository; not executed."],
      },
    ],
    rejectedFindings: 0,
    roleSuggestions: [],
    notices: [],
    error: null,
  };
}

async function main() {
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").includes("btbmvrvynnrhapjdkunz")) throw new Error("Refusing to run: not the development project.");
  const admin = createAdminSupabaseClient();
  const cleanupAt = process.argv.indexOf("--cleanup");
  if (cleanupAt > -1) {
    const tag = process.argv[cleanupAt + 1] ?? "";
    if (!/^[0-9a-f]{8}$/.test(tag)) throw new Error("Pass the 8-character tag printed when seeding.");
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const users = (data?.users ?? []).filter((u) => (u.email ?? "").includes(`+walk-${tag}@`));
    const { data: orgs } = await admin.from("organizations").select("id").eq("name", `Walkthrough ${tag}`);
    for (const o of (orgs ?? []) as Array<{ id: string }>) {
      await admin.from("role_applications").delete().eq("organization_id", o.id);
      await admin.from("organizations").delete().eq("id", o.id);
    }
    for (const u of users) {
      await admin.from("passports").delete().eq("owner_id", u.id);
      await admin.from("user_notifications").delete().eq("user_id", u.id);
      await admin.auth.admin.deleteUser(u.id);
    }
    console.log(`Removed ${users.length} users and ${(orgs ?? []).length} workspace(s).`);
    return;
  }

  const tag = randomUUID().slice(0, 8);
  const password = `Walk-${randomBytes(9).toString("base64url")}`;
  const mk = async (who: string) => {
    const { data, error } = await admin.auth.admin.createUser({ email: `${who}+walk-${tag}@example.com`, password, email_confirm: true });
    if (error || !data.user) throw new Error("Could not create a user.");
    return data.user.id;
  };
  const employerId = await mk("employer");
  const engineerId = await mk("engineer");
  const orgId = randomUUID();
  await admin.from("organizations").insert({ id: orgId, name: `Walkthrough ${tag}`, status: "active", pilot_stage: "setup" });
  await admin.from("organization_members").insert({ organization_id: orgId, user_id: employerId, role: "owner", status: "active", joined_at: new Date().toISOString() });
  const who = { id: engineerId, displayName: "Riley Chen" };
  await saveProject(who, null, extraction(9_200_001, `riley-walk-${tag}/webhook-relay`, "a1b2c3d".padEnd(40, "0"), "Delivery retries stop after a fixed cap with backoff between attempts", "src/deliver.ts"), "");
  await saveProject(who, null, extraction(9_200_002, `riley-walk-${tag}/ledger-sync`, "e4f5a6b".padEnd(40, "0"), "Sync writes use an idempotency key so retried jobs don't double-post", "src/sync.ts"), "");

  console.log(`tag       ${tag}`);
  console.log(`employer  employer+walk-${tag}@example.com`);
  console.log(`engineer  engineer+walk-${tag}@example.com`);
  console.log(`password  ${password}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
