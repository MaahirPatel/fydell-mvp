import { NextResponse } from "next/server";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { getAllCatalogSpecs, KNOWN_GOOD_RELEASE_ID } from "@/lib/relay/variants/catalog";
import { materializeVariant } from "@/lib/relay/variants/materialize";
import { readVariantState } from "@/lib/relay/variants/store";
import { validateVariant } from "@/lib/relay/variants/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requirePlatformRoleApi(["super_admin", "admin", "operator", "reviewer"]);
  if ("error" in ctx) return ctx.error;

  const state = readVariantState();

  const variants = getAllCatalogSpecs().map((spec) => {
    const files = materializeVariant(spec);
    const validation = validateVariant(files);
    const entry = state[spec.id];
    const effectiveStatus = entry?.statusOverride ?? spec.status;

    return {
      spec,
      effectiveStatus,
      fileCount: Object.keys(files).length,
      validation,
      lastValidatedAt: entry?.lastValidatedAt ?? null,
      signedReleases: entry?.signedReleases ?? [],
      updatedBy: entry?.updatedBy ?? null,
      updatedAt: entry?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ variants, knownGoodReleaseId: KNOWN_GOOD_RELEASE_ID });
}
