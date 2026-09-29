/**
 * Candidate event replay by server cursor.
 *
 * Proves: a reconnecting client resumes exactly after its cursor, pages are
 * exact, hidden events advance the cursor without being shown, payloads are
 * projected (no authored rule ids or outage counters), and bad cursors are
 * refused.
 *
 * Run: npx tsx scripts/test-event-replay.ts
 */
import { buildReplayPage, MAX_REPLAY_PAGE, parseCursor, parseLimit, type StoredEvent } from "../src/lib/simulations/event-replay";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

const at = (n: number) => new Date(Date.UTC(2026, 8, 29, 12, 0, n)).toISOString();
const rows: StoredEvent[] = [
  { seq: 1, event_type: "session_started", actor: "system", payload: {}, created_at: at(1) },
  { seq: 2, event_type: "resource_opened", actor: "candidate", payload: { resourceId: "incident" }, created_at: at(2) },
  { seq: 3, event_type: "message_sent", actor: "candidate", payload: { stakeholderId: "maya", length: 42 }, created_at: at(3) },
  { seq: 4, event_type: "message_received", actor: "stakeholder", payload: { stakeholderId: "maya", ruleId: "rel_404", source: "authored" }, created_at: at(4) },
  { seq: 5, event_type: "teammate_service_degraded", actor: "system", payload: { stakeholderId: "maya" }, created_at: at(5) },
  { seq: 6, event_type: "curveball_presented", actor: "system", payload: { trigger: "elapsed", curveballId: "retry_after_rollout" }, created_at: at(6) },
  { seq: 7, event_type: "deadline_extended", actor: "system", payload: { extraMs: 300000, reason: "fair_response_window", newEndsAt: at(60), extensionKey: "x" }, created_at: at(7) },
];

{
  const page = buildReplayPage(rows, 0, 200);
  ok("returns candidate-visible events in seq order", page.events.map((e) => e.seq).join() === "1,3,4,6,7");
  ok("cursor is the last seq read, including hidden ones", page.cursor === 7);
  ok("no more after the last page", page.hasMore === false);
  const received = page.events.find((e) => e.type === "message_received")!;
  ok("authored rule id is not exposed", !("ruleId" in received.data) && !("source" in received.data));
  const sent = page.events.find((e) => e.type === "message_sent")!;
  ok("message length metric is not exposed", !("length" in sent.data));
  const update = page.events.find((e) => e.type === "curveball_presented")!;
  ok("requirement update exposes its id only", JSON.stringify(update.data) === JSON.stringify({ curveballId: "retry_after_rollout" }));
  const ext = page.events.find((e) => e.type === "deadline_extended")!;
  ok("extension shows reason and new deadline, not internal key", ext.data.reason === "fair_response_window" && !("extensionKey" in ext.data));
  ok("degradation bookkeeping is hidden", !page.events.some((e) => e.type === "teammate_service_degraded"));
}

{
  const first = buildReplayPage(rows.slice(0, 3), 0, 2);
  ok("limit+1 rows gives hasMore", first.hasMore === true && first.cursor === 2);
  const resumed = buildReplayPage(rows.filter((r) => r.seq > first.cursor), first.cursor, 200);
  const all = [...first.events, ...resumed.events].map((e) => e.seq);
  ok("resuming from the cursor loses and repeats nothing", all.join() === "1,3,4,6,7");
  const again = buildReplayPage(rows, 7, 200);
  ok("nothing new keeps the cursor", again.events.length === 0 && again.cursor === 7 && !again.hasMore);
  const overlap = buildReplayPage(rows, 4, 200);
  ok("rows at or before the cursor are ignored even if returned", overlap.events[0]?.seq === 6);
}

{
  ok("missing cursor starts at 0", parseCursor(null) === 0 && parseCursor("") === 0);
  ok("numeric cursor parsed", parseCursor("42") === 42);
  ok("negative cursor refused", parseCursor("-1") === null);
  ok("non-numeric cursor refused", parseCursor("1 or 1=1") === null);
  ok("limit capped", parseLimit("5000") === MAX_REPLAY_PAGE && parseLimit("10") === 10 && parseLimit("abc") === MAX_REPLAY_PAGE);
}

console.log(failures === 0 ? "\nAll event replay checks passed." : `\n${failures} check(s) failed.`);
if (failures > 0) process.exit(1);
