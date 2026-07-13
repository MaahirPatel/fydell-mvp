import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  completeEmployerOnboarding,
  ensureEmployerOnboardingRow,
} from "@/lib/pilot/lifecycle";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = await ensureEmployerOnboardingRow(data.user.id);
  return NextResponse.json({ onboarding: row });
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.action === "save_step") {
      const admin = createAdminSupabaseClient();
      await ensureEmployerOnboardingRow(data.user.id);
      const { error } = await admin
        .from("employer_onboarding")
        .update({
          current_step: body.currentStep ?? 1,
          company_name: body.companyName ?? null,
          company_website: body.companyWebsite ?? null,
          job_title: body.jobTitle ?? null,
          company_size: body.companySize ?? null,
          industry: body.industry ?? null,
          timezone: body.timezone ?? null,
          role_title: body.roleTitle ?? null,
          role_seniority: body.roleSeniority ?? null,
          first_90_day_outcomes: body.outcomes ?? [],
          referral_source: body.referralSource ?? null,
        })
        .eq("user_id", data.user.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "complete") {
      const result = await completeEmployerOnboarding({
        userId: data.user.id,
        email: data.user.email,
        companyName: String(body.companyName || ""),
        companyWebsite: body.companyWebsite,
        jobTitle: body.jobTitle,
        companySize: body.companySize,
        industry: body.industry,
        timezone: body.timezone,
        roleTitle: body.roleTitle,
        roleSeniority: body.roleSeniority,
        outcomes: body.outcomes || [],
        referralSource: body.referralSource,
      });
      return NextResponse.json({
        ok: true,
        organizationId: result.organization.id,
        roleId: result.role.id,
        approval: result.approval,
        invitesEnabled: result.invitesEnabled,
        redirectTo: "/dashboard",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onboarding failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
