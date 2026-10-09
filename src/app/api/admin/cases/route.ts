import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/security/request-body";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { ADMIN_SHELL_ROLES } from "@/lib/ops/admin-permissions";
import { requireAal2ForSensitiveAction } from "@/lib/ops/mfa";
import {
  correctCommercialRecord,
  diagnose,
  grantCodeAccess,
  grantReplacementAttempt,
  openIncident,
  revokeCodeAccess,
  reviewIncident,
  type CaseResult,
} from "@/lib/ops/admin-cases";

export const dynamic = "force-dynamic";

const ACTIONS = [
  "code_access.grant",
  "code_access.revoke",
  "incident.open",
  "incident.review",
  "attempt.replace",
  "commercial.correct",
  "diagnose",
] as const;
type CaseAction = (typeof ACTIONS)[number];

const SENSITIVE: ReadonlySet<CaseAction> = new Set(["code_access.grant", "attempt.replace", "commercial.correct"]);

function isCaseAction(value: unknown): value is CaseAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

function respond<T>(result: CaseResult<T>) {
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, result: result.value });
}

export async function POST(req: Request) {
  const gate = await requirePlatformRoleApi(ADMIN_SHELL_ROLES);
  if ("error" in gate) return gate.error;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = await readJsonObject(req);
  if (!isCaseAction(body.action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const action = body.action;
  if (SENSITIVE.has(action)) {
    const mfa = requireAal2ForSensitiveAction(gate);
    if (mfa.ok === false) return NextResponse.json({ error: mfa.error }, { status: 403 });
  }

  const db = createAdminSupabaseClient();
  try {
    switch (action) {
      case "code_access.grant":
        return respond(await grantCodeAccess(db, gate, { attemptId: body.attemptId, justification: body.justification, minutes: body.minutes }));
      case "code_access.revoke":
        return respond(await revokeCodeAccess(db, gate, body.grantId));
      case "incident.open":
        return respond(
          await openIncident(db, gate, { subjectType: body.subjectType, subjectId: body.subjectId, kind: body.kind, summary: body.summary }),
        );
      case "incident.review":
        return respond(
          await reviewIncident(db, gate, {
            incidentId: body.incidentId,
            expectedStatus: body.expectedStatus,
            status: body.status,
            notes: body.notes,
          }),
        );
      case "attempt.replace":
        return respond(await grantReplacementAttempt(db, gate, { attemptId: body.attemptId, incidentId: body.incidentId, reason: body.reason }));
      case "commercial.correct":
        return respond(
          await correctCommercialRecord(db, gate, {
            organizationId: body.organizationId,
            entryType: body.entryType,
            quantity: body.quantity,
            reason: body.reason,
            idempotencyKey: body.idempotencyKey,
          }),
        );
      case "diagnose":
        return respond(await diagnose(db, gate, body.subjectType, body.subjectId));
    }
  } catch (err) {
    const reference = `ADM-${Date.now().toString(36).toUpperCase()}`;
    console.error(`[admin/cases:${action}] ${reference}`, err);
    return NextResponse.json(
      { error: `The action failed on our side (reference ${reference}). Check the record's current state before retrying.` },
      { status: 500 },
    );
  }
}
