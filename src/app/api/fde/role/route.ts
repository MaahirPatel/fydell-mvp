import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { completeEmployerOnboarding } from "@/lib/pilot/lifecycle";
import { ensureFdeProfile, audit } from "@/lib/fde/lifecycle";
import { isReservedOrganizationName } from "@/lib/org/reserved";
import { partnerSignupEnabled } from "@/lib/fde/flags";

export const dynamic = "force-dynamic";

type Role = "employer" | "fde" | "partner";

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const role = String(body.role || "") as Role;
    if (!["employer", "fde", "partner"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (role === "partner" && !partnerSignupEnabled()) {
      return NextResponse.json({ error: "Partner signup is not open yet." }, { status: 403 });
    }

    const userId = authData.user.id;
    const email = (authData.user.email || "").toLowerCase();
    const admin = createAdminSupabaseClient();

    let redirectTo = "/";

    if (role === "employer") {
      const companyName = String(body.companyName || "").trim();
      const companyWebsite = body.companyWebsite ? String(body.companyWebsite).trim() : "";
      if (!companyName) {
        return NextResponse.json({ error: "Company name is required." }, { status: 400 });
      }
      if (isReservedOrganizationName(companyName)) {
        return NextResponse.json(
          { error: "That organization name is reserved and cannot be claimed." },
          { status: 400 }
        );
      }

      await admin
        .from("profiles")
        .update({ account_type: "employer", onboarding_state: "started", company_name: companyName })
        .eq("id", userId);

      await completeEmployerOnboarding({
        userId,
        email,
        companyName,
        companyWebsite: companyWebsite || null,
      });
      redirectTo = "/app/employer/missions/new";
    } else if (role === "fde") {
      await ensureFdeProfile(userId);
      await admin
        .from("profiles")
        .update({ account_type: "fde", onboarding_state: "completed" })
        .eq("id", userId);
      redirectTo = "/app/fde";
    } else {
      const firmName = body.firmName ? String(body.firmName).trim() : "";
      await admin
        .from("profiles")
        .update({
          account_type: "partner",
          onboarding_state: "partner_pending_approval",
          company_name: firmName || null,
        })
        .eq("id", userId);
      redirectTo = "/account/setup-required?reason=partner_pending";
    }

    await audit(userId, `signup_role.${role}`, "profile", userId, { role, email });

    return NextResponse.json({ ok: true, redirectTo });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not set your role.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
