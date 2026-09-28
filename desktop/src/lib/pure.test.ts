import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  chatSenderName,
  formatChatTime,
  formatDiagnostics,
  invitationExpiryLabel,
  invitationUrgency,
  mergeChatMessagesView,
  nextCompletenessStep,
  profileCompleteness,
  provisionStepLabel,
  PROVISION_STEPS,
  syncPhaseLabel,
  syncSummary,
  versionGateMessage,
} from "./pure.js";
import type {
  ChatMessage,
  Diagnostics,
  PassportView,
  StakeholderView,
  SyncPhase,
  VersionGate,
} from "./tauri.js";

describe("syncPhaseLabel (DESK-09 wording)", () => {
  it("uses the exact required wording for every phase", () => {
    const expected: Record<SyncPhase, string> = {
      saved_local: "Saved on this device",
      syncing: "Syncing…",
      synced: "Saved remotely",
      sync_failed: "Sync failed",
      conflict: "Sync conflict — review",
    };
    for (const [phase, label] of Object.entries(expected)) {
      assert.equal(syncPhaseLabel(phase as SyncPhase), label);
    }
  });

  it("never says bare 'Saved' ambiguously", () => {
    const phases: SyncPhase[] = [
      "saved_local",
      "syncing",
      "synced",
      "sync_failed",
      "conflict",
    ];
    for (const p of phases) {
      const label = syncPhaseLabel(p);
      // "Saved" must always be qualified (on this device / remotely).
      assert.match(label, /Saved (on this device|remotely)|Syncing|Sync /);
    }
  });
});

describe("syncSummary", () => {
  it("counts unsynced files for saved_local", () => {
    assert.equal(
      syncSummary("saved_local", 3, null),
      "Saved on this device · 3 files not yet synced"
    );
    assert.equal(
      syncSummary("saved_local", 1, null),
      "Saved on this device · 1 file not yet synced"
    );
  });

  it("surfaces the failure reason for sync_failed", () => {
    assert.equal(
      syncSummary("sync_failed", 2, "network unreachable"),
      "Sync failed — network unreachable"
    );
  });

  it("is plain for synced/syncing", () => {
    assert.equal(syncSummary("synced", 0, null), "Saved remotely");
    assert.equal(syncSummary("syncing", 1, null), "Syncing…");
  });
});

describe("provision steps (DESK-06)", () => {
  it("covers every backend step id in order", () => {
    const ids = PROVISION_STEPS.map((s) => s.id);
    assert.deepEqual(ids, [
      "version",
      "preflight",
      "fetch",
      "runtime",
      "start",
      "materialize",
    ]);
    for (const s of PROVISION_STEPS) {
      assert.ok(s.label.length > 0, `empty label for ${s.id}`);
    }
  });

  it("labels unknown ids with the id itself", () => {
    assert.equal(provisionStepLabel("bogus" as never), "bogus");
  });
});

describe("versionGateMessage (DESK-19)", () => {
  it("blocks with explicit versions", () => {
    const msg = versionGateMessage({
      kind: "blocked",
      current: "0.1.0",
      minimum: "0.2.0",
      download_url: null,
    });
    assert.ok(msg?.includes("0.1.0"));
    assert.ok(msg?.includes("0.2.0"));
  });

  it("notes available updates without blocking", () => {
    const msg = versionGateMessage({
      kind: "current",
      update_available: true,
      latest: "0.3.0",
      download_url: null,
    });
    assert.ok(msg?.includes("0.3.0"));
    assert.ok(msg?.includes("never restarts"));
  });

  it("is silent when current and unknown", () => {
    const gates: VersionGate[] = [
      { kind: "current", update_available: false, latest: null, download_url: null },
      { kind: "unknown" },
    ];
    for (const g of gates) assert.equal(versionGateMessage(g), null);
  });
});

describe("formatDiagnostics (DESK-20)", () => {
  const d: Diagnostics = {
    app_version: "0.1.0",
    os: "linux",
    arch: "x64",
    platform_host: "fydell.example",
    session: {
      status: "active",
      has_platform_session: true,
      server_revision: 7,
      sync_phase: "saved_local",
      unsynced_files: 2,
    },
    file_count: 5,
    event_count: 11,
    recent_errors: [
      {
        ts: "2026-09-27T00:00:00Z",
        code: "platform_error",
        ref: "FYDELL-E1007",
        message: "boom",
      },
    ],
  };

  it("includes version, sync state, counts, and error refs", () => {
    const text = formatDiagnostics(d);
    assert.ok(text.includes("app_version: 0.1.0"));
    assert.ok(text.includes("sync_phase: saved_local"));
    assert.ok(text.includes("unsynced_files: 2"));
    assert.ok(text.includes("FYDELL-E1007"));
    assert.ok(text.includes("file_count: 5"));
  });

  it("states the no-code/no-token guarantee", () => {
    assert.ok(formatDiagnostics(d).includes("never include your code, tokens"));
  });

  it("handles an empty error ring", () => {
    const text = formatDiagnostics({ ...d, recent_errors: [] });
    assert.ok(text.includes("(none)"));
  });

  it("never leaks the session id or full URLs", () => {
    const text = formatDiagnostics(d);
    assert.ok(!text.includes("http"));
  });
});

describe("invitationExpiryLabel", () => {
  const NOW = new Date("2026-09-28T12:00:00Z").getTime();
  const at = (ms: number) => new Date(NOW + ms).toISOString();

  it("labels hours, days, and far dates factually", () => {
    assert.equal(invitationExpiryLabel(at(30 * 60_000), NOW), "Expires within the hour");
    assert.equal(invitationExpiryLabel(at(5 * 3_600_000), NOW), "Expires in 5 hours");
    assert.equal(invitationExpiryLabel(at(25 * 3_600_000), NOW), "Expires tomorrow");
    assert.equal(invitationExpiryLabel(at(3 * 86_400_000), NOW), "Expires in 3 days");
  });

  it("marks past and unparsable expiries as expired", () => {
    assert.equal(invitationExpiryLabel(at(-1000), NOW), "Expired");
    assert.equal(invitationExpiryLabel("not-a-date", NOW), "Expired");
  });

  it("never invents second-level precision", () => {
    const label = invitationExpiryLabel(at(90 * 60_000), NOW);
    assert.ok(!/\d\d:\d\d/.test(label));
  });
});

describe("invitationUrgency", () => {
  const NOW = new Date("2026-09-28T12:00:00Z").getTime();
  const at = (ms: number) => new Date(NOW + ms).toISOString();
  it("flags sub-48h expiries as soon", () => {
    assert.equal(invitationUrgency(at(47 * 3_600_000), NOW), "soon");
    assert.equal(invitationUrgency(at(49 * 3_600_000), NOW), "normal");
    assert.equal(invitationUrgency(at(-1000), NOW), "normal");
  });
});

describe("profileCompleteness", () => {
  const base: PassportView = {
    displayName: "Ada",
    headline: "Backend engineer",
    githubLogin: "ada",
    projects: [],
    capabilities: [],
    roleSuggestions: [],
  };

  it("is 0% for a null passport with identity as the first step", () => {
    const c = profileCompleteness(null);
    assert.equal(c.percent, 0);
    assert.equal(c.steps.filter((s) => s.done).length, 0);
    assert.equal(nextCompletenessStep(null)?.id, "identity");
  });

  it("counts projects, contributions, and capabilities", () => {
    const p: PassportView = {
      ...base,
      projects: [
        {
          repository: "ada/api",
          url: null,
          primaryLanguage: "Go",
          status: "complete",
          contributionStatement: "Built the retry queue.",
          evidenceCount: 4,
        },
      ],
      capabilities: ["Designs idempotent APIs"],
    };
    const c = profileCompleteness(p);
    assert.equal(c.percent, 100);
    assert.equal(nextCompletenessStep(p), null);
  });

  it("a project without a contribution note leaves that step open", () => {
    const p: PassportView = {
      ...base,
      projects: [
        {
          repository: "ada/api",
          url: null,
          primaryLanguage: "Go",
          status: "complete",
          contributionStatement: null,
          evidenceCount: 4,
        },
      ],
    };
    const c = profileCompleteness(p);
    assert.equal(c.percent, 50);
    assert.equal(nextCompletenessStep(p)?.id, "contribution");
  });

  it("never claims quality — only data presence", () => {
    const c = profileCompleteness(base);
    for (const s of c.steps) {
      assert.ok(!/score|rating|good|strong/i.test(s.label));
    }
  });
});

describe("mergeChatMessagesView", () => {
  const msg = (id: string, createdAt: string, sender = "candidate"): ChatMessage => ({
    id,
    thread: "team",
    sender,
    stakeholderId: sender === "candidate" ? null : "pm",
    body: `body ${id}`,
    createdAt,
  });

  it("dedups by id and keeps chronological order", () => {
    const prev = [msg("a", "2026-09-28T12:01:00Z")];
    const incoming = [
      msg("a", "2026-09-28T12:01:00Z"),
      msg("b", "2026-09-28T12:00:00Z"),
      msg("c", "2026-09-28T12:02:00Z"),
    ];
    const merged = mergeChatMessagesView(prev, incoming);
    assert.deepEqual(merged.map((m) => m.id), ["b", "a", "c"]);
  });

  it("never drops local-only messages during a refresh", () => {
    const prev = [msg("local-1", "2026-09-28T12:05:00Z")];
    const merged = mergeChatMessagesView(prev, []);
    assert.equal(merged.length, 1);
  });
});

describe("chatSenderName", () => {
  const stakeholders: StakeholderView[] = [
    { id: "pm", name: "Priya", role: "PM", simulated: true },
  ];
  const msg = (sender: string, stakeholderId: string | null): ChatMessage => ({
    id: "x",
    thread: "team",
    sender,
    stakeholderId,
    body: "hi",
    createdAt: "2026-09-28T12:00:00Z",
  });

  it("labels candidate messages as You and resolves stakeholder names", () => {
    assert.equal(chatSenderName(msg("candidate", null), stakeholders), "You");
    assert.equal(chatSenderName(msg("stakeholder", "pm"), stakeholders), "Priya");
    assert.equal(chatSenderName(msg("stakeholder", "unknown"), stakeholders), "Team");
  });
});

describe("formatChatTime", () => {
  it("returns empty for unparsable input, never throws", () => {
    assert.equal(formatChatTime("not-a-date"), "");
    assert.ok(formatChatTime("2026-09-28T12:00:00Z").length > 0);
  });
});
