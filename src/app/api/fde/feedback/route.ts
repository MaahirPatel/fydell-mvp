import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["bug", "idea", "confusing", "other"];

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const category = VALID_CATEGORIES.includes(String(body.category)) ? String(body.category) : "other";
    const message = String(body.message || "").trim();
    if (message.length < 5) {
      return NextResponse.json({ error: "Add a few more words so we know what you mean." }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Prefer a dedicated product_feedback table if this environment has one.
    // Most environments won't yet — fall back to the audit log so nothing is lost.
    const { error: feedbackError } = await admin.from("product_feedback").insert({
      user_id: data.user.id,
      category,
      message,
    });

    if (feedbackError) {
      await audit(data.user.id, "product_feedback.submitted", "product_feedback", null, {
        category,
        message,
      });
    }

    return NextResponse.json({ ok: true, storedIn: feedbackError ? "audit_log" : "product_feedback" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not submit feedback.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
