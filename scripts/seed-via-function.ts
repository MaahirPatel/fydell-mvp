/**
 * Seeds the 30 simulations through the temporary `seed-sims` edge function.
 * Used when the service role key is not available locally: the function runs
 * with service-role access server-side; this script only needs the anon key.
 *
 * Usage: npx tsx --conditions react-server scripts/seed-via-function.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { ALL_SIMULATIONS } from "../src/lib/simulations/content/index";
import { validateMicroSim } from "../src/lib/simulations/micro-types";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
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
      /* file absent */
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  let invalid = 0;
  for (const sim of ALL_SIMULATIONS) {
    const errors = validateMicroSim(sim);
    if (errors.length) {
      console.error(`INVALID ${sim.slug}: ${errors.join("; ")}`);
      invalid++;
    }
  }
  if (invalid) process.exit(1);

  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/seed-sims`;
  const batchSize = 6;
  let failures = 0;
  for (let i = 0; i < ALL_SIMULATIONS.length; i += batchSize) {
    const batch = ALL_SIMULATIONS.slice(i, i + batchSize).map((sim) => ({
      slug: sim.slug,
      roleKey: sim.roleKey,
      title: sim.title,
      content: sim,
    }));
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
        "x-seed-token": "fydell-seed-3f8a1c9d24b7e6a0",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error(`Batch ${i / batchSize + 1} failed: HTTP ${res.status} ${await res.text()}`);
      failures++;
      continue;
    }
    const data = (await res.json()) as {
      results: { slug: string; status: string; error?: string }[];
    };
    for (const r of data.results) {
      const line = `${r.status === "error" ? "FAIL" : "ok"}  ${r.slug}: ${r.status}${r.error ? ` (${r.error})` : ""}`;
      if (r.status === "error") {
        console.error(line);
        failures++;
      } else console.log(line);
    }
  }

  console.log(failures ? `\n${failures} failure(s)` : `\nSeeded ${ALL_SIMULATIONS.length} simulations.`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
