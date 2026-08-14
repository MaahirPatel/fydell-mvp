/**
 * Emit idempotent DA-01 seed SQL for MCP apply on fydell-dev.
 * Does not connect to any database.
 */
import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { MICRO_OPS_YIELD, PILOT_EVALUATION_SLUG } from "../src/lib/simulations/content/micro-ops-yield";
import { DA01_CONTENT_VERSION } from "../src/lib/contracts/da01";
import { validateMicroSim } from "../src/lib/simulations/micro-types";

const errors = validateMicroSim(MICRO_OPS_YIELD);
if (errors.length) throw new Error(errors.join("; "));

const contentHash = createHash("sha256")
  .update(JSON.stringify(MICRO_OPS_YIELD))
  .digest("hex")
  .slice(0, 16);
const json = JSON.stringify(MICRO_OPS_YIELD).replace(/'/g, "''");

const sql = `-- Wave 1 DA-01 fixture only. Idempotent. No other micros.
-- content ${DA01_CONTENT_VERSION} hash:${contentHash}

insert into public.sim_templates (slug, role_key, title, status)
select '${PILOT_EVALUATION_SLUG}', '${MICRO_OPS_YIELD.roleKey}', '${MICRO_OPS_YIELD.title.replace(/'/g, "''")}', 'draft'
where not exists (
  select 1 from public.sim_templates where slug = '${PILOT_EVALUATION_SLUG}'
);

insert into public.sim_template_versions (template_id, version, content, change_notes, published_at)
select t.id, 1, '${json}'::jsonb,
  'wave1-rc1 ${DA01_CONTENT_VERSION} hash:${contentHash}',
  now()
from public.sim_templates t
where t.slug = '${PILOT_EVALUATION_SLUG}'
  and not exists (
    select 1 from public.sim_template_versions v
    where v.template_id = t.id
      and v.change_notes like '%hash:${contentHash}%'
  );

update public.sim_templates t
set current_version_id = v.id,
    status = 'published',
    title = '${MICRO_OPS_YIELD.title.replace(/'/g, "''")}',
    role_key = '${MICRO_OPS_YIELD.roleKey}',
    updated_at = now()
from public.sim_template_versions v
where t.slug = '${PILOT_EVALUATION_SLUG}'
  and v.template_id = t.id
  and v.change_notes like '%hash:${contentHash}%';

select t.id as template_id, t.slug, t.status, v.id as version_id, v.version, v.change_notes
from public.sim_templates t
join public.sim_template_versions v on v.id = t.current_version_id
where t.slug = '${PILOT_EVALUATION_SLUG}';
`;

const out = resolve(process.cwd(), "docs/wave1-da01-seed.sql");
writeFileSync(out, sql);
console.log(`Wrote ${out}`);
console.log(`DA-01 ${DA01_CONTENT_VERSION} hash:${contentHash}`);
