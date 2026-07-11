/**
 * Development-only seed. Never runs in production.
 *
 *   ALLOW_DEV_SEED=true npx tsx scripts/seed-development.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed production");
  }
  if (process.env.ALLOW_DEV_SEED !== "true") {
    throw new Error("Set ALLOW_DEV_SEED=true to run this script");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = "founder@example.com";
  const { data: existing } = await admin
    .from("pilot_requests")
    .select("id, public_reference")
    .eq("work_email", email)
    .maybeSingle();

  let pilotId = existing?.id as string | undefined;
  if (!pilotId) {
    const { data, error } = await admin
      .from("pilot_requests")
      .insert({
        name: "Example Founder",
        email,
        company: "Example Finance Co",
        role_title: "FP&A Analyst",
        full_name: "Example Founder",
        work_email: email,
        company_name: "Example Finance Co",
        role_being_hired: "FP&A Analyst",
        status: "new",
        source: "seed-development",
        message: "TEST DATA — safe to delete",
      })
      .select("id, public_reference")
      .single();
    if (error) throw error;
    pilotId = data.id;
    console.log("Created test pilot request", data.public_reference);
  } else {
    console.log("Reusing test pilot request", existing?.public_reference);
  }

  await admin.from("email_outbox").upsert(
    {
      event_type: "seed",
      template_key: "pilot_request_received",
      recipient_email: email,
      payload: { fullName: "Example Founder", companyName: "Example Finance Co" },
      related_entity_type: "pilot_request",
      related_entity_id: pilotId,
      idempotency_key: `seed-pilot-ack:${pilotId}`,
      status: "pending",
    },
    { onConflict: "idempotency_key" }
  );

  console.log("Seed complete (example.com only).");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
