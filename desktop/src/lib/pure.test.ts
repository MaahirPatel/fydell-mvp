import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDiagnostics,
  provisionStepLabel,
  PROVISION_STEPS,
  syncPhaseLabel,
  syncSummary,
  versionGateMessage,
} from "./pure.js";
import type { Diagnostics, SyncPhase, VersionGate } from "./tauri.js";

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
