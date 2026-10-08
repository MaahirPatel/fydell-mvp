"use server";

import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE } from "@/lib/eng/context";
import { requireUser } from "@/lib/simulations/auth";
import { listOrganizations } from "./contexts";

export type SwitchOrganizationResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Makes an organization the one `/app/employer` opens. Only an organization the
 * caller is an active member of is accepted; every employer page re-reads the
 * membership on each request, so the cookie names a choice, never a grant.
 */
export async function switchOrganization(organizationId: unknown): Promise<SwitchOrganizationResult> {
  if (typeof organizationId !== "string" || !UUID.test(organizationId)) {
    return { ok: false, error: "Choose an organization." };
  }
  const user = await requireUser();
  if (!user) return { ok: false, error: "Sign in to continue." };
  const organizations = await listOrganizations(user.id);
  if (!organizations.some((o) => o.id === organizationId)) {
    return { ok: false, error: "You are not an active member of that organization." };
  }
  (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { ok: true };
}
