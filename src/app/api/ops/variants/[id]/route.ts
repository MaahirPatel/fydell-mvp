import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { writeAudit } from "@/lib/ops/platform-roles";
import { findCatalogSpec } from "@/lib/relay/variants/catalog";
import { materializeVariant } from "@/lib/relay/variants/materialize";
import { variantReleaseId } from "@/lib/relay/variants/resolve";
import {
  getEffectiveStatus,
  recordValidation,
  setStatusOverride,
  signRelease,
} from "@/lib/relay/variants/store";
import { validateVariant } from "@/lib/relay/variants/validate";

export const dynamic = "force-dynamic";

const ACTIONS = ["approve", "reject", "retire", "revalidate", "sign_release"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: unknown): value is Action {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformRoleApi(["super_admin", "admin", "operator", "reviewer"]);
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const spec = findCatalogSpec(id);
  if (!spec) return NextResponse.json({ error: "Unknown variant id" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = (body as { action?: unknown })?.action;
  if (!isAction(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    if (action === "approve" || action === "reject" || action === "retire") {
      const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "retired";
      const entry = setStatusOverride(spec.id, status, admin.email);
      await writeAudit({
        actorEmail: admin.email,
        action: `relay_variant.${action}`,
        entityType: "relay_variant",
        entityId: spec.id,
        after: { status },
      });
      return NextResponse.json({ ok: true, effectiveStatus: status, entry });
    }

    if (action === "revalidate") {
      const files = materializeVariant(spec);
      const validation = validateVariant(files);
      const entry = recordValidation(spec.id, validation);
      await writeAudit({
        actorEmail: admin.email,
        action: "relay_variant.revalidated",
        entityType: "relay_variant",
        entityId: spec.id,
        after: { ok: validation.ok, errorCount: validation.errors.length },
      });
      return NextResponse.json({ ok: true, validation, entry });
    }

    // sign_release
    const effectiveStatus = getEffectiveStatus(spec);
    if (effectiveStatus !== "approved") {
      return NextResponse.json(
        { error: `Cannot sign a release for a variant with status "${effectiveStatus}" — approve it first.` },
        { status: 400 }
      );
    }
    const files = materializeVariant(spec);
    const validation = validateVariant(files);
    recordValidation(spec.id, validation);
    if (!validation.ok) {
      return NextResponse.json(
        { error: "Cannot sign a release — validation failed.", validation },
        { status: 400 }
      );
    }
    const releaseId = variantReleaseId(spec, files);
    const contentHash = createHash("sha256").update(JSON.stringify(files)).digest("hex");
    const signed = signRelease(spec.id, releaseId, contentHash, admin.email);
    await writeAudit({
      actorEmail: admin.email,
      action: "relay_variant.release_signed",
      entityType: "relay_variant",
      entityId: spec.id,
      after: { releaseId, contentHash },
    });
    return NextResponse.json({ ok: true, signed, releaseId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not perform action.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
