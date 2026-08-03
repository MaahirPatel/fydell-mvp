/**
 * Emits idempotent SQL that seeds/publishes the authored simulations.
 * Used when direct service-role access isn't available locally
 * (the SQL is applied through the Supabase management connection).
 *
 * Usage: npx tsx scripts/emit-seed-sql.ts   → writes scripts/seed-sims.sql
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { ALL_SIMULATIONS } from "../src/lib/simulations/content/index";
import { validateMicroSim } from "../src/lib/simulations/micro-types";

const stmts: string[] = [];

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

let failures = 0;
for (const content of ALL_SIMULATIONS) {
  const errors = validateMicroSim(content);
  if (errors.length) {
    console.error(`INVALID ${content.slug}: ${errors.join("; ")}`);
    failures++;
    continue;
  }
  const json = sqlString(JSON.stringify(content));
  stmts.push(`
do $$
declare
  t_id uuid;
  v_id uuid;
  existing_content jsonb;
begin
  select id into t_id from public.sim_templates where slug = ${sqlString(content.slug)};
  if t_id is null then
    insert into public.sim_templates (slug, role_key, title, status)
    values (${sqlString(content.slug)}, ${sqlString(content.roleKey)}, ${sqlString(content.title)}, 'published')
    returning id into t_id;
  else
    update public.sim_templates
      set role_key = ${sqlString(content.roleKey)}, title = ${sqlString(content.title)}, status = 'published'
      where id = t_id;
  end if;

  select tv.content into existing_content
    from public.sim_templates t
    join public.sim_template_versions tv on tv.id = t.current_version_id
    where t.id = t_id;

  if existing_content is distinct from ${json}::jsonb then
    insert into public.sim_template_versions (template_id, version, content, published_at)
    values (
      t_id,
      coalesce((select max(version) from public.sim_template_versions where template_id = t_id), 0) + 1,
      ${json}::jsonb,
      now()
    )
    returning id into v_id;
    update public.sim_templates set current_version_id = v_id where id = t_id;
  end if;
end $$;`);
}

if (failures) {
  console.error(`${failures} simulation(s) failed validation — SQL not written.`);
  process.exit(1);
}

const out = resolve(process.cwd(), "scripts", "seed-sims.sql");
writeFileSync(out, stmts.join("\n"), "utf8");
console.log(`Wrote ${stmts.length} seed statements to ${out}`);
