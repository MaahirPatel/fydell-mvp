/**
 * One-shot: create a pilot test employer with completed onboarding.
 * Usage: npx tsx scripts/create-test-employer.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

function loadEnv() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) throw new Error("Missing .env.local");
  const raw = readFileSync(p);
  // Strip UTF-8 BOM if present (common on Windows)
  const text = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
    ? raw.slice(3).toString("utf8")
    : raw.toString("utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnv();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !service) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const email = `pilot.demo+${Date.now().toString(36)}@fydell.com`;
const password = `Pilot-${randomBytes(6).toString("base64url")}!9`;
const company = "Northline Capital";

async function main() {
  const admin = createClient(url!, service!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "Pilot Demo",
      company_name: company,
      account_type: "employer",
    },
  });
  if (createErr || !created.user) {
    throw new Error(createErr?.message || "createUser failed");
  }
  const userId = created.user.id;

  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Pilot Demo",
    company_name: company,
    account_type: "employer",
    onboarding_state: "completed",
    role: "employer",
  });

  const slug = `northline-capital-${randomBytes(3).toString("hex")}`;
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name: company,
      slug,
      website: "https://northline.example",
      industry: "Finance",
      company_size: "51-200",
      status: "active",
      pilot_stage: "active",
      created_by: userId,
      owner_id: userId,
      owner_email: email,
    })
    .select("*")
    .single();
  if (orgErr || !org) throw new Error(orgErr?.message || "org failed");

  const { error: memErr } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: userId,
    role: "owner",
    status: "active",
    invited_by: userId,
    joined_at: new Date().toISOString(),
  });
  if (memErr) throw new Error(memErr.message);

  const { data: role, error: roleErr } = await admin
    .from("hiring_roles")
    .insert({
      organization_id: org.id,
      title: "FP&A Analyst",
      seniority: "mid",
      status: "active",
      first_90_day_outcomes: [
        "Own the monthly operating forecast",
        "Explain material budget variances",
        "Surface downside risks early",
      ],
      simulation_template_key: "project-meridian",
      invites_enabled: true,
      created_by: userId,
      opened_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (roleErr || !role) throw new Error(roleErr?.message || "role failed");

  await admin.from("employer_onboarding").upsert({
    user_id: userId,
    organization_id: org.id,
    current_step: 9,
    company_name: company,
    company_website: "https://northline.example",
    job_title: "Head of FP&A",
    company_size: "51-200",
    industry: "Finance",
    role_title: "FP&A Analyst",
    first_90_day_outcomes: [
      "Own the monthly operating forecast",
      "Explain material budget variances",
      "Surface downside risks early",
    ],
    approval_status: "approved",
    completed_at: new Date().toISOString(),
  });

  console.log(
    JSON.stringify(
      {
        loginUrl: "https://www.fydell.com/login",
        email,
        password,
        company,
        organizationId: org.id,
        roleId: role.id,
        note: "Empty candidates until you invite someone. Not a fake people list.",
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
