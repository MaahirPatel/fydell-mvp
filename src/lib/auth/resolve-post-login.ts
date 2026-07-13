import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { listActiveRolesForEmail } from "@/lib/ops/platform-roles";
import { getAdminSession } from "@/lib/auth";

export type PostLoginDestination =
  | { kind: "admin"; path: "/admin/overview" }
  | { kind: "dashboard"; path: "/dashboard" }
  | { kind: "onboarding"; path: "/onboarding/employer" }
  | { kind: "candidate"; path: string }
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

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id, status, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership?.organization_id) {
    return { kind: "dashboard", path: "/dashboard" };
  }

  const { data: onboarding } = await admin
    .from("employer_onboarding")
    .select("id, completed_at, approval_status, current_step")
    .eq("user_id", userId)
    .maybeSingle();

  if (onboarding && !onboarding.completed_at) {
    return { kind: "onboarding", path: "/onboarding/employer" };
  }

  // Completed onboarding without membership is rare; send back to finish setup.
  if (onboarding?.completed_at) {
    return { kind: "onboarding", path: "/onboarding/employer" };
  }

  const { data: candidate } = await admin
    .from("pilot_candidates")
    .select("id")
    .eq("auth_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (candidate?.id) {
    const { data: assignment } = await admin
      .from("simulation_assignments")
      .select("id, status")
      .eq("candidate_id", candidate.id)
      .not("status", "in", '("cancelled","expired")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assignment?.id) {
      return { kind: "candidate", path: `/candidate/assignments/${assignment.id}` };
    }
    return { kind: "candidate", path: "/candidate" };
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
