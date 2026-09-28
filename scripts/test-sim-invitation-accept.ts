/**
 * API-level test for the invitation accept-by-id hardening (2026-09-27).
 *
 * The flaw: GET /api/sim/invitations/mine minted a fresh token per listed
 * invitation and overwrote token_hash, so merely opening the inbox
 * invalidated previously emailed invitation links. The fix: listing is
 * read-only and clients accept by invitation id via
 * POST /api/sim/invitations/accept.
 *
 * Drives the REAL route handlers in-process (mine GET, accept POST)
 * against the in-memory stubs of @/lib/simulations/db,
 * @/lib/simulations/auth, and @/lib/supabase/admin. No Supabase, no
 * network. Pure in-process tests.
 *
 * Proves:
 *  (a) invoking the mine GET handler does NOT change the invitation's
 *      token_hash: no token/tokenReissued fields in the response, and the
 *      emailed raw token still resolves via getInvitationByToken
 *  (b) POST /api/sim/invitations/accept rejects another user's
 *      invitation id (email ownership), unknown ids (404), missing auth
 *      (401), and malformed bodies (400)
 *  (c) double ID-accept returns the same session id (idempotent)
 *
 * Run with: npx tsx --conditions react-server scripts/test-sim-invitation-accept.ts
 */
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

let failures = 0;
const statuses: number[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

type G = typeof globalThis & {
  __SIM_TEST_USER__?: { id: string; email: string } | null;
};
const setUser = (u: { id: string; email: string } | null | undefined) =>
  ((globalThis as G).__SIM_TEST_USER__ = u);

async function main() {
  register(
    pathToFileURL(path.join(process.cwd(), "scripts", "stubs", "sim-test-hooks.mjs")).href,
    pathToFileURL(path.join(process.cwd(), "scripts", "test-sim-invitation-accept.ts")).href
  );

  const stub = await import("./stubs/sim-db-stub");
  const adminStub = await import("./stubs/sim-supabase-admin-stub");
  const { GET: mineGET } = await import("../src/app/api/sim/invitations/mine/route");
  const { POST: acceptPOST } = await import("../src/app/api/sim/invitations/accept/route");

  async function get() {
    const res = (await mineGET()) as Response;
    statuses.push(res.status);
    return { status: res.status, json: (await res.json()) as Record<string, unknown> };
  }

  async function postAccept(body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
    const res = (await acceptPOST(
      new Request("http://localhost/api/sim/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      })
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

  // ---- seed ---------------------------------------------------------------
  stub.__reset();
  adminStub.__resetAdminStore();
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  adminStub.__seedAdminTable("sim_invitations", [
    {
      id: "inv-a",
      candidate_email: "candidate@test.local",
      candidate_name: "Test Candidate",
      status: "sent",
      expires_at: future,
      created_at: new Date().toISOString(),
      organization_id: "org-1",
      template_version_id: "ver-1",
      token_hash: stub.hashToken("raw-token-a"),
    },
    {
      id: "inv-expired",
      candidate_email: "candidate@test.local",
      candidate_name: null,
      status: "sent",
      expires_at: past,
      created_at: new Date().toISOString(),
      organization_id: "org-1",
      template_version_id: "ver-1",
      token_hash: stub.hashToken("raw-token-expired"),
    },
    {
      id: "inv-other",
      candidate_email: "other@test.local",
      candidate_name: null,
      status: "sent",
      expires_at: future,
      created_at: new Date().toISOString(),
      organization_id: "org-1",
      template_version_id: "ver-1",
      token_hash: stub.hashToken("raw-token-o"),
    },
  ]);
  // db-stub invitation layer (used by the accept route's acceptInvitationById).
  stub.__seedInvitation({ id: "inv-a", rawToken: "raw-token-a" });
  stub.__seedInvitation({ id: "inv-b", rawToken: "raw-token-b" });
  stub.__seedInvitation({ id: "inv-other", candidateEmail: "other@test.local", rawToken: "raw-token-o" });

  setUser({ id: "cand-1", email: "candidate@test.local" });

  // ---- (a) mine GET is read-only --------------------------------------------
  console.log("mine GET (read-only listing)");
  const hashBefore = (
    stub.__store.invitations.get("inv-a") as Record<string, unknown>
  ).token_hash;
  {
    const r = await get("/api/sim/invitations/mine");
    check("mine 200 ok", r.status === 200 && r.json.ok === true, `status=${r.status}`);
    const invs = r.json.invitations as Array<Record<string, unknown>>;
    check("lists exactly the one valid pending invitation", invs.length === 1, `got ${invs.length}`);
    const item = invs[0];
    check("item exposes the invitation id", item.id === "inv-a", String(item.id));
    check("item has NO token field", !("token" in item), Object.keys(item).join(","));
    check("item has NO tokenReissued field", !("tokenReissued" in item), Object.keys(item).join(","));
  }
  {
    // The flaw: listing used to overwrite token_hash. Verify it did not.
    const hashAfter = (
      stub.__store.invitations.get("inv-a") as Record<string, unknown>
    ).token_hash;
    check("token_hash unchanged after listing", hashAfter === hashBefore);
    const inv = await stub.getInvitationByToken("raw-token-a");
    check(
      "emailed raw token still resolves via getInvitationByToken",
      inv !== null && (inv as Record<string, unknown>).id === "inv-a"
    );
  }

  // ---- (b) accept POST authorization ------------------------------------------
  console.log("\naccept POST authorization");
  setUser({ id: "cand-2", email: "other@test.local" });
  {
    const r = await postAccept({ invitationId: "inv-a" });
    check("another user's invitation id -> 400", r.status === 400, `status=${r.status}`);
    check(
      "rejection names the owning email",
      /candidate@test\.local/.test(String(r.json.error)),
      String(r.json.error)
    );
  }
  {
    const r = await postAccept({ invitationId: "inv-nonexistent" });
    check(
      "unknown invitation id -> 404",
      r.status === 404 && r.json.error === "Invitation not found",
      `status=${r.status} ${JSON.stringify(r.json)}`
    );
  }
  {
    const r = await postAccept({ invitationId: "" });
    check("empty invitationId -> 400", r.status === 400, `status=${r.status}`);
  }
  {
    const r = await postAccept({});
    check("missing invitationId -> 400", r.status === 400, `status=${r.status}`);
  }
  setUser(null);
  {
    const r = await postAccept({ invitationId: "inv-a" });
    check("signed-out -> 401", r.status === 401, `status=${r.status}`);
  }

  // ---- (c) accept idempotency ---------------------------------------------------
  console.log("\naccept POST idempotency");
  setUser({ id: "cand-1", email: "candidate@test.local" });
  let firstSessionId = "";
  {
    const r = await postAccept({ invitationId: "inv-b" });
    check("first accept 200 with sessionId", r.status === 200 && typeof r.json.sessionId === "string", `status=${r.status} ${JSON.stringify(r.json)}`);
    firstSessionId = String(r.json.sessionId);
  }
  {
    const sessionsBefore = stub.__store.sessions.size;
    const r = await postAccept({ invitationId: "inv-b" });
    check("second accept 200", r.status === 200, `status=${r.status}`);
    check("same session id returned", r.json.sessionId === firstSessionId, String(r.json.sessionId));
    check("no duplicate session created", stub.__store.sessions.size === sessionsBefore, `${sessionsBefore} -> ${stub.__store.sessions.size}`);
  }
  {
    // The invitation row now shows accepted and token-based accept of the
    // same invitation returns the same session (shared logic).
    const r = await postAccept({ invitationId: "inv-b" });
    check("third accept still the same session", r.json.sessionId === firstSessionId);
    const viaToken = await stub.acceptInvitation("raw-token-b", "cand-1", "candidate@test.local");
    check(
      "token-based accept shares the idempotent session",
      (viaToken.session as Record<string, unknown>).id === firstSessionId
    );
  }

  // ---- no 500s ---------------------------------------------------------------------
  console.log("\nstatus sweep");
  const bad = statuses.filter((s) => s >= 500);
  check(`no 500 responses across ${statuses.length} API calls`, bad.length === 0, bad.join(","));

  console.log(failures === 0 ? "\nAll invitation-accept tests passed." : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
