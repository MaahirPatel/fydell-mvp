/**
 * Publish only the Wave 1 DA-01 fixture. Never seeds the other micros.
 *
 *   npx tsx scripts/seed-da01.ts
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { MICRO_OPS_YIELD, PILOT_EVALUATION_SLUG } from "../src/lib/simulations/content/micro-ops-yield";
import { DA01_CONTENT_VERSION } from "../src/lib/contracts/da01";
import { validateMicroSim } from "../src/lib/simulations/micro-types";

function loadEnv() {
  for (const file of [".env.staging.local", ".env.goldenpath", ".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(process.cwd(), file));
      let text = raw.toString("utf8");
      if (text.includes("\u0000")) text = raw.toString("utf16le");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const value = m[2].replace(/^["']|["']$/g, "");
        if (!value || value === "[SENSITIVE]") continue;
        if (!process.env[m[1]]) process.env[m[1]] = value;
      }
    } catch {
      /* absent */
    }
  }
}

async function main() {
  loadEnv();
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed production");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (url.includes("qtrhwrcxthtqvkeerptp")) {
    throw new Error("Refusing to seed the production project");
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const errors = validateMicroSim(MICRO_OPS_YIELD);
  if (errors.length) throw new Error(errors.join("; "));

  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const contentHash = createHash("sha256")
    .update(JSON.stringify(MICRO_OPS_YIELD))
    .digest("hex")
    .slice(0, 16);

  const { data: existing, error: lookupErr } = await db
    .from("sim_templates")
    .select("id, current_version_id")
    .eq("slug", PILOT_EVALUATION_SLUG)
    .maybeSingle();
  if (lookupErr) throw new Error(`sim_templates missing: ${lookupErr.message}`);

  let templateId = existing?.id as string | undefined;
  if (!templateId) {
    const { data: created, error } = await db
      .from("sim_templates")
      .insert({
        slug: PILOT_EVALUATION_SLUG,
        role_key: MICRO_OPS_YIELD.roleKey,
        title: MICRO_OPS_YIELD.title,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    templateId = created.id;
  }

  if (existing?.current_version_id) {
    const { data: current } = await db
      .from("sim_template_versions")
      .select("change_notes")
      .eq("id", existing.current_version_id)
      .single();
    if (current?.change_notes?.includes(contentHash)) {
      console.log(`DA-01 unchanged (${DA01_CONTENT_VERSION}, hash ${contentHash})`);
      return;
    }
  }

  const { data: latest } = await db
    .from("sim_template_versions")
    .select("version")
    .eq("template_id", templateId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version || 0) + 1;
  const { data: version, error: vErr } = await db
    .from("sim_template_versions")
    .insert({
      template_id: templateId,
      version: nextVersion,
      content: MICRO_OPS_YIELD,
      change_notes: `wave1-rc1 ${DA01_CONTENT_VERSION} hash:${contentHash}`,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (vErr) throw vErr;

  const { error: uErr } = await db
    .from("sim_templates")
    .update({
      current_version_id: version.id,
      status: "published",
      title: MICRO_OPS_YIELD.title,
      role_key: MICRO_OPS_YIELD.roleKey,
    })
    .eq("id", templateId);
  if (uErr) throw uErr;
  console.log(`DA-01 published v${nextVersion} ${DA01_CONTENT_VERSION} hash:${contentHash}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
