/**
 * Seed / publish simulation templates from authored content.
 *
 * Idempotent: templates are matched by slug. Content that changed since the
 * last published version creates a NEW immutable version and points
 * current_version_id at it; unchanged content is left alone. Existing
 * sessions keep their pinned versions.
 *
 * Usage: npx tsx scripts/seed-simulations.ts
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { ALL_SIMULATIONS } from "../src/lib/simulations/content/index";
import { validateMicroSim } from "../src/lib/simulations/micro-types";

function loadEnv() {
  for (const file of [".env.goldenpath", ".env.local", ".env"]) {
    try {
      let raw = readFileSync(resolve(process.cwd(), file));
      let text = raw.toString("utf8");
      if (text.includes("\u0000")) text = raw.toString("utf16le");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let value = m[2].replace(/^["']|["']$/g, "");
        if (!value || value === "[SENSITIVE]") continue;
        if (!process.env[m[1]]) process.env[m[1]] = value;
      }
    } catch {
      /* file absent */
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  let failures = 0;
  for (const content of ALL_SIMULATIONS) {
    const errors = validateMicroSim(content);
    if (errors.length) {
      console.error(`✗ ${content.slug}: validation failed`);
      for (const e of errors) console.error(`    - ${e}`);
      failures++;
      continue;
    }

    const contentHash = createHash("sha256")
      .update(JSON.stringify(content))
      .digest("hex")
      .slice(0, 16);

    const { data: existing } = await db
      .from("sim_templates")
      .select("id, current_version_id, status")
      .eq("slug", content.slug)
      .maybeSingle();

    let templateId = existing?.id as string | undefined;
    if (!templateId) {
      const { data: created, error } = await db
        .from("sim_templates")
        .insert({
          slug: content.slug,
          role_key: content.roleKey,
          title: content.title,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) {
        console.error(`✗ ${content.slug}: ${error.message}`);
        failures++;
        continue;
      }
      templateId = created.id;
    }

    // Skip if the current published version already has this content hash.
    if (existing?.current_version_id) {
      const { data: current } = await db
        .from("sim_template_versions")
        .select("change_notes")
        .eq("id", existing.current_version_id)
        .single();
      if (current?.change_notes?.includes(contentHash)) {
        console.log(`= ${content.slug}: unchanged (hash ${contentHash})`);
        continue;
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
        content,
        change_notes: `seed ${new Date().toISOString()} hash:${contentHash}`,
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (vErr) {
      console.error(`✗ ${content.slug}: ${vErr.message}`);
      failures++;
      continue;
    }

    const { error: uErr } = await db
      .from("sim_templates")
      .update({
        current_version_id: version.id,
        status: "published",
        title: content.title,
        role_key: content.roleKey,
      })
      .eq("id", templateId);
    if (uErr) {
      console.error(`✗ ${content.slug}: ${uErr.message}`);
      failures++;
      continue;
    }
    console.log(`✓ ${content.slug}: published v${nextVersion} (hash ${contentHash})`);
  }

  if (failures) {
    console.error(`\n${failures} template(s) failed`);
    process.exit(1);
  }
  console.log(`\nSeed complete: ${ALL_SIMULATIONS.length} template(s) processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
