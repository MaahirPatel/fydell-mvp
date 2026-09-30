/**
 * Employer role intake (docs/frontend-backend-contract.md#role-intake).
 *
 * GET  → the role-family catalog as employers may see it (no answer keys).
 * POST → validate and screen an intake, recommend usable scenarios, persist
 *        the intake and, when nothing fits, a role request.
 *
 * Idempotency-Key header (8–80 chars) makes a retried POST return the same
 * intake. Criteria that name protected characteristics or culture fit are
 * rejected with 422 and nothing is stored. Without a configured database the
 * result is returned with `persisted: false`.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isOrgRole, roleCan } from "@/lib/eng/permissions";
import { processIntake } from "@/lib/employer/intake";
import { CATALOG, summarize } from "@/lib/scenario-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same envelope as /api/employer/roles: `error` stays a readable string for
// existing clients; `code` is the machine-readable category.
function error(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export async function GET() {
  const user = await requireUser();
  if (!user) return error(401, "unauthorized", "Sign in to continue.");
  const org = await requireOrgMember(user.id);
  if (!org) return error(403, "forbidden", "You are not a member of an active hiring workspace.");
  return NextResponse.json({ ok: true, families: CATALOG.map(summarize) });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return error(401, "unauthorized", "Sign in to continue.");
  const org = await requireOrgMember(user.id);
  if (!org) return error(403, "forbidden", "You are not a member of an active hiring workspace.");
  if (!isOrgRole(org.role) || !roleCan(org.role, "manage_roles")) {
    return error(403, "forbidden", "Your workspace role cannot create hiring roles. Ask a workspace admin.");
  }

  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey !== null && !/^[A-Za-z0-9_.:-]{8,80}$/.test(idempotencyKey)) {
    return error(400, "validation_failed", "Idempotency-Key must be 8–80 characters of letters, digits, _ . : or -.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(400, "validation_failed", "Invalid JSON body.");
  }

  const outcome = processIntake(body);
  if (outcome.ok === false) {
    if (outcome.code === "validation_failed") {
      return error(400, "validation_failed", "Some fields are missing or invalid. Fix them and submit again.", { issues: outcome.issues });
    }
    return error(422, "criteria_rejected", "Some criteria cannot be assessed. Each one below says why and what to write instead.", {
      screening: outcome.screening,
    });
  }

  const { intake, screening, match } = outcome;
  const response = {
    ok: true,
    screening,
    recommendations: match.recommendations,
    unavailable: match.unavailable,
    roleRequest: match.roleRequest,
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ...response, intakeId: null, roleRequestId: null, persisted: false });
  }

  const db = createAdminSupabaseClient();
  const row = {
    organization_id: org.organizationId,
    created_by: user.id,
    client_request_id: idempotencyKey,
    title: intake.title,
    role_family: intake.family,
    intake,
    screening,
    recommended: match.recommendations.map((r) => ({
      scenarioId: r.scenarioId,
      version: r.scenarioVersion,
      templateSlug: r.templateSlug,
      availability: r.availability,
    })),
  };

  const inserted = await db.from("employer_role_intakes").insert(row).select("id").single();
  let intakeId = inserted.data?.id as string | undefined;
  let replayed = false;
  if (inserted.error) {
    if (inserted.error.code === "23505" && idempotencyKey) {
      const existing = await db
        .from("employer_role_intakes")
        .select("id")
        .eq("organization_id", org.organizationId)
        .eq("client_request_id", idempotencyKey)
        .single();
      intakeId = existing.data?.id;
      replayed = true;
    } else {
      console.error("[role-intake] insert failed:", inserted.error.message);
      return error(503, "retryable_provider_failure", "We could not save this role. Try again in a moment.", { retryable: true });
    }
  }

  let roleRequestId: string | null = null;
  if (match.roleRequest && intakeId) {
    const existing = await db.from("role_requests").select("id").eq("intake_id", intakeId).maybeSingle();
    if (existing.data) {
      roleRequestId = existing.data.id;
    } else {
      const created = await db
        .from("role_requests")
        .insert({
          organization_id: org.organizationId,
          requested_by: user.id,
          intake_id: intakeId,
          role_family: match.roleRequest.family,
          title: match.roleRequest.title,
          reason: match.roleRequest.reason,
          detail: match.roleRequest.detail.slice(0, 2000),
        })
        .select("id")
        .single();
      if (created.error) console.error("[role-intake] role request insert failed:", created.error.message);
      roleRequestId = created.data?.id ?? null;
    }
  }

  return NextResponse.json({ ...response, intakeId: intakeId ?? null, roleRequestId, persisted: true, replayed });
}
