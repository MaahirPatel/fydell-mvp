/**
 * Model outage, against the DEVELOPMENT database: with the model provider
 * disabled, the real assistant and teammate code paths must show an unavailable
 * state that does not count against the candidate. Runs on the newest
 * in-progress employer preview attempt (previews are never part of hiring).
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/accept-model-outage.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Admin } from "../src/lib/eng/context";
import type { AttemptRow } from "../src/lib/eng/types";

const DEV_REF = "btbmvrvynnrhapjdkunz";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.includes(DEV_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENAI_API_KEY;
  process.env.MODEL_PROVIDER = "groq";
  const { askAssistant, buildCollaborationView, sendTeamMessage } = await import("../src/lib/eng/authored/collaboration");
  const { loadAuthored } = await import("../src/lib/eng/authored/runtime");
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } }) as unknown as Admin;

  const { data } = await db.from("eng_attempts").select("*").eq("is_preview", true).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).single();
  const attempt = data as AttemptRow;
  assert.ok(attempt, "an in-progress preview attempt exists");
  const authored = await loadAuthored(db, attempt);
  const userId = attempt.candidate_user_id ?? "";
  const before = await buildCollaborationView(db, authored, { release: false });

  const asked = await askAssistant(db, authored, userId, { prompt: "What does the receiver do with a duplicate?", clientMsgId: randomUUID().replace(/-/g, "").slice(0, 24), contextPaths: [], files: [] });
  assert.equal(asked.interaction.status, "provider_unavailable", "an outage is shown as unavailable");
  assert.equal(asked.used, before.assistant.used, "an unavailable answer does not use the candidate's allowance");
  console.log(`  ok   assistant outage: status provider_unavailable, used stays ${asked.used} of ${asked.limit}`);

  const lead = authored.pkg.coworkers[0];
  const clientMsgId = randomUUID().replace(/-/g, "").slice(0, 24);
  await sendTeamMessage(db, authored, userId, { teammateId: lead.id, body: "Do duplicates get a 2xx response?", clientMsgId });
  const { data: reply } = await db.from("eng_messages").select("rule_id, body").eq("attempt_id", attempt.id).eq("client_msg_id", `reply_${clientMsgId}`).single();
  const rule = String((reply as { rule_id: string }).rule_id);
  assert.ok(rule.startsWith("notes:"), `teammate outage falls back to the scenario notes (${rule})`);
  console.log(`  ok   teammate outage: reply answered from the scenario notes (${rule}), labelled as such to the employer`);
  console.log(`\nmodel outage checks passed on preview attempt ${attempt.id}`);
}

main().catch((error: unknown) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
