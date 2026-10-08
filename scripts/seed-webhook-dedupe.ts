/**
 * Publishes the "Prevent duplicate webhook processing" work sample to the
 * DEVELOPMENT database for the "Walkthrough 6031cbee" employer workspace, and
 * makes sure a published role uses it. Mirrors the app's path: draft and
 * protected material, a real validation run on the local runner, a preview and
 * approval by the workspace owner, then eng_publish_authored_version.
 * Idempotent: an unchanged package reuses the existing draft, version and role.
 * Sends no email and creates no invitation. Prints ids and statuses only.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/seed-webhook-dedupe.ts
 */
import { createHash } from "node:crypto";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { packageSha256, type ProtectedMaterials, type ScenarioPackage } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { engAdmin, type Admin } from "../src/lib/eng/context";
import { buildWebhookDedupePackage, WEBHOOK_DEDUPE_INPUT, WEBHOOK_DEDUPE_SEED_MARKER } from "../src/lib/eng/scenarios/webhook-dedupe/package";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const PROD_REF = "qtrhwrcxthtqvkeerptp";
const ORG_NAME = "Walkthrough 6031cbee";
const ROLE_TITLE = "Backend Engineer, Payments";

type DraftRow = { id: string; revision: number; status: string; package: unknown; published_version_id: string | null; next_version: number };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${what}.`);
  return value;
}

async function findOrg(db: Admin): Promise<{ id: string; ownerId: string; ownerEmail: string; orgName: string }> {
  const { data: orgs, error } = await db.from("organizations").select("id, name, owner_id").eq("name", ORG_NAME).limit(2);
  if (error) throw new Error(`organizations lookup failed: ${error.message}`);
  if (!orgs || orgs.length !== 1) throw new Error(`Expected exactly one organization named "${ORG_NAME}", found ${orgs?.length ?? 0}.`);
  const org = orgs[0] as { id: string; name: string; owner_id: string | null };
  const { data: owners } = await db
    .from("organization_members")
    .select("user_id, joined_at")
    .eq("organization_id", org.id)
    .eq("role", "owner")
    .eq("status", "active")
    .order("joined_at", { ascending: true, nullsFirst: false })
    .limit(1);
  const ownerId = must((owners?.[0] as { user_id: string } | undefined)?.user_id ?? org.owner_id, "an active owner for the organization");
  const { data: user, error: userError } = await db.auth.admin.getUserById(ownerId);
  if (userError || !user.user?.email) throw new Error("Could not read the owner's account.");
  return { id: org.id, ownerId, ownerEmail: user.user.email.toLowerCase(), orgName: org.name };
}

async function ensureDraft(db: Admin, orgId: string, ownerId: string, pkg: ScenarioPackage, prot: ProtectedMaterials, sha: string): Promise<DraftRow> {
  const { data: existing } = await db
    .from("eng_scenario_drafts")
    .select("id, revision, status, package, published_version_id, next_version")
    .eq("organization_id", orgId)
    .eq("input->>seed_marker", WEBHOOK_DEDUPE_SEED_MARKER)
    .neq("status", "archived")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!existing) {
    const { data, error } = await db
      .from("eng_scenario_drafts")
      .insert({
        organization_id: orgId,
        created_by: ownerId,
        path: "import",
        title: pkg.brief.title,
        family: pkg.config.family,
        specialization: pkg.config.specialization,
        level: pkg.config.level,
        package: pkg,
        input: { ...WEBHOOK_DEDUPE_INPUT, seed_marker: WEBHOOK_DEDUPE_SEED_MARKER },
        revision: 1,
        status: "draft",
      })
      .select("id, revision, status, package, published_version_id, next_version")
      .single();
    if (error) throw new Error(`Could not create draft: ${error.message}`);
    const { error: protError } = await db.from("eng_scenario_draft_protected").insert({ draft_id: data.id, organization_id: orgId, content: prot });
    if (protError) throw new Error(`Could not store protected material: ${protError.message}`);
    console.log(`draft ${data.id}: created (revision 1)`);
    return data as DraftRow;
  }
  const row = existing as DraftRow;
  const { data: protRow } = await db.from("eng_scenario_draft_protected").select("content").eq("draft_id", row.id).maybeSingle();
  const storedPkg = row.package as ScenarioPackage;
  const unchanged = protRow && storedPkg?.schema === 1 && packageSha256(storedPkg, protRow.content as ProtectedMaterials) === sha;
  if (unchanged) {
    console.log(`draft ${row.id}: reused (revision ${row.revision}, ${row.status})`);
    return row;
  }
  const revision = row.revision + 1;
  const { data, error } = await db
    .from("eng_scenario_drafts")
    .update({ package: pkg, title: pkg.brief.title, revision, status: "draft", updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("revision", row.revision)
    .select("id, revision, status, package, published_version_id, next_version")
    .single();
  if (error) throw new Error(`Could not update draft: ${error.message}`);
  const { error: protError } = protRow
    ? await db.from("eng_scenario_draft_protected").update({ content: prot, updated_at: new Date().toISOString() }).eq("draft_id", row.id)
    : await db.from("eng_scenario_draft_protected").insert({ draft_id: row.id, organization_id: orgId, content: prot });
  if (protError) throw new Error(`Could not store protected material: ${protError.message}`);
  console.log(`draft ${row.id}: updated to revision ${revision}`);
  return data as DraftRow;
}

async function publish(db: Admin, orgId: string, owner: { id: string; email: string }, draft: DraftRow, pkg: ScenarioPackage, prot: ProtectedMaterials, sha: string): Promise<string> {
  const { data: current } = await db
    .from("eng_scenario_versions")
    .select("id, version, status")
    .eq("draft_id", draft.id)
    .eq("package_sha256", sha)
    .eq("status", "published")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (current) {
    console.log(`version ${current.id}: reused (version ${current.version}, ${current.status})`);
    return current.id as string;
  }

  const record = await validatePackage(pkg, prot, localRunner(), null);
  for (const c of record.checks) console.log(`  check ${c.id}: ${c.status}`);
  if (record.status !== "passed" || record.packageSha256 !== sha) throw new Error("Validation did not pass; nothing was published.");
  const { data: validation, error: vError } = await db
    .from("eng_scenario_validations")
    .insert({
      draft_id: draft.id,
      organization_id: orgId,
      draft_revision: draft.revision,
      package_sha256: record.packageSha256,
      status: record.status,
      checks: record.checks,
      meta: { runner: record.runner, runnerUnavailable: record.runnerUnavailable, sectionRevisions: record.sectionRevisions, ranAt: record.ranAt },
      ran_by: owner.id,
    })
    .select("id, created_at")
    .single();
  if (vError) throw new Error(`Could not record validation: ${vError.message}`);
  await db.from("eng_scenario_drafts").update({ last_validation_id: validation.id }).eq("id", draft.id);
  console.log(`validation ${validation.id}: ${record.status}`);

  const { data: preview, error: pError } = await db
    .from("eng_scenario_previews")
    .insert({ draft_id: draft.id, organization_id: orgId, package_sha256: sha, viewer_id: owner.id })
    .select("viewed_at")
    .single();
  if (pError) throw new Error(`Could not record preview: ${pError.message}`);
  const notes = "Hand-authored template. All execution and static checks passed on the local development runner.";
  const { data: approval, error: aError } = await db
    .from("eng_scenario_approvals")
    .insert({
      draft_id: draft.id,
      organization_id: orgId,
      validation_id: validation.id,
      package_sha256: sha,
      reviewer_id: owner.id,
      reviewer_email: owner.email,
      decision: "approved",
      notes,
      previewed_at: preview.viewed_at,
    })
    .select("id, created_at")
    .single();
  if (aError) throw new Error(`Could not record approval: ${aError.message}`);
  await db.from("eng_scenario_drafts").update({ status: "in_review" }).eq("id", draft.id).eq("revision", draft.revision);
  console.log(`approval ${approval.id}: approved`);

  const version = {
    scenario_key: `org-${orgId.slice(0, 8)}-${draft.id.slice(0, 8)}`,
    title: pkg.brief.title.slice(0, 140),
    content: pkg,
    starter_sha256: sha256(JSON.stringify(pkg.starterFiles)),
    harness_sha256: sha256(JSON.stringify({ tests: prot.protectedTests, refs: prot.protectedTestRefs })),
    suite_version: `authored-${(validation.id as string).slice(0, 8)}`,
    rubric_version: `authored-rubric-r${pkg.provenance.sections.criteria.revision}`,
    review_record: {
      validation: { id: validation.id, runner: record.runner, ranAt: record.ranAt, checks: record.checks.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail })) },
      approval: { id: approval.id, decision: "approved", reviewerEmail: owner.email, notes, createdAt: approval.created_at, current: true },
      generatedBy: pkg.provenance.model,
      path: pkg.provenance.path,
    },
    capabilities: pkg.config.capabilities,
    package_sha256: sha,
    validation_id: validation.id,
    approval_id: approval.id,
  };
  const { data: versionId, error } = await db.rpc("eng_publish_authored_version", { p_draft_id: draft.id, p_expected_revision: draft.revision, p_version: version, p_protected: prot });
  if (error) throw new Error(`Could not publish: ${error.message}`);
  console.log(`version ${versionId as string}: published (version ${draft.next_version})`);
  return versionId as string;
}

async function ensureRole(db: Admin, orgId: string, ownerId: string, versionId: string, draftId: string): Promise<string> {
  const { data: existing } = await db
    .from("eng_roles")
    .select("id, status")
    .eq("organization_id", orgId)
    .eq("title", ROLE_TITLE)
    .eq("scenario_version_id", versionId)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (existing) {
    console.log(`role ${existing.id}: reused (${existing.status})`);
    return existing.id as string;
  }
  const { data: olderVersions } = await db.from("eng_scenario_versions").select("id").eq("draft_id", draftId).neq("id", versionId);
  const olderIds = (olderVersions ?? []).map((v) => v.id as string);
  if (olderIds.length) {
    const { data: stale } = await db.from("eng_roles").select("id").eq("organization_id", orgId).eq("title", ROLE_TITLE).eq("status", "published").in("scenario_version_id", olderIds);
    for (const r of stale ?? []) {
      await db.from("eng_roles").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", r.id).eq("status", "published");
      console.log(`role ${r.id as string}: archived (pinned to an older version)`);
    }
  }
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("eng_roles")
    .insert({
      organization_id: orgId,
      title: ROLE_TITLE,
      role_family: "backend_engineer",
      stack: ["Python", "SQLite", "Webhooks"],
      responsibilities: "Own webhook ingestion from the payment provider and the customer ledger it writes to: correctness under retries, failure handling, and the tests that keep it that way.",
      evaluation_focus: ["correctness", "engineering_judgment", "work_communication"],
      company_context: "A payments team that receives provider webhooks, credits customer ledgers and sends receipts. All task data is synthetic.",
      scenario_version_id: versionId,
      status: "published",
      published_at: now,
      created_by: ownerId,
    })
    .select("id, status")
    .single();
  if (error) throw new Error(`Could not create role: ${error.message}`);
  console.log(`role ${data.id}: created (${data.status})`);
  return data.id as string;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.includes(DEV_REF) || url.includes(PROD_REF)) {
    throw new Error("Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not the development project.");
  }
  const db = engAdmin();
  const { pkg, prot } = buildWebhookDedupePackage();
  const sha = packageSha256(pkg, prot);

  const org = await findOrg(db);
  console.log(`organization ${org.id}: found`);
  const draft = await ensureDraft(db, org.id, org.ownerId, pkg, prot, sha);
  const versionId = await publish(db, org.id, { id: org.ownerId, email: org.ownerEmail }, draft, pkg, prot, sha);
  const roleId = await ensureRole(db, org.id, org.ownerId, versionId, draft.id);

  const { data: finalDraft } = await db.from("eng_scenario_drafts").select("status, revision, published_version_id").eq("id", draft.id).single();
  const { data: protRow } = await db.from("eng_scenario_version_protected").select("version_id").eq("version_id", versionId).maybeSingle();
  console.log(
    `\nsummary: organization=${org.id} draft=${draft.id} (status ${finalDraft?.status}, revision ${finalDraft?.revision}) version=${versionId} (protected ${protRow ? "stored" : "MISSING"}) role=${roleId}`,
  );
  if (finalDraft?.published_version_id !== versionId) console.log("note: the draft's published_version_id points at a different version");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "seed failed");
  process.exit(1);
});
