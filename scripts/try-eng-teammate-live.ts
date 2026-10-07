/**
 * Manual check of generated teammate replies against the configured model.
 * Run: MODEL_PROVIDER=ollama tsx --conditions react-server scripts/try-eng-teammate-live.ts
 * Prints each reply with how it was produced. Writes nothing.
 */
import { CURRENT_SCENARIO } from "../src/lib/eng/scenarios";
import { composeTeammateReply } from "../src/lib/eng/teammate-chat";
import type { ThreadTurn } from "../src/lib/eng/teammate";

const s = CURRENT_SCENARIO;
const name = (id: string | null) => s.teammates.find((t) => t.id === id)?.name ?? "?";

async function conversation(label: string, questions: string[], updateReleased: boolean) {
  console.log(`\n== ${label} (update ${updateReleased ? "released" : "not released"})`);
  const thread: ThreadTurn[] = [{ sender: "teammate", teammateId: s.kickoff.teammateId, body: s.kickoff.body }];
  for (const q of questions) {
    const started = Date.now();
    const r = await composeTeammateReply(s, q, thread, updateReleased);
    console.log(`\nYou: ${q}`);
    console.log(`${name(r.teammateId)} [${r.mode}${r.fallbackReason ? `: ${r.fallbackReason}` : ""}; facts ${r.factIds.join(",") || "none"}; ${Date.now() - started}ms]: ${r.body}`);
    thread.push({ sender: "candidate", teammateId: null, body: q }, { sender: "teammate", teammateId: r.teammateId, body: r.body });
  }
}

async function main() {
  await conversation("Early questions", [
    "Hey Alex, quick one before I start: should a 404 be retried?",
    "Got it. And what about timeouts where we never get a response?",
    "Should a 404 be retried?",
    "So connection timeouts are permanent failures, right?",
    "I've got backoff working and the 4xx handling done. Moving on to dead-lettering now.",
    "Do we know anything about Retry-After headers?",
    "My plan: add jitter to the backoff so merchants don't get synchronized retries. OK?",
    "What's your favourite colour?",
    "Thanks, that's really helpful!",
  ], false);
  await conversation("After the partner request", [
    "Jordan, for the Retry-After thing, what if the partner sends an HTTP date?",
    "Does a Retry-After of 7200 mean we wait two hours?",
    "Are you a real person?",
  ], true);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "failed");
  process.exit(1);
});
