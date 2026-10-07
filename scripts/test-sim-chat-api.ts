/**
 * API-level lifecycle test for the web simulation workflow + AI coworker chat.
 *
 * Drives the REAL route handlers in-process (session GET, start, state,
 * events, messages, curveball, submit) against an in-memory stub of
 * @/lib/simulations/db + @/lib/simulations/auth + @/lib/supabase/admin.
 * No Supabase, no network. Pure in-process tests.
 *
 * Proves:
 *  - candidate messages persist; coworker replies persist and reference real
 *    session context (context-gated rule + token interpolation)
 *  - proactive teammate messages arrive on triggers (welcome, elapsed nudge,
 *    answer reaction, curveball follow-up) and respect unless-blocks
 *  - curveball announcements persist as stakeholder chat messages
 *  - duplicate sends are idempotent and return the existing reply
 *  - the full candidate lifecycle traverses with no 500 responses
 *
 * Run with: npx tsx --conditions react-server scripts/test-sim-chat-api.ts
 */
import { installSimStubs } from "./stubs/install-sim-stubs";

let failures = 0;
const statuses: number[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

type Handler = (req: unknown, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

async function main() {
  installSimStubs();

  const stub = await import("./stubs/sim-db-stub");
  const { GET: sessionGET } = await import("../src/app/api/sim/sessions/[id]/route");
  const { POST: startPOST } = await import("../src/app/api/sim/sessions/[id]/start/route");
  const { PATCH: statePATCH } = await import("../src/app/api/sim/sessions/[id]/state/route");
  const { POST: eventsPOST } = await import("../src/app/api/sim/sessions/[id]/events/route");
  const { POST: messagesPOST, GET: messagesGET } = await import(
    "../src/app/api/sim/sessions/[id]/messages/route"
  );
  const { POST: curveballPOST } = await import("../src/app/api/sim/sessions/[id]/curveball/route");
  const { POST: submitPOST } = await import("../src/app/api/sim/sessions/[id]/submit/route");

  async function call(
    handler: Handler,
    sessionId: string,
    method: string,
    body?: unknown
  ): Promise<{ status: number; json: Record<string, unknown> }> {
    const res = (await handler(
      new Request(`http://localhost/api/sim/sessions/${sessionId}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: sessionId }) }
    )) as Response;
    statuses.push(res.status);
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) as Record<string, unknown>;
    } catch {
      json = { _unparseable: true };
    }
    return { status: res.status, json };
  }

  const stakeholderBodies = (msgs: unknown[]): string[] =>
    (msgs as Array<{ sender: string; body: string }>)
      .filter((m) => m.sender === "stakeholder")
      .map((m) => m.body);

  // ---- seed ---------------------------------------------------------------
  stub.__reset();
  stub.__seedSession({ id: "A" }); // accepted, consent+preflight ok
  stub.__seedSession({ id: "B", consent: false }); // no consent
  stub.__seedSession({
    id: "C",
    status: "active",
    startedAt: new Date(Date.now() - 60000).toISOString(),
  });
  stub.__seedSession({
    id: "D",
    status: "active",
    startedAt: new Date(Date.now() - 10 * 60000).toISOString(),
  });

  // ---- start ---------------------------------------------------------------
  console.log("start");
  {
    const r = await call(startPOST as Handler, "A", "POST", {});
    check("start ok", r.status === 200 && r.json.ok === true, `status=${r.status} ${JSON.stringify(r.json)}`);
  }
  {
    const r = await call(startPOST as Handler, "B", "POST", {});
    check(
      "start without consent -> 400 consent error",
      r.status === 400 && /consent/i.test(String(r.json.error)),
      `status=${r.status} ${JSON.stringify(r.json)}`
    );
  }
  // Simulate 10 minutes of work so elapsed-time triggers are exercisable.
  (stub.__store.sessions.get("A") as Record<string, unknown>).started_at = new Date(
    Date.now() - 10 * 60000
  ).toISOString();

  // ---- session GET: welcome + elapsed nudge ---------------------------------
  console.log("\nsession GET (proactive welcome)");
  let msgCountAfterFirstGet = 0;
  {
    const r = await call(sessionGET as Handler, "A", "GET");
    check("session GET 200", r.status === 200, `status=${r.status}`);
    const session = r.json.session as Record<string, unknown>;
    check("session is active", session.status === "active");
    const bodies = stakeholderBodies(r.json.messages as unknown[]);
    check("welcome proactive delivered", bodies.some((b) => b.startsWith("Jordan here")), bodies.join(" | ").slice(0, 120));
    check(
      "elapsed nudge delivered (7 min trigger)",
      bodies.some((b) => b.includes("metric reporting note")),
      bodies.join(" | ").slice(0, 120)
    );
    msgCountAfterFirstGet = (r.json.messages as unknown[]).length;
  }
  {
    const r = await call(sessionGET as Handler, "A", "GET");
    check(
      "second GET does not duplicate proactive messages",
      (r.json.messages as unknown[]).length === msgCountAfterFirstGet,
      `got ${(r.json.messages as unknown[]).length}, want ${msgCountAfterFirstGet}`
    );
  }

  // ---- events ---------------------------------------------------------------
  console.log("\nevents");
  {
    const r = await call(eventsPOST as Handler, "A", "POST", {
      eventType: "resource_opened",
      resourceId: "production_runs",
      clientEventId: "ev1",
    });
    check("resource_opened recorded", r.status === 200 && r.json.ok === true, `status=${r.status}`);
  }
  {
    const r = await call(eventsPOST as Handler, "A", "POST", {
      eventType: "deliverable_field_edited",
      payload: { field: "primary_driver" },
      clientEventId: "ev2",
    });
    check("deliverable_field_edited recorded", r.status === 200 && r.json.ok === true);
    const m = await call(messagesGET as Handler, "A", "GET");
    const bodies = stakeholderBodies(m.json.messages as unknown[]);
    check(
      "answering primary_driver triggers Jordan's reaction",
      bodies.some((b) => b.includes("harder half")),
      bodies.join(" | ").slice(0, 200)
    );
  }
  {
    const r = await call(eventsPOST as Handler, "A", "POST", { eventType: "nope" });
    check("unknown event type rejected", r.status === 400, `status=${r.status}`);
  }

  // ---- state sync ------------------------------------------------------------
  console.log("\nstate sync");
  {
    const r = await call(statePATCH as Handler, "A", "PATCH", {
      baseRevision: 0,
      deliverable: { primary_driver: "reporting artifact" },
      workspace: { openedResources: ["production_runs"] },
    });
    check("state PATCH ok, revision 1", r.status === 200 && (r.json as { revision?: number }).revision === 1, `status=${r.status} ${JSON.stringify(r.json)}`);
  }
  {
    const r = await call(statePATCH as Handler, "A", "PATCH", {
      baseRevision: 0,
      notes: "stale write",
    });
    check("stale baseRevision -> 409 conflict", r.status === 409, `status=${r.status}`);
  }

  // ---- chat -------------------------------------------------------------------
  console.log("\nchat");
  {
    const r = await call(messagesPOST as Handler, "A", "POST", {
      stakeholderId: "jordan",
      text: "give me context on the yield drop",
      clientMsgId: "m1",
    });
    check("message POST 200", r.status === 200 && r.json.ok === true, `status=${r.status} ${JSON.stringify(r.json)}`);
    const cand = r.json.candidateMessage as Record<string, unknown>;
    check("candidate message persisted", cand.body === "give me context on the yield drop");
    const reply = (r.json.reply ?? {}) as Record<string, unknown>;
    check(
      "coworker reply persisted",
      typeof reply.body === "string" && (reply.body as string).length > 10,
      JSON.stringify({ noReplyReason: r.json.noReplyReason, teammateUnavailable: r.json.teammateUnavailable })
    );
    // The rule id is recorded on the message_received event.
    const recv = stub.__store.events.find(
      (e) => e.event_type === "message_received" && (e.payload as Record<string, unknown>).ruleId === "test_ctx_rule"
    );
    check("context-gated rule fired (real session state)", Boolean(recv));
    check(
      "reply references real session context (interpolated 1 question)",
      typeof reply.body === "string" && (reply.body as string).includes("1 question(s)"),
      String(reply.body).slice(0, 160)
    );
  }
  {
    const before = stub.__store.messages.length;
    const r = await call(messagesPOST as Handler, "A", "POST", {
      stakeholderId: "jordan",
      text: "give me context on the yield drop",
      clientMsgId: "m1",
    });
    check("duplicate send -> 200 duplicate", r.status === 200 && r.json.duplicate === true, `status=${r.status}`);
    check("no duplicate message persisted", stub.__store.messages.length === before, `${before} -> ${stub.__store.messages.length}`);
    check(
      "duplicate returns the existing reply",
      Boolean(r.json.reply) && typeof (r.json.reply as Record<string, unknown>).body === "string",
      JSON.stringify(r.json.reply).slice(0, 80)
    );
  }
  {
    // Session C never answered primary_driver: the gated rule must not fire.
    const r = await call(messagesPOST as Handler, "C", "POST", {
      stakeholderId: "jordan",
      text: "give me context please",
      clientMsgId: "m2",
    });
    check("ungated session message 200", r.status === 200, `status=${r.status}`);
    const recv = stub.__store.events.find(
      (e) =>
        e.event_type === "message_received" &&
        (e.payload as Record<string, unknown>).ruleId === "test_ctx_rule" &&
        e.session_id === "C"
    );
    check("gated rule does NOT fire without real session context", !recv);
  }
  {
    const r = await call(messagesGET as Handler, "A", "GET");
    check("messages GET 200", r.status === 200, `status=${r.status}`);
    const bodies = stakeholderBodies(r.json.messages as unknown[]);
    check("poll sees welcome + nudge + reaction + reply", bodies.length >= 4, `got ${bodies.length}`);
  }

  // ---- unless-block ------------------------------------------------------------
  console.log("\nproactive unless-block");
  {
    // Session D: candidate opens the reporting note first.
    await call(eventsPOST as Handler, "D", "POST", {
      eventType: "resource_opened",
      resourceId: "metric_reporting",
      clientEventId: "evd1",
    });
    const r = await call(sessionGET as Handler, "D", "GET");
    const bodies = stakeholderBodies(r.json.messages as unknown[]);
    check("welcome still delivered", bodies.some((b) => b.startsWith("Jordan here")));
    check(
      "nudge suppressed after opening the reporting note",
      !bodies.some((b) => b.includes("metric reporting note")),
      bodies.join(" | ").slice(0, 200)
    );
  }

  // ---- curveball ----------------------------------------------------------------
  console.log("\ncurveball");
  {
    const r = await call(curveballPOST as Handler, "A", "POST", {
      action: "present",
      checkpointSaved: true,
    });
    check("curveball presented", r.status === 200 && r.json.presented === true, `status=${r.status} ${JSON.stringify(r.json)}`);
  }
  {
    const m = await call(messagesGET as Handler, "A", "GET");
    const bodies = stakeholderBodies(m.json.messages as unknown[]);
    check(
      "curveball announcement persisted as Jordan chat message",
      bodies.some((b) => b.includes("Operations confirms")),
      bodies.join(" | ").slice(0, 200)
    );
  }
  {
    // presentCurveball backdates 3 min -> the curveball follow-up (2 min) is due.
    const r = await call(sessionGET as Handler, "A", "GET");
    const bodies = stakeholderBodies(r.json.messages as unknown[]);
    check(
      "curveball follow-up proactive delivered",
      bodies.some((b) => b.includes("huddle got moved up")),
      bodies.join(" | ").slice(0, 200)
    );
  }
  {
    const r = await call(curveballPOST as Handler, "A", "POST", { action: "present" });
    check("re-present is idempotent", r.status === 200 && (r.json as { already?: boolean }).already === true);
  }

  // ---- submit --------------------------------------------------------------------
  console.log("\nsubmit");
  {
    const r = await call(submitPOST as Handler, "A", "POST", {
      answers: { recommendation: "hold L2 day shift" },
    });
    check(
      "submit ok",
      r.status === 200 && r.json.ok === true && typeof r.json.submissionId === "string",
      `status=${r.status} ${JSON.stringify(r.json)}`
    );
  }
  {
    const r = await call(submitPOST as Handler, "A", "POST", {});
    check("resubmit idempotent", r.status === 200 && r.json.alreadySubmitted === true, JSON.stringify(r.json));
  }
  {
    const r = await call(sessionGET as Handler, "A", "GET");
    check("session shows submitted", (r.json.session as Record<string, unknown>).status === "submitted");
  }

  // ---- auth -----------------------------------------------------------------------
  console.log("\nauth");
  {
    (globalThis as Record<string, unknown>).__SIM_TEST_USER__ = null;
    const r = await call(sessionGET as Handler, "A", "GET");
    check("signed-out -> 401", r.status === 401, `status=${r.status}`);
    (globalThis as Record<string, unknown>).__SIM_TEST_USER__ = undefined;
  }

  // ---- no 500s ---------------------------------------------------------------------
  console.log("\nstatus sweep");
  const bad = statuses.filter((s) => s >= 500);
  check(`no 500 responses across ${statuses.length} API calls`, bad.length === 0, bad.join(","));

  console.log(failures === 0 ? "\nAll sim-chat API tests passed." : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
