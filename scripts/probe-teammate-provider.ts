/**
 * Sends a few candidate questions through the configured model provider and
 * prints each teammate reply, whether it was generated or authored, and why.
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/probe-teammate-provider.ts
 */
import { describeProvider } from "@/lib/ai/provider";
import { composeTeammateReply } from "@/lib/eng/teammate-chat";
import { CURRENT_SCENARIO } from "@/lib/eng/scenarios";

const QUESTIONS = [
  "Hey Alex, should we honor Retry-After when a partner sends it?",
  "How many retry attempts total before we give up?",
  "Thanks, I've got the backoff working and tests passing locally.",
];

async function main() {
  console.log(`provider: ${describeProvider()}\n`);
  for (const q of QUESTIONS) {
    const started = Date.now();
    const r = await composeTeammateReply(CURRENT_SCENARIO, q, [], false);
    const who = CURRENT_SCENARIO.teammates.find((t) => t.id === r.teammateId)?.name ?? r.teammateId;
    console.log(`Q: ${q}`);
    console.log(`${who} [${r.mode}${r.fallbackReason ? `: ${r.fallbackReason}` : ""}, ${Date.now() - started} ms]: ${r.body}\n`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
