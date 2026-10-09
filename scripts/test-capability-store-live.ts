/**
 * Live dev-database checks for stored capability reports. Uses the first
 * current snapshot on the dev project (or CAPABILITY_TEST_SNAPSHOT) and the
 * service-role client from .env.local. Never run against production.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-capability-store-live.ts
 */
import assert from "node:assert/strict";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  capabilityReportState,
  ensureCapabilityReport,
  latestCapabilityReport,
  listCapabilityReportVersions,
  profileGroupsForSnapshots,
} from "@/lib/passport/capability/store";

const DEV_REF = "btbmvrvynnrhapjdkunz";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.includes(DEV_REF)) throw new Error("Refusing to run: .env.local does not point at the dev project.");
  const admin = createAdminSupabaseClient();
  const wanted = process.env.CAPABILITY_TEST_SNAPSHOT ?? null;
  const query = admin.from("passport_projects").select("id,repo_full_name,passports!inner(owner_id)").neq("status", "stale").limit(1);
  const { data } = wanted ? await query.eq("id", wanted) : await query;
  const row = (data ?? [])[0] as { id: string; repo_full_name: string; passports: { owner_id: string } | Array<{ owner_id: string }> } | undefined;
  if (!row) throw new Error("No snapshot on dev to test with.");
  const owner = Array.isArray(row.passports) ? row.passports[0].owner_id : row.passports.owner_id;

  let passed = 0;
  const check = async (name: string, fn: () => Promise<void>) => {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  };

  const first = await ensureCapabilityReport(owner, row.id, "Live store test");
  assert.ok(first, "report built for an owned snapshot");

  await check("the same inputs return the same stored version", async () => {
    const again = await ensureCapabilityReport(owner, row.id, "Live store test, repeated");
    assert.ok(again);
    assert.equal(again.created, false);
    assert.equal(again.report.id, first.report.id);
    assert.equal(again.report.version, first.report.version);
  });

  await check("concurrent calls converge on one row", async () => {
    const results = await Promise.all([1, 2, 3].map(() => ensureCapabilityReport(owner, row.id, "Live store test, concurrent")));
    assert.ok(results.every((r) => r && r.report.id === first.report.id));
  });

  await check("a stored version cannot be edited", async () => {
    const { error } = await admin.from("passport_capability_reports").update({ reason: "edited" }).eq("id", first.report.id);
    assert.ok(error && /immutable/.test(error.message), "update rejected by trigger");
    const { error: e2 } = await admin
      .from("passport_capability_reports")
      .update({ report: { ...first.report.report, capabilities: [] } })
      .eq("id", first.report.id);
    assert.ok(e2 && /immutable/.test(e2.message), "report body cannot be rewritten");
  });

  await check("the stored report is current, not stale, and listed", async () => {
    const state = await capabilityReportState(owner, row.id);
    assert.equal(state.stale, false);
    assert.equal(state.latest?.id, first.report.id);
    const versions = await listCapabilityReportVersions(owner, row.id);
    assert.ok(versions.some((v) => v.id === first.report.id));
  });

  await check("another account cannot read or build the report", async () => {
    const stranger = "00000000-0000-4000-8000-000000000000";
    assert.equal(await latestCapabilityReport(stranger, row.id), null);
    assert.equal(await ensureCapabilityReport(stranger, row.id, "should not build"), null);
    assert.deepEqual(await listCapabilityReportVersions(stranger, row.id), []);
  });

  await check("the stored body keeps layers apart and never claims a run", async () => {
    const r = first.report.report;
    assert.ok(r.layers && Array.isArray(r.layers.projectObservations) && Array.isArray(r.layers.contributionEvidence) && Array.isArray(r.layers.engineerStatements));
    assert.ok(r.capabilities.every((c) => c.evidence.every((e) => e.kind !== "test_file" || e.executed === false)));
    assert.ok(!/tests? (pass|passed)/i.test(JSON.stringify(r.capabilities.map((c) => [c.title, c.result]))));
    if (!r.attribution.personClaimsAllowed) assert.ok(r.capabilities.every((c) => c.scope === "project_only"));
  });

  await check("profile groups read only the snapshots they are given", async () => {
    const groups = await profileGroupsForSnapshots([row.id]);
    const none = await profileGroupsForSnapshots([]);
    assert.deepEqual(none, []);
    for (const g of groups) assert.ok(g.examples.every((e) => e.snapshotId === row.id));
  });

  console.log(`\n${passed}/7 live store checks passed (snapshot ${row.id.slice(0, 8)}, version ${first.report.version}, ${first.report.report.capabilities.length} capabilities, enrichment ${first.report.report.method.enrichment.source}).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "failed");
  process.exit(1);
});
