import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { Admin, EngMember } from "../context";
import { staleChecks, type CheckResult, type ValidationRecord } from "./checks";
import { skeletonPackage, stagesFromPackage } from "./generate";
import {
  AuthoringError,
  enqueueJob,
  liveJob,
  publicJob,
  type GenerateCheckpoint,
  type RegenerateScope,
} from "./jobs";
import {
  SECTIONS,
  asPackage,
  asProtected,
  bumpSections,
  emptyProtected,
  packageSha256,
  sectionRevisions,
  validateFiles,
  type ProtectedMaterials,
  type ScenarioPackage,
  type SectionKey,
} from "./package";
import { CAPABILITIES, DURATION_LIMITS, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "./registry";
import { buildExemplar, validatedExemplars } from "../exemplars/registry";
import { isProductionRuntime } from "./runner";

export type DraftRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  path: "template" | "import" | "generated";
  title: string;
  family: string;
  specialization: string;
  level: string;
  package: unknown;
  input: unknown;
  revision: number;
  status: "draft" | "in_review" | "published" | "archived";
  last_validation_id: string | null;
  published_version_id: string | null;
  next_version: number;
  created_at: string;
  updated_at: string;
};

async function draftForOrg(db: Admin, member: EngMember, draftId: string): Promise<DraftRow> {
  const { data } = await db.from("eng_scenario_drafts").select("*").eq("id", draftId).eq("organization_id", member.organizationId).maybeSingle();
  if (!data) throw new AuthoringError(404, "Draft not found.");
  return data as DraftRow;
}

async function protectedFor(db: Admin, draftId: string): Promise<ProtectedMaterials> {
  const { data } = await db.from("eng_scenario_draft_protected").select("content").eq("draft_id", draftId).maybeSingle();
  return asProtected(data?.content);
}

/** Validates the form server-side. Callers show the result; nothing is generated unless `ok`. */
export function checkInput(raw: unknown) {
  const { input, invalid } = parseInput(raw);
  const exemplars = validatedExemplars().map((e) => ({ key: e.key, track: e.track, taskFamily: e.taskFamily, language: e.language }));
  if (!input.simulation) invalid.push({ field: "simulation", message: "Choose a primary track and a role-model simulation." });
  return { input, validation: validateConfig(input, invalid, exemplars) };
}

/** A copy of a validated role model as a new draft the employer can edit, validate again and publish. */
function roleModelDraft(config: AuthoringConfig): { pkg: ScenarioPackage; prot: ProtectedMaterials; title: string } {
  const key = config.simulation?.exemplarKey;
  const built = key ? buildExemplar(key) : null;
  if (!built) throw new AuthoringError(422, "That role-model simulation is not available.");
  const copy = structuredClone(built);
  const pkg: ScenarioPackage = { ...copy.pkg, config: { ...copy.pkg.config, simulation: config.simulation } };
  return { pkg, prot: copy.prot, title: pkg.brief.title };
}

export async function createDraft(db: Admin, member: EngMember, raw: unknown): Promise<{ draftId: string; jobId: string | null }> {
  const { input, validation } = checkInput(raw);
  if (!validation.ok || !validation.resolved) {
    throw new AuthoringError(422, "Resolve the items in the summary before creating the draft.");
  }
  const config = validation.resolved;
  const asIs = config.startingMaterial === "reviewed_template";
  const roleModel = asIs ? roleModelDraft(config) : null;
  const title = roleModel?.title ?? (config.description.split(/[.\n]/)[0] || "Untitled work sample").slice(0, 120).padEnd(2, ".");
  const uploaded = config.startingMaterial === "uploaded";
  const skeleton = roleModel ?? (uploaded ? skeletonPackage(config) : null);
  const { data, error } = await db
    .from("eng_scenario_drafts")
    .insert({
      organization_id: member.organizationId,
      created_by: member.userId,
      path: asIs ? "template" : uploaded ? "import" : "generated",
      title,
      family: config.family,
      specialization: config.specialization,
      level: config.level,
      package: skeleton?.pkg ?? {},
      input: input as unknown as Record<string, unknown>,
      revision: 1,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create draft: ${error.message}`);
  const draftId = data.id as string;
  await db.from("eng_scenario_draft_protected").insert({ draft_id: draftId, organization_id: member.organizationId, content: skeleton?.prot ?? emptyProtected() });
  if (uploaded || asIs) return { draftId, jobId: null };
  const checkpoint: GenerateCheckpoint = { scope: "all", config };
  const job = await enqueueJob(db, { draftId, organizationId: member.organizationId, kind: "generate", revision: 1, requestedBy: member.userId, checkpoint: checkpoint as unknown as Record<string, unknown> });
  return { draftId, jobId: job.id };
}

type ValidationRow = { id: string; draft_revision: number; package_sha256: string; status: "passed" | "blocked"; checks: CheckResult[]; meta: Record<string, unknown>; created_at: string };

function asRecord(row: ValidationRow): ValidationRecord {
  const meta = row.meta ?? {};
  return {
    status: row.status,
    packageSha256: row.package_sha256,
    runner: (meta.runner as ValidationRecord["runner"]) ?? null,
    runnerUnavailable: (meta.runnerUnavailable as string | null) ?? null,
    sectionRevisions: (meta.sectionRevisions as ValidationRecord["sectionRevisions"]) ?? ({} as ValidationRecord["sectionRevisions"]),
    checks: row.checks,
    ranAt: (meta.ranAt as string) ?? row.created_at,
  };
}

/** Everything the authoring workspace needs. Protected material is returned only to authors and approvers. */
export async function getDraft(db: Admin, member: EngMember, draftId: string, includeProtected: boolean) {
  const row = await draftForOrg(db, member, draftId);
  const pkg = asPackage(row.package);
  const prot = await protectedFor(db, draftId);
  const [{ data: validation }, { data: approval }, job, { data: previews }] = await Promise.all([
    db.from("eng_scenario_validations").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("eng_scenario_approvals").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    liveJob(db, draftId),
    db.from("eng_scenario_previews").select("package_sha256, viewer_id, viewed_at").eq("draft_id", draftId).order("viewed_at", { ascending: false }).limit(20),
  ]);
  const sha = pkg ? packageSha256(pkg, prot) : null;
  const record = validation ? asRecord(validation as ValidationRow) : null;
  const stale = record && pkg ? staleChecks(record, sectionRevisions(pkg)) : [];
  const validationCurrent = Boolean(record && sha && record.packageSha256 === sha);
  const previewedBySelf = Boolean(sha && (previews ?? []).some((p) => p.package_sha256 === sha && p.viewer_id === member.userId));
  const approvalCurrent = Boolean(approval && sha && approval.package_sha256 === sha && approval.decision === "approved");
  const { input } = parseInput(row.input);
  return {
    draft: {
      id: row.id,
      title: row.title,
      path: row.path,
      status: row.status,
      revision: row.revision,
      family: row.family,
      specialization: row.specialization,
      level: row.level,
      publishedVersionId: row.published_version_id,
      nextVersion: row.next_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    input,
    package: pkg,
    protected: includeProtected ? prot : null,
    packageSha256: sha,
    validation: record ? { id: (validation as ValidationRow).id, ...record, current: validationCurrent, staleCheckIds: stale } : null,
    approval: approval
      ? { id: approval.id as string, decision: approval.decision as string, reviewerEmail: approval.reviewer_email as string, notes: approval.notes as string, createdAt: approval.created_at as string, current: approvalCurrent }
      : null,
    previewedCurrentVersion: previewedBySelf,
    job: publicJob(job),
    publishGate: publishBlockers({ pkg, sha, record, validationCurrent, approvalCurrent, status: row.status }),
    publishWarnings: record?.runner && !record.runner.isolated ? [`Checks ran on the ${record.runner.label}. This version is for local testing; production publishing requires the isolated sandbox.`] : [],
  };
}

export function publishBlockers(args: { pkg: ScenarioPackage | null; sha: string | null; record: ValidationRecord | null; validationCurrent: boolean; approvalCurrent: boolean; status: string }): string[] {
  const out: string[] = [];
  if (args.status === "archived") out.push("The draft is archived.");
  if (!args.pkg) out.push("The draft has no content yet.");
  if (!args.record) out.push("Run the checks at least once.");
  else if (!args.validationCurrent) out.push("The draft changed since the last check run. Run the checks again.");
  else if (args.record.runner && !args.record.runner.isolated && isProductionRuntime()) out.push("Checks ran on a runner that is not isolated. Publishing requires the isolated sandbox runner.");
  else if (!args.record.runner) out.push(args.record.runnerUnavailable ?? "Isolated execution is not available, so the checks could not run.");
  else for (const c of args.record.checks.filter((x) => x.status !== "passed")) out.push(`${c.label}: ${c.issues[0] ?? c.detail}`);
  if (!args.approvalCurrent) out.push("A reviewer must preview this exact version and approve it.");
  return out;
}

const fileZ = z.object({ path: z.string().min(1).max(120), content: z.string().max(64_000) });
const refZ = z.object({ name: z.string().min(1).max(200), file: z.string().min(1).max(120), criterionIds: z.array(z.string().max(10)).max(10) });
const capZ = z.enum(CAPABILITIES.map((c) => c.id) as [string, ...string[]]);
const linesZ = (max: number) => z.array(z.string().max(400)).max(max);

/** Each section may change only its own fields. Unknown keys are rejected. */
const SECTION_SCHEMAS = {
  brief: z
    .object({
      brief: z.object({
        title: z.string().min(2).max(120),
        summary: z.string().max(400),
        context: z.string().max(3000),
        task: z.string().max(3000),
        outcomes: linesZ(10),
        constraints: linesZ(10),
        outOfScope: linesZ(10),
        optionalExtensions: linesZ(6),
        interface: z.string().max(2000),
      }),
      acceptanceCriteria: z.array(z.object({ id: z.string().regex(/^AC-\d{1,2}$/), text: z.string().min(3).max(400), capability: capZ })).min(1).max(10),
      setupInstructions: linesZ(8),
    })
    .partial()
    .strict(),
  files: z
    .object({
      starterFiles: z.array(fileZ).max(40),
      reference: z.object({ files: z.array(fileZ).max(20), approaches: linesZ(6) }),
      incorrectSolutions: z.array(z.object({ id: z.string().max(40), description: z.string().min(3).max(300), files: z.array(fileZ).min(1).max(10) })).max(5),
    })
    .partial()
    .strict(),
  tests: z
    .object({
      starterFiles: z.array(fileZ).max(40),
      publicTests: z.array(refZ).max(30),
      protectedTests: z.array(fileZ).max(10),
      protectedTestRefs: z.array(refZ).max(40),
    })
    .partial()
    .strict(),
  criteria: z
    .object({
      rubric: z
        .array(
          z.object({
            id: z.string().max(10),
            capability: capZ,
            label: z.string().min(2).max(80),
            whyItMatters: z.string().max(400),
            observableEvidence: z.string().max(400),
            anchors: z.object({ concern_observed: z.string().max(400), partially_demonstrated: z.string().max(400), demonstrated: z.string().max(400) }),
            insufficientEvidence: z.string().max(400),
            limitations: z.string().max(400),
            candidateExplanation: z.string().max(400),
            acceptanceCriterionIds: z.array(z.string().max(10)).max(10),
            judgedBy: z.enum(["tests", "reviewer"]),
          }),
        )
        .max(12),
      rubricNotes: z.record(z.string().max(10), z.string().max(1000)),
    })
    .partial()
    .strict(),
  coworkers: z
    .object({
      coworkers: z
        .array(
          z.object({
            id: z.string().regex(/^[a-z][a-z0-9_-]{1,23}$/),
            name: z.string().max(60),
            title: z.string().max(80),
            responsibilities: z.string().max(400),
            topics: z.array(z.string().max(80)).max(8),
            tone: z.string().max(120),
            boundaries: z.string().max(400),
          }),
        )
        .max(3),
      coworkerFacts: z.record(
        z.string().max(24),
        z.array(z.object({ id: z.string().max(30), text: z.string().min(3).max(400), topics: z.array(z.string().min(1).max(60)).max(8).optional() })).max(8),
      ),
      reviewQuestion: z.object({ coworkerId: z.string().max(24), text: z.string().min(10).max(400) }).nullable(),
    })
    .partial()
    .strict(),
  policy: z
    .object({
      aiPolicy: z.object({ id: z.enum(["no_assistants", "assistants_disclosed", "any_tools", "custom"]), candidateText: z.string().min(10).max(800) }),
      submission: z.object({
        requirements: linesZ(8),
        handoffPrompts: z.array(z.object({ id: z.string().regex(/^[a-z_]{2,30}$/), label: z.string().min(2).max(120), help: z.string().max(300) })).max(6),
      }),
      feedbackPolicy: z.string().max(800),
      accommodations: linesZ(8),
      interruptionPolicy: z.string().max(600),
    })
    .partial()
    .strict(),
  timing: z
    .object({
      taskMinutes: z.number().int().min(DURATION_LIMITS.minTask).max(DURATION_LIMITS.maxTask),
      setupMinutes: z.number().int().min(DURATION_LIMITS.minSetup).max(DURATION_LIMITS.maxSetup),
    })
    .partial()
    .strict(),
} as const;

const PROTECTED_KEYS = new Set(["reference", "incorrectSolutions", "protectedTests", "protectedTestRefs", "rubricNotes", "coworkerFacts"]);

/**
 * Applies one section's edit to an exact revision. A stale revision is a
 * conflict, never a silent overwrite. Returns the new revision.
 */
export async function saveSection(db: Admin, member: EngMember, draftId: string, body: { revision: unknown; section: unknown; changes: unknown }): Promise<{ revision: number }> {
  const section = typeof body.section === "string" && (SECTIONS as readonly string[]).includes(body.section) ? (body.section as SectionKey) : null;
  if (!section) throw new AuthoringError(400, "Unknown section.");
  if (typeof body.revision !== "number") throw new AuthoringError(400, "Missing draft revision.");
  const parsed = SECTION_SCHEMAS[section].safeParse(body.changes);
  if (!parsed.success) {
    throw new AuthoringError(422, `Some values are not valid: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || section}: ${i.message}`).join("; ")}`);
  }
  const row = await draftForOrg(db, member, draftId);
  if (row.status === "archived") throw new AuthoringError(409, "This draft is archived.");
  if (row.revision !== body.revision) throw new AuthoringError(409, "This draft changed in another tab or by a teammate. Reload to see the latest version; your unsaved text is kept in this tab.");
  const pkg = asPackage(row.package);
  if (!pkg) throw new AuthoringError(409, "The draft is still being generated.");
  const prot = await protectedFor(db, draftId);
  const changes = parsed.data as Record<string, unknown>;

  let nextPkg: ScenarioPackage = { ...pkg };
  const nextProt: ProtectedMaterials = { ...prot };
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    if (key === "reference") nextProt.reference = value as ProtectedMaterials["reference"];
    else if (PROTECTED_KEYS.has(key)) (nextProt as Record<string, unknown>)[key] = value;
    else if (key === "taskMinutes" || key === "setupMinutes") nextPkg = { ...nextPkg, environment: { ...nextPkg.environment, [key]: value as number }, config: { ...nextPkg.config, [key]: value as number } };
    else if (key === "brief") nextPkg = { ...nextPkg, brief: value as ScenarioPackage["brief"] };
    else if (key === "reviewQuestion") nextPkg = { ...nextPkg, reviewQuestion: (value as ScenarioPackage["reviewQuestion"] | null) ?? undefined };
    else (nextPkg as Record<string, unknown>)[key] = value;
  }
  const fileIssues = [...validateFiles(nextPkg.starterFiles, "Starter files"), ...validateFiles(nextProt.protectedTests, "Evaluation tests"), ...validateFiles(nextProt.reference.files, "Reference solution")];
  const unsafe = fileIssues.filter((i) => /safe relative path|duplicate/.test(i));
  if (unsafe.length) throw new AuthoringError(422, unsafe[0]);

  const touched: SectionKey[] = [section];
  if (section === "tests" && "starterFiles" in changes) touched.push("files");
  nextPkg = bumpSections(nextPkg, touched, "author");
  const revision = row.revision + 1;
  const { data, error } = await db
    .from("eng_scenario_drafts")
    .update({ package: nextPkg, title: nextPkg.brief.title.slice(0, 140), revision, status: "draft", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("revision", row.revision)
    .select("id");
  if (error) throw new Error(`Could not save draft: ${error.message}`);
  if (!data?.length) throw new AuthoringError(409, "This draft changed while saving. Reload to see the latest version.");
  if ([...Object.keys(changes)].some((k) => PROTECTED_KEYS.has(k))) {
    await db.from("eng_scenario_draft_protected").update({ content: nextProt, updated_at: new Date().toISOString() }).eq("draft_id", draftId);
  }
  return { revision };
}

export async function requestRegeneration(db: Admin, member: EngMember, draftId: string, scope: RegenerateScope) {
  const row = await draftForOrg(db, member, draftId);
  if (row.status === "archived") throw new AuthoringError(409, "This draft is archived.");
  const pkg = asPackage(row.package);
  const { validation } = checkInput(row.input);
  const config = pkg?.config ?? validation.resolved;
  if (!config) throw new AuthoringError(422, "The original configuration no longer validates. Create a new draft.");
  const checkpoint: GenerateCheckpoint = { scope, config };
  if (scope !== "all") {
    if (!pkg) throw new AuthoringError(409, "Generate the full draft first.");
    const stages = stagesFromPackage(pkg, await protectedFor(db, draftId));
    checkpoint.brief = stages.brief;
    if (scope === "tests") checkpoint.code = stages.code;
  }
  const job = await enqueueJob(db, { draftId, organizationId: member.organizationId, kind: "generate", revision: row.revision, requestedBy: member.userId, checkpoint: checkpoint as unknown as Record<string, unknown>, scope });
  return job;
}

export async function requestTestRun(db: Admin, member: EngMember, draftId: string) {
  const row = await draftForOrg(db, member, draftId);
  if (!asPackage(row.package)) throw new AuthoringError(409, "The draft is still being generated.");
  return enqueueJob(db, { draftId, organizationId: member.organizationId, kind: "test", revision: row.revision, requestedBy: member.userId, checkpoint: {} });
}

/** The exact candidate-facing package, and a server record that this person opened it. */
export async function openPreview(db: Admin, member: EngMember, draftId: string) {
  const row = await draftForOrg(db, member, draftId);
  const pkg = asPackage(row.package);
  if (!pkg) throw new AuthoringError(409, "The draft is still being generated.");
  const prot = await protectedFor(db, draftId);
  const sha = packageSha256(pkg, prot);
  await db.from("eng_scenario_previews").insert({ draft_id: draftId, organization_id: member.organizationId, package_sha256: sha, viewer_id: member.userId });
  return { package: pkg, packageSha256: sha, revision: row.revision };
}

export async function recordApproval(db: Admin, member: EngMember, draftId: string, body: { decision: unknown; notes: unknown; packageSha256: unknown }) {
  const decision = body.decision === "approved" || body.decision === "changes_requested" ? body.decision : null;
  if (!decision) throw new AuthoringError(400, "Choose approve or request changes.");
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
  if (decision === "changes_requested" && notes.length < 5) throw new AuthoringError(422, "Say what needs to change.");
  const row = await draftForOrg(db, member, draftId);
  const pkg = asPackage(row.package);
  if (!pkg) throw new AuthoringError(409, "The draft has no content yet.");
  const prot = await protectedFor(db, draftId);
  const sha = packageSha256(pkg, prot);
  if (body.packageSha256 !== sha) throw new AuthoringError(409, "The draft changed after you opened it. Review the latest version.");
  const { data: validation } = await db.from("eng_scenario_validations").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!validation) throw new AuthoringError(409, "Run the checks before review.");
  const v = validation as ValidationRow;
  if (decision === "approved") {
    if (v.package_sha256 !== sha) throw new AuthoringError(409, "The checks ran on an earlier version. Run them again before approving.");
    if (v.status !== "passed") throw new AuthoringError(409, "Checks are not all passing.");
    const { data: seen } = await db.from("eng_scenario_previews").select("id").eq("draft_id", draftId).eq("package_sha256", sha).eq("viewer_id", member.userId).limit(1);
    if (!seen?.length) throw new AuthoringError(409, "Open the candidate preview of this version before approving.");
  }
  const { data: previewRow } = await db.from("eng_scenario_previews").select("viewed_at").eq("draft_id", draftId).eq("package_sha256", sha).eq("viewer_id", member.userId).order("viewed_at", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db
    .from("eng_scenario_approvals")
    .insert({
      draft_id: draftId,
      organization_id: member.organizationId,
      validation_id: v.id,
      package_sha256: sha,
      reviewer_id: member.userId,
      reviewer_email: member.email,
      decision,
      notes,
      previewed_at: previewRow?.viewed_at ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not record review: ${error.message}`);
  await db.from("eng_scenario_drafts").update({ status: decision === "approved" ? "in_review" : "draft" }).eq("id", draftId).eq("revision", row.revision);
  return { approvalId: data.id as string };
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function publishDraft(db: Admin, member: EngMember, draftId: string, body: { packageSha256: unknown }) {
  const state = await getDraft(db, member, draftId, true);
  if (state.packageSha256 !== body.packageSha256) throw new AuthoringError(409, "The draft changed. Review the latest version before publishing.");
  if (state.publishGate.length) throw new AuthoringError(409, `Not ready to publish: ${state.publishGate[0]}`);
  const pkg = state.package!;
  const prot = state.protected!;
  const row = await draftForOrg(db, member, draftId);
  const version = {
    scenario_key: `org-${member.organizationId.slice(0, 8)}-${draftId.slice(0, 8)}`,
    title: pkg.brief.title.slice(0, 140),
    content: pkg,
    starter_sha256: sha256(JSON.stringify(pkg.starterFiles)),
    harness_sha256: sha256(JSON.stringify({ tests: prot.protectedTests, refs: prot.protectedTestRefs })),
    suite_version: `authored-${state.validation!.id.slice(0, 8)}`,
    rubric_version: `authored-rubric-r${pkg.provenance.sections.criteria.revision}`,
    review_record: {
      validation: { id: state.validation!.id, runner: state.validation!.runner, ranAt: state.validation!.ranAt, checks: state.validation!.checks.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail })) },
      approval: state.approval,
      generatedBy: pkg.provenance.model,
      path: pkg.provenance.path,
    },
    capabilities: pkg.config.capabilities,
    package_sha256: state.packageSha256,
    validation_id: state.validation!.id,
    approval_id: state.approval!.id,
  };
  const { data, error } = await db.rpc("eng_publish_authored_version", { p_draft_id: draftId, p_expected_revision: row.revision, p_version: version, p_protected: prot });
  if (error) {
    if (error.code === "40001") throw new AuthoringError(409, "The draft changed while publishing. Review the latest version.");
    throw new Error(`Could not publish: ${error.message}`);
  }
  return { versionId: data as string, version: row.next_version };
}

export async function archiveDraft(db: Admin, member: EngMember, draftId: string) {
  const row = await draftForOrg(db, member, draftId);
  await db.from("eng_scenario_drafts").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", draftId);
  if (row.published_version_id) {
    await db.from("eng_scenario_versions").update({ status: "retired" }).eq("draft_id", draftId).eq("organization_id", member.organizationId).eq("status", "published");
  }
}

export async function listWorkSamples(db: Admin, member: EngMember) {
  const [{ data: drafts }, { data: versions }] = await Promise.all([
    db.from("eng_scenario_drafts").select("id, title, path, status, family, specialization, level, revision, published_version_id, updated_at, created_at").eq("organization_id", member.organizationId).order("updated_at", { ascending: false }).limit(200),
    db
      .from("eng_scenario_versions")
      .select("id, scenario_key, version, title, origin, status, family, specialization, level, capabilities, published_at, draft_id, organization_id")
      .or(`organization_id.eq.${member.organizationId},origin.eq.fydell_reviewed`)
      .eq("purpose", "hiring")
      .order("published_at", { ascending: false })
      .limit(200),
  ]);
  return { drafts: drafts ?? [], versions: versions ?? [] };
}

export type { AuthoringInput };
