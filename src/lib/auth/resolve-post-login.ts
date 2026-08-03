import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { listActiveRolesForEmail } from "@/lib/ops/platform-roles";
import { getAdminSession } from "@/lib/auth";
import { marketplaceRoutingEnabled } from "@/lib/auth/flags";

export type PostLoginDestination =
  | { kind: "admin"; path: "/admin/overview" }
  | { kind: "dashboard"; path: "/app/employer" }
  | { kind: "onboarding"; path: "/app/employer" }
  | { kind: "candidate"; path: string }
  | { kind: "fde"; path: "/app/candidate" }
  | { kind: "employer_app"; path: "/app/employer" }
  | { kind: "role_pending"; path: "/signup/role" }
  | { kind: "setup"; path: "/account/setup-required"; reason: string };

/**
 * Server-side role resolution after authentication.
 * Never trust client redirects alone.
 */
export async function resolvePostLoginDestination(
  email: string,
  userId?: string | null
): Promise<PostLoginDestination> {
  const normalized = email.trim().toLowerCase();

  // Transitional admin env session OR platform roles
  const adminSession = await getAdminSession();
  if (adminSession?.email === normalized) {
    return { kind: "admin", path: "/admin/overview" };
  }

  try {
    const roles = await listActiveRolesForEmail(normalized);
    if (roles.length > 0) {
      return { kind: "admin", path: "/admin/overview" };
    }
  } catch {
    // continue
  }

  if (!isSupabaseConfigured() || !userId) {
    return {
      kind: "setup",
      path: "/account/setup-required",
      reason: "no_user_or_supabase",
    };
  }

  const admin = createAdminSupabaseClient();

  if (marketplaceRoutingEnabled()) {
    const { data: profile } = await admin
      .from("profiles")
      .select("account_type")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.account_type === "unresolved") {
      return { kind: "role_pending", path: "/signup/role" };
    }

    if (profile?.account_type === "fde") {
      // Legacy account_type value; the destination is the candidate home.
      return { kind: "fde", path: "/app/candidate" };
    }

    if (profile?.account_type === "partner") {
      // No partner approval flow yet. Every partner signup lands pending.
      return {
        kind: "setup",
        path: "/account/setup-required",
        reason: "partner_pending",
      };
    }

    if (profile?.account_type === "employer") {
      const { data: employerMembership } = await admin
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (employerMembership?.organization_id) {
        return { kind: "employer_app", path: "/app/employer" };
      }
    }
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id, status, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership?.organization_id) {
    return { kind: "dashboard", path: "/app/employer" };
  }

  const { data: onboarding } = await admin
    .from("employer_onboarding")
    .select("id, completed_at, approval_status, current_step")
    .eq("user_id", userId)
    .maybeSingle();

  if (onboarding) {
    return { kind: "onboarding", path: "/app/employer" };
  }

  const { data: candidate } = await admin
    .from("pilot_candidates")
    .select("id")
    .eq("auth_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (candidate?.id) {
    return { kind: "candidate", path: "/app/candidate" };
  }

  return {
    kind: "setup",
    path: "/account/setup-required",
    reason: "unaffiliated",
  };
}

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
