import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DECISIONS, HANDOFF_FIELDS, parseRun, type DecisionValue, type Handoff } from "@/lib/sandbox-demo/state";
import type { RunRecord } from "@/lib/sandbox-demo/types";
import {
  DEMO_APPLICANTS,
  DEMO_SCENARIO_KEY,
  DEMO_SEED_VERSION,
  SAMPLE_APPLICANT_KEY,
  demoScenarioOrThrow,
  fixtureFiles,
} from "./fixtures";
import type { DecisionInput, MessageInput, SampleInput } from "./validate";

/**
 * The only module that reads or writes demo workspace rows. It touches the
 * demo_workspace* tables and nothing else: no organizations, applications,
 * email, notifications or billing, so a demo action has no path to live data.
 * Every call resolves the workspace from the signed-in user's id.
 */

type Admin = ReturnType<typeof createAdminSupabaseClient>;

export class DemoWorkspaceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type DemoApplicantRow = {
  key: string;
  name: string;
  source: "fixture" | "sample";
  stage: "new" | "reviewing" | "decided";
  files: Record<string, string>;
  handoff: Handoff;
  run: RunRecord | null;
  submittedAt: string;
};

export type DemoDecisionRow = { id: string; applicantKey: string; decision: DecisionValue; privateNote: string | null; decidedBy: string; decidedAt: string };
export type DemoMessageRow = { id: string; applicantKey: string; author: "reviewer" | "applicant"; requirementId: string | null; body: string; createdAt: string };

export type DemoWorkspaceSnapshot = {
  workspaceId: string;
  createdAt: string;
  resetAt: string | null;
  applicants: DemoApplicantRow[];
  decisions: DemoDecisionRow[];
  messages: DemoMessageRow[];
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asFiles(v: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(asRecord(v)).filter((e): e is [string, string] => typeof e[1] === "string"));
}

function asHandoff(v: unknown): Handoff {
  const r = asRecord(v);
  const h = {} as Handoff;
  for (const f of HANDOFF_FIELDS) h[f] = typeof r[f] === "string" ? (r[f] as string) : "";
  return h;
}

function seedRows(workspaceId: string) {
  const applicants = DEMO_APPLICANTS.map((a, i) => ({
    workspace_id: workspaceId,
    applicant_key: a.key,
    display_name: a.name,
    source: "fixture" as const,
    stage: "new" as const,
    files: fixtureFiles(a.solution),
    handoff: a.handoff,
    run: null,
    // Staggered so the queue has a stable, plausible order.
    submitted_at: new Date(Date.now() - (i + 1) * 26 * 3600_000).toISOString(),
  }));
  const messages = DEMO_APPLICANTS.flatMap((a) =>
    a.thread.map((m, i) => ({
      workspace_id: workspaceId,
      applicant_key: a.key,
      author: m.author,
      requirement_id: m.requirementId,
      body: m.body,
      created_at: new Date(Date.now() - (2 - i) * 3 * 3600_000).toISOString(),
    })),
  );
  return { applicants, messages };
}

async function seed(admin: Admin, workspaceId: string) {
  const { applicants, messages } = seedRows(workspaceId);
  const a = await admin.from("demo_workspace_applicants").upsert(applicants, { onConflict: "workspace_id,applicant_key", ignoreDuplicates: true });
  if (a.error) throw new DemoWorkspaceError("The demo applicants could not be created.", 500);
  if (messages.length) {
    const m = await admin.from("demo_workspace_messages").insert(messages);
    if (m.error) throw new DemoWorkspaceError("The demo follow-up thread could not be created.", 500);
  }
}

async function workspaceIdFor(admin: Admin, userId: string): Promise<{ id: string; created_at: string; reset_at: string | null } | null> {
  const { data, error } = await admin.from("demo_workspaces").select("id, created_at, reset_at").eq("user_id", userId).maybeSingle();
  if (error) throw new DemoWorkspaceError("The demo workspace could not be read.", 500);
  return data ? { id: data.id as string, created_at: data.created_at as string, reset_at: (data.reset_at as string | null) ?? null } : null;
}

/** The caller's demo workspace, created and seeded on first visit. */
export async function ensureDemoWorkspace(userId: string): Promise<string> {
  const admin = createAdminSupabaseClient();
  const existing = await workspaceIdFor(admin, userId);
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("demo_workspaces")
    .upsert({ user_id: userId, scenario_key: DEMO_SCENARIO_KEY, seed_version: DEMO_SEED_VERSION }, { onConflict: "user_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (error) throw new DemoWorkspaceError("The demo workspace could not be created.", 500);
  if (!data) {
    // Another request created it first; that request seeds it.
    const raced = await workspaceIdFor(admin, userId);
    if (!raced) throw new DemoWorkspaceError("The demo workspace could not be created.", 500);
    return raced.id;
  }
  await seed(admin, data.id as string);
  return data.id as string;
}

export async function loadDemoWorkspace(userId: string): Promise<DemoWorkspaceSnapshot> {
  const workspaceId = await ensureDemoWorkspace(userId);
  const admin = createAdminSupabaseClient();
  const scenario = demoScenarioOrThrow();
  const [ws, applicants, decisions, messages] = await Promise.all([
    workspaceIdFor(admin, userId),
    admin.from("demo_workspace_applicants").select("applicant_key, display_name, source, stage, files, handoff, run, submitted_at").eq("workspace_id", workspaceId).order("submitted_at", { ascending: false }),
    admin.from("demo_workspace_decisions").select("id, applicant_key, decision, private_note, decided_by, decided_at").eq("workspace_id", workspaceId).order("decided_at", { ascending: false }),
    admin.from("demo_workspace_messages").select("id, applicant_key, author, requirement_id, body, created_at").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
  ]);
  if (applicants.error || decisions.error || messages.error || !ws) throw new DemoWorkspaceError("The demo workspace could not be read.", 500);
  return {
    workspaceId,
    createdAt: ws.created_at,
    resetAt: ws.reset_at,
    applicants: (applicants.data ?? []).map((r) => ({
      key: r.applicant_key as string,
      name: r.display_name as string,
      source: r.source === "sample" ? "sample" : "fixture",
      stage: r.stage === "decided" || r.stage === "reviewing" ? r.stage : "new",
      files: asFiles(r.files),
      handoff: asHandoff(r.handoff),
      run: r.run ? parseRun(scenario, r.run) : null,
      submittedAt: r.submitted_at as string,
    })),
    decisions: (decisions.data ?? []).flatMap((r) =>
      (DECISIONS as readonly string[]).includes(r.decision as string)
        ? [
            {
              id: r.id as string,
              applicantKey: r.applicant_key as string,
              decision: r.decision as DecisionValue,
              privateNote: (r.private_note as string | null) ?? null,
              decidedBy: r.decided_by as string,
              decidedAt: r.decided_at as string,
            },
          ]
        : [],
    ),
    messages: (messages.data ?? []).map((r) => ({
      id: r.id as string,
      applicantKey: r.applicant_key as string,
      author: r.author === "applicant" ? "applicant" : "reviewer",
      requirementId: (r.requirement_id as string | null) ?? null,
      body: r.body as string,
      createdAt: r.created_at as string,
    })),
  };
}

async function requireApplicant(admin: Admin, workspaceId: string, applicantKey: string) {
  const { data, error } = await admin
    .from("demo_workspace_applicants")
    .select("applicant_key")
    .eq("workspace_id", workspaceId)
    .eq("applicant_key", applicantKey)
    .maybeSingle();
  if (error) throw new DemoWorkspaceError("The demo applicant could not be read.", 500);
  if (!data) throw new DemoWorkspaceError("That applicant is not in your demo workspace.", 404);
}

export async function recordDemoDecision(userId: string, input: DecisionInput): Promise<DemoDecisionRow> {
  const workspaceId = await ensureDemoWorkspace(userId);
  const admin = createAdminSupabaseClient();
  await requireApplicant(admin, workspaceId, input.applicantKey);
  const { data, error } = await admin
    .from("demo_workspace_decisions")
    .insert({ workspace_id: workspaceId, applicant_key: input.applicantKey, decision: input.decision, private_note: input.privateNote, decided_by: userId })
    .select("id, decided_at")
    .single();
  if (error || !data) throw new DemoWorkspaceError("The demo decision could not be saved.", 500);
  await admin
    .from("demo_workspace_applicants")
    .update({ stage: "decided", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("applicant_key", input.applicantKey);
  return {
    id: data.id as string,
    applicantKey: input.applicantKey,
    decision: input.decision,
    privateNote: input.privateNote,
    decidedBy: userId,
    decidedAt: data.decided_at as string,
  };
}

export async function addDemoMessage(userId: string, input: MessageInput): Promise<DemoMessageRow> {
  const workspaceId = await ensureDemoWorkspace(userId);
  const admin = createAdminSupabaseClient();
  await requireApplicant(admin, workspaceId, input.applicantKey);
  const { data, error } = await admin
    .from("demo_workspace_messages")
    .insert({ workspace_id: workspaceId, applicant_key: input.applicantKey, author: "reviewer", requirement_id: input.requirementId, body: input.body })
    .select("id, created_at")
    .single();
  if (error || !data) throw new DemoWorkspaceError("The question could not be saved to the demo thread.", 500);
  await admin
    .from("demo_workspace_applicants")
    .update({ stage: "reviewing", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("applicant_key", input.applicantKey)
    .eq("stage", "new");
  return { id: data.id as string, applicantKey: input.applicantKey, author: "reviewer", requirementId: input.requirementId, body: input.body, createdAt: data.created_at as string };
}

/** Saves the employer's own run of the sample task as the "your sample" applicant, replacing any earlier one. */
export async function saveDemoSample(userId: string, input: SampleInput): Promise<string> {
  const workspaceId = await ensureDemoWorkspace(userId);
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("demo_workspace_applicants").upsert(
    {
      workspace_id: workspaceId,
      applicant_key: SAMPLE_APPLICANT_KEY,
      display_name: "Your sample submission",
      source: "sample",
      stage: "new",
      files: input.files,
      handoff: input.handoff,
      run: input.run,
      submitted_at: now,
      updated_at: now,
    },
    { onConflict: "workspace_id,applicant_key" },
  );
  if (error) throw new DemoWorkspaceError("Your sample submission could not be saved to the demo workspace.", 500);
  // A new submission starts a new review: earlier decisions and questions were about different code.
  await admin.from("demo_workspace_decisions").delete().eq("workspace_id", workspaceId).eq("applicant_key", SAMPLE_APPLICANT_KEY);
  await admin.from("demo_workspace_messages").delete().eq("workspace_id", workspaceId).eq("applicant_key", SAMPLE_APPLICANT_KEY);
  return SAMPLE_APPLICANT_KEY;
}

/** Deletes everything in the caller's demo workspace and seeds it again. Other users' demos are untouched. */
export async function resetDemoWorkspace(userId: string): Promise<void> {
  const workspaceId = await ensureDemoWorkspace(userId);
  const admin = createAdminSupabaseClient();
  for (const table of ["demo_workspace_messages", "demo_workspace_decisions", "demo_workspace_applicants"] as const) {
    const { error } = await admin.from(table).delete().eq("workspace_id", workspaceId);
    if (error) throw new DemoWorkspaceError("The demo could not be reset. Nothing else was changed.", 500);
  }
  await seed(admin, workspaceId);
  const { error } = await admin
    .from("demo_workspaces")
    .update({ reset_at: new Date().toISOString(), seed_version: DEMO_SEED_VERSION })
    .eq("id", workspaceId)
    .eq("user_id", userId);
  if (error) throw new DemoWorkspaceError("The demo was reset but the reset time could not be recorded.", 500);
}
