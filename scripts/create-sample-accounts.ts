/**
 * Creates a sample developer, employer and platform admin in the development
 * project. Developer and employer go through the real signup route so they
 * get exactly what a new user gets. Refuses to run against production.
 *
 * Usage (dev server on localhost:3000): npx tsx scripts/create-sample-accounts.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { randomBytes } from "crypto";

const DEV_PROJECT = "btbmvrvynnrhapjdkunz";
const APP = process.env.APP_URL || "http://localhost:3000";
const ENV_PATH = resolve(process.cwd(), ".env.local");

function loadEnv(): string {
  if (!existsSync(ENV_PATH)) throw new Error("Missing .env.local");
  let text = readFileSync(ENV_PATH, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[t.slice(0, i).trim()] = v;
  }
  return text;
}

const envText = loadEnv();
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url.includes(DEV_PROJECT)) {
  console.error("Refusing to run: .env.local does not point at the development project.");
  process.exit(1);
}
if (!service) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
const password = () => `Fydell-${randomBytes(5).toString("base64url")}-9`;

async function signup(body: Record<string, string>): Promise<void> {
  const res = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(`signup ${body.email}: ${json.error || res.status}`);
}

async function createAdmin(email: string, pass: string): Promise<void> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
    user_metadata: { full_name: "Sample Admin" },
  });
  if (error || !data.user) throw new Error(`admin user: ${error?.message}`);
  const { error: roleErr } = await admin.from("platform_user_roles").insert({
    user_id: data.user.id,
    role: "super_admin",
    is_active: true,
    granted_at: new Date().toISOString(),
  });
  if (roleErr) throw new Error(`admin role: ${roleErr.message}`);

  // The admin portal checks credentials against ADMIN_ACCOUNTS on the server.
  const entry = `${email}:${pass}`;
  const lines = envText.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.startsWith("ADMIN_ACCOUNTS="));
  if (idx >= 0) {
    const current = lines[idx].slice("ADMIN_ACCOUNTS=".length).trim();
    lines[idx] = `ADMIN_ACCOUNTS=${current ? `${current},${entry}` : entry}`;
  } else {
    lines.push(`ADMIN_ACCOUNTS=${entry}`);
  }
  writeFileSync(ENV_PATH, lines.join("\n"), "utf8");
}

async function main() {
  const tag = Date.now().toString(36);
  const developer = { email: `sample.developer+${tag}@example.com`, password: password() };
  const employer = { email: `sample.employer+${tag}@example.com`, password: password() };
  const platformAdmin = { email: `sample.admin+${tag}@example.com`, password: password() };

  await signup({ path: "fde", name: "Maya Okafor", ...developer });
  await signup({
    path: "employer",
    name: "Jordan Hayes",
    companyName: "Northline Labs",
    companyWebsite: "https://northline.example",
    ...employer,
  });
  await createAdmin(platformAdmin.email, platformAdmin.password);

  console.log(JSON.stringify({ signIn: `${APP}/login`, developer, employer, admin: platformAdmin }, null, 2));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
