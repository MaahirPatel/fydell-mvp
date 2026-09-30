import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { listen } from "@tauri-apps/api/event";
import {
  api,
  FileContent,
  FileEntry,
  Receipt,
  SessionInfo,
  SyncView,
  TestRunResult,
} from "../lib/tauri";
import { syncPhaseLabel, syncSummary } from "../lib/pure";
import { messageOf } from "../App";
import { BriefPanel, TestsPanel, TeamPanel, SubmitPanel, TimelinePanel, Milestone } from "./Panels";
import AnalysisPanel, { runAnalysis } from "./AnalysisPanel";
import CommandPalette, { PaletteAction, fileIcon } from "./CommandPalette";
import { Dialog, EmptyState, ProvenanceTag } from "./ui";
import { BrandLockup } from "./Brand";

interface Tab {
  path: string;
  content: string;
  rev: number;
  dirty: boolean;
  saving: boolean;
  saveError: string | null;
}

type SaveState = "synced" | "dirty" | "saving" | "error";

export default function Workspace({
  session,
  onSubmitted,
}: {
  session: SessionInfo;
  onSubmitted: (r: Receipt) => void;
}) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [panel, setPanel] = useState<"brief" | "tests" | "team" | "analysis" | "submit" | "timeline">("brief");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "running" | "passed" | "failed">("idle");
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number } | null>(null);
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [conflict, setConflict] = useState<{ path: string; server: FileContent } | null>(null);
  const [syncView, setSyncView] = useState<SyncView | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);
  const [exitWarning, setExitWarning] = useState<{
    dirtyTabs: boolean;
    unsynced: number;
    conflict: boolean;
  } | null>(null);
  const [quitting, setQuitting] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // Refs so the close-requested handler always sees the latest state.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const refreshFiles = useCallback(() => {
    api.listFiles().then(setFiles).catch(() => {});
  }, []);

  useEffect(() => {
    refreshFiles();
    // Load milestones definition if the scenario ships one.
    api
      .readFile(".fydell/milestones.json")
      .then((f) => {
        try {
          const def = JSON.parse(f.content) as { milestones: Milestone[] };
          if (def.milestones?.length) setMilestone({ ...def.milestones[0], _acked: false });
        } catch {}
      })
      .catch(() => {});
    // DESK-09: current sync state on mount.
    api.syncStatus().then(setSyncView).catch(() => {});
    // DESK-10: surface recovered-but-unsynced work from a previous run.
    api
      .recoveryStatus()
      .then((r) => {
        if (r.kind === "resume_active" && r.unsynced_paths.length > 0) {
          setRecoveryNote(
            `Recovered ${r.unsynced_paths.length} unsynced file${r.unsynced_paths.length === 1 ? "" : "s"} ` +
              `from before the restart — saved on this device, not yet acknowledged by the server.`
          );
        }
      })
      .catch(() => {});
  }, [refreshFiles]);

  // DESK-09: live sync-state updates from the backend.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<SyncView>("sync-changed", (e) => setSyncView(e.payload)).then(
      (u) => (unlisten = u)
    );
    return () => unlisten?.();
  }, []);

  const openFile = useCallback(
    async (path: string) => {
      if (tabs.some((t) => t.path === path)) {
        setActive(path);
        return;
      }
      try {
        const f = await api.readFile(path);
        setTabs((ts) => [...ts, { path, content: f.content, rev: f.rev, dirty: false, saving: false, saveError: null }]);
        setActive(path);
      } catch (e) {
        console.error(messageOf(e));
      }
    },
    [tabs]
  );

  const saveTab = useCallback(
    async (path: string) => {
      const tab = tabs.find((t) => t.path === path);
      if (!tab || !tab.dirty || tab.saving) return;
      setTabs((ts) => ts.map((t) => (t.path === path ? { ...t, saving: true, saveError: null } : t)));
      try {
        const saved = await api.writeFile(path, tab.content, tab.rev);
        setTabs((ts) =>
          ts.map((t) =>
            t.path === path ? { ...t, rev: saved.rev, dirty: false, saving: false } : t
          )
        );
        refreshFiles();
        // DESK-09: the file is now "saved on this device". Queue a remote
        // sync shortly after — the sync state machine reports the rest.
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          void manualSyncRef.current();
        }, 2500);
      } catch (e: unknown) {
        if (
          typeof e === "object" &&
          e !== null &&
          (e as { code?: string }).code === "revision_conflict"
        ) {
          // Fetch the server version so the candidate can choose.
          try {
            const server = await api.readFile(path);
            setConflict({ path, server });
          } catch {}
          setTabs((ts) =>
            ts.map((t) => (t.path === path ? { ...t, saving: false } : t))
          );
        } else {
          setTabs((ts) =>
            ts.map((t) =>
              t.path === path ? { ...t, saving: false, saveError: messageOf(e) } : t
            )
          );
        }
      }
    },
    [tabs, refreshFiles]
  );

  const editTab = useCallback(
    (path: string, content: string) => {
      setTabs((ts) => ts.map((t) => (t.path === path ? { ...t, content, dirty: true } : t)));
      if (timers.current[path]) clearTimeout(timers.current[path]);
      timers.current[path] = setTimeout(() => saveTab(path), 1200);
    },
    [saveTab]
  );

  const closeTab = useCallback(
    (path: string) => {
      if (timers.current[path]) {
        clearTimeout(timers.current[path]);
        delete timers.current[path];
      }
      const remove = () => {
        setTabs((ts) => {
          const next = ts.filter((t) => t.path !== path);
          if (active === path)
            setActive(next.length ? next[next.length - 1].path : null);
          return next;
        });
      };
      const tab = tabsRef.current.find((t) => t.path === path);
      if (tab && tab.dirty && !tab.saving) {
        // Flush unsaved edits before closing — candidate work is never
        // silently discarded. A failed save keeps the tab open with the
        // error visible in the topbar save state.
        void saveTab(path).then(() => {
          const current = tabsRef.current.find((t) => t.path === path);
          if (current && !current.dirty) remove();
        });
        return;
      }
      remove();
    },
    [active, saveTab]
  );

  const resolveConflict = useCallback(
    async (keepMine: boolean) => {
      if (!conflict) return;
      const { path, server } = conflict;
      setConflict(null);
      if (keepMine) {
        // Overwrite with my content at the server's rev.
        setTabs((ts) => ts.map((t) => (t.path === path ? { ...t, rev: server.rev } : t)));
        setTimeout(() => saveTab(path), 0);
      } else {
        setTabs((ts) =>
          ts.map((t) =>
            t.path === path
              ? { ...t, content: server.content, rev: server.rev, dirty: false }
              : t
          )
        );
      }
    },
    [conflict, saveTab]
  );

  /* ---------------- DESK-09 / DESK-11: remote sync ---------------- */

  const [resolveError, setResolveError] = useState<string | null>(null);

  const manualSync = useCallback(async () => {
    if (syncBusy) return;
    setSyncBusy(true);
    try {
      const v = await api.syncNow();
      setSyncView(v);
    } catch {
      // syncNow reports failures via the SyncView phase; a throw means the
      // command itself failed — refresh the view so the UI stays truthful.
      try {
        setSyncView(await api.syncStatus());
      } catch {}
    } finally {
      setSyncBusy(false);
    }
  }, [syncBusy]);
  const manualSyncRef = useRef(manualSync);
  manualSyncRef.current = manualSync;

  const resolveSyncConflict = useCallback(
    async (strategy: "keep_local" | "take_remote") => {
      setResolveError(null);
      try {
        const v = await api.resolveSyncConflict(strategy);
        setSyncView(v);
        refreshFiles();
      } catch (e) {
        setResolveError(messageOf(e));
        try {
          setSyncView(await api.syncStatus());
        } catch {}
      }
    },
    [refreshFiles]
  );

  /* ---------------- DESK-10: warn before exit with unpersisted work ---------------- */

  const saveTabRef = useRef(saveTab);
  saveTabRef.current = saveTab;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        if (cancelled) return;
        getCurrentWindow()
          .onCloseRequested(async (event) => {
            // Flush pending debounced autosaves first.
            for (const p of Object.keys(timers.current)) {
              clearTimeout(timers.current[p]);
            }
            for (const t of tabsRef.current.filter((t) => t.dirty)) {
              try {
                await saveTabRef.current(t.path);
              } catch {}
            }
            const stillDirty = tabsRef.current.some((t) => t.dirty);
            let sv: SyncView | null = null;
            try {
              sv = await api.syncStatus();
              setSyncView(sv);
            } catch {}
            const unsynced = sv?.dirty_paths.length ?? 0;
            const conflicted = sv?.phase === "conflict";
            const failed = sv?.phase === "sync_failed";
            if (stillDirty || unsynced > 0 || conflicted || failed) {
              event.preventDefault();
              setExitWarning({ dirtyTabs: stillDirty, unsynced, conflict: conflicted });
            }
            // Otherwise the close proceeds.
          })
          .then((u) => {
            unlisten = u;
          })
          .catch(() => {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const quitNow = useCallback(async () => {
    setQuitting(true);
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } finally {
      setQuitting(false);
    }
  }, []);

  const syncAndQuit = useCallback(async () => {
    setQuitting(true);
    try {
      const v = await api.syncNow();
      setSyncView(v);
    } catch {}
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } finally {
      setQuitting(false);
    }
  }, []);

  const activeTab = tabs.find((t) => t.path === active) ?? null;

  // Keyboard shortcuts: Cmd/Ctrl+K palette, Ctrl+S save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (active) void saveTabRef.current(active);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // Command palette actions.
  const paletteActions: PaletteAction[] = [
    { id: "run-tests", label: "Run tests", hint: "public suite", run: () => setPanel("tests") },
    { id: "open-brief", label: "Open brief", hint: "assignment", run: () => setPanel("brief") },
    { id: "open-team", label: "Open team thread", hint: "chat", run: () => setPanel("team") },
    { id: "open-analysis", label: "Review code analysis", hint: "findings", run: () => setPanel("analysis") },
    { id: "open-submit", label: "Submit for review", hint: "immutable", run: () => setPanel("submit") },
    { id: "sync", label: "Sync now", hint: "server", run: () => void manualSyncRef.current() },
  ];

  const toggleDir = useCallback((dir: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }, []);
  const saveState: SaveState = !activeTab
    ? "synced"
    : activeTab.saveError
      ? "error"
      : activeTab.saving
        ? "saving"
        : activeTab.dirty
          ? "dirty"
          : "synced";

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const onTestsRun = useCallback(() => {
    // Trigger the milestone banner after the first completed run.
    setMilestone((m) => (m && !m._acked && !m._shown ? { ...m, _shown: true } : m));
  }, []);

  const ackMilestone = useCallback(async () => {
    if (!milestone) return;
    try {
      await api.appendEvent("milestone_acknowledged", { milestone_id: milestone.id });
    } catch {}
    setMilestone((m) => (m ? { ...m, _acked: true, _shown: false } : m));
  }, [milestone]);

  // Group files by directory for the tree.
  const tree: Record<string, FileEntry[]> = {};
  for (const f of files) {
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "";
    (tree[dir] ||= []).push(f);
  }

  return (
    <div className="workspace">
      <div className="topbar">
        <div className="brand">
          <BrandLockup size={22} />
        </div>
        <span className="scenario-chip">
          {session.title ?? session.scenario_id}
          {session.organization ? ` · ${session.organization}` : ""}
        </span>
        <span className="pill">In progress</span>
        {/* DESK-09: local save state and remote sync state are shown
            separately and never conflated. */}
        <span className={`save-state ${saveState === "synced" ? "ok" : saveState === "dirty" ? "dirty" : saveState === "error" ? "err" : ""}`}>
          {saveState === "synced" ? "Saved on this device" : saveState === "dirty" ? "Unsaved changes" : saveState === "saving" ? "Saving…" : "Save failed"}
        </span>
        {syncView && (
          syncView.phase === "sync_failed" ? (
            <button
              className="save-state err"
              onClick={() => void manualSync()}
              disabled={syncBusy}
              title={syncView.last_error ?? "Sync failed"}
            >
              {syncBusy ? "Syncing…" : "Sync failed — retry"}
            </button>
          ) : (
            <span
              className={`save-state ${syncView.phase === "synced" ? "ok" : syncView.phase === "saved_local" ? "dirty" : syncView.phase === "conflict" ? "err" : ""}`}
              title={syncView.last_error ?? syncPhaseLabel(syncView.phase)}
            >
              {syncBusy && syncView.phase !== "synced" ? "Syncing…" : syncSummary(syncView.phase, syncView.dirty_paths.length, null)}
            </span>
          )
        )}
        <span className="timer">{fmt(elapsed)}</span>
      </div>

      {recoveryNote && (
        <div className="milestone-banner" role="status">
          <div className="milestone-text">
            <div className="milestone-title">
              Recovered work
              <ProvenanceTag kind="attention" />
            </div>
            <div className="milestone-body">{recoveryNote}</div>
          </div>
          <button className="btn" onClick={() => { setRecoveryNote(null); void manualSync(); }}>
            Sync now
          </button>
        </div>
      )}

      {syncView?.phase === "conflict" && (
        <div className="milestone-banner" role="alert">
          <div className="milestone-text">
            <div className="milestone-title">
              Sync conflict
              <ProvenanceTag kind="attention" />
            </div>
            <div className="milestone-body">
              Another session changed this assignment on the server
              {syncView.conflict_server_rev != null && (
                <> (revision {syncView.conflict_server_rev})</>
              )}.
              Your local work is untouched — nothing was overwritten.
              Choose which version wins.
              {resolveError && <div className="error mt-3">{resolveError}</div>}
            </div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => void resolveSyncConflict("take_remote")}>
              Use server version
            </button>
            <button className="btn" onClick={() => void resolveSyncConflict("keep_local")}>
              Keep my version
            </button>
          </div>
        </div>
      )}

      {milestone?._shown && !milestone._acked && (
        <div className="milestone-banner" role="alert">
          <div className="milestone-text">
            <div className="milestone-title">
              Requirement update — {milestone.title}
              <ProvenanceTag kind="generated" />
            </div>
            <div className="milestone-body">{milestone.body}</div>
          </div>
          <button className="btn" onClick={ackMilestone}>Acknowledge</button>
        </div>
      )}

      <div className="main">
        <div className="filetree">
          {files.length === 0 ? (
            <EmptyState
              icon="file"
              title="No files yet"
              body="The workspace hasn't synced any files. Check your connection and try again."
              actionLabel="Refresh"
              onAction={refreshFiles}
            />
          ) : (
            Object.keys(tree).sort().map((dir) => {
              const collapsed = collapsedDirs.has(dir);
              return (
                <div key={dir}>
                  {dir !== "" ? (
                    <button
                      className="dir dir-toggle"
                      onClick={() => toggleDir(dir)}
                      aria-expanded={!collapsed}
                    >
                      <span className="dir-arrow">{collapsed ? "▸" : "▾"}</span> {dir}/
                    </button>
                  ) : null}
                  {(!collapsed || dir === "") &&
                    tree[dir].map((f) => (
                      <button
                        key={f.path}
                        className={`file ${active === f.path ? "active" : ""}`}
                        onClick={() => openFile(f.path)}
                        title={f.path}
                      >
                        <span className="file-icon">{fileIcon(f.path)}</span>
                        {f.path.split("/").pop()}
                      </button>
                    ))}
                </div>
              );
            })
          )}
        </div>

        <div className="editor-area">
          <div className="tabs">
            {tabs.map((t) => (
              <button key={t.path} className={`tab ${active === t.path ? "active" : ""}`} onClick={() => setActive(t.path)}>
                {t.dirty && <span className="unsaved">●</span>}
                {t.path.split("/").pop()}
                <span className="close" onClick={(e) => { e.stopPropagation(); closeTab(t.path); }}>×</span>
              </button>
            ))}
          </div>
          <div className="editor-host">
            {activeTab ? (
              <Editor
                height="100%"
                language={langOf(activeTab.path)}
                theme="vs"
                value={activeTab.content}
                onChange={(v) => editTab(activeTab.path, v ?? "")}
                onMount={(editor) => {
                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                  });
                  const pos = editor.getPosition();
                  if (pos) setCursorPos({ line: pos.lineNumber, col: pos.column });
                }}
                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
              />
            ) : (
              <EmptyState
                icon="file"
                title="No file open"
                body="Open a file from the tree to start working. The brief describes your assignment."
                actionLabel="Open BRIEF.md"
                onAction={() => openFile("BRIEF.md")}
              />
            )}
          </div>
        </div>

        <div className="sidepanel">
          <div className="panel-tabs" role="tablist" aria-label="Task panels">
            {PANEL_TABS.map(([p, label]) => (
              <button
                key={p}
                role="tab"
                aria-selected={panel === p}
                className={`panel-tab ${panel === p ? "active" : ""} ${p === "submit" ? "send-tab" : ""}`}
                onClick={() => setPanel(p)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="panel-body">
            {panel === "brief" && <BriefPanel />}
            {panel === "tests" && <TestsPanel onTestsRun={onTestsRun} onStatus={setTestStatus} />}
            {panel === "team" && <TeamPanel />}
            {panel === "analysis" && <AnalysisPanel sessionId={session.platform_session_id} />}
            {panel === "submit" && <SubmitPanel onSubmitted={onSubmitted} sessionId={session.platform_session_id} />}
            {panel === "timeline" && <TimelinePanel />}
          </div>
        </div>
      </div>

      {/* Status bar: timer, test status, sync state, current file. */}
      <div className="statusbar" role="status" aria-label="Session status">
        <span className="status-item" title="Session elapsed time">
          <span className="status-dot" /> {fmt(elapsed)}
        </span>
        <span className={`status-item ${testStatus === "passed" ? "ok" : testStatus === "failed" ? "err" : ""}`} title="Last test run">
          Tests: {testStatus === "idle" ? "not run" : testStatus === "running" ? "running…" : testStatus}
        </span>
        {syncView && (
          <button
            className={`status-item ${syncView.phase === "synced" ? "ok" : syncView.phase === "sync_failed" || syncView.phase === "conflict" ? "err" : ""}`}
            onClick={() => void manualSync()}
            title={syncView.last_error ?? syncPhaseLabel(syncView.phase)}
          >
            {syncBusy ? "Syncing…" : syncSummary(syncView.phase, syncView.dirty_paths.length, null)}
          </button>
        )}
        <span className="spacer" />
        {activeTab && (
          <span className="status-item mono" title="Current file">
            {activeTab.path}
            {activeTab.dirty ? " ●" : ""}
          </span>
        )}
        {cursorPos && (
          <span className="status-item muted">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        )}
        <button className="status-item status-key" onClick={() => setPaletteOpen(true)} title="Command palette (Ctrl+K)">
          ⌘K
        </button>
      </div>

      {paletteOpen && (
        <CommandPalette
          files={files}
          actions={paletteActions}
          onClose={() => setPaletteOpen(false)}
          onOpenFile={(p) => void openFile(p)}
        />
      )}

      {conflict && (
        <Dialog
          title="Conflicting changes"
          onClose={() => setConflict(null)}
          actions={[
            { label: "Use server version", kind: "ghost", onClick: () => resolveConflict(false) },
            { label: "Keep mine", kind: "primary", onClick: () => resolveConflict(true) },
          ]}
        >
          <p>
            <strong>{conflict.path}</strong> changed on disk since you started
            editing. Your unsaved edits are safe — choose which version to keep.
          </p>
        </Dialog>
      )}

      {exitWarning && (
        <Dialog
          title="Quit with unpersisted work?"
          onClose={() => { if (!quitting) setExitWarning(null); }}
          actions={[
            { label: "Keep working", kind: "ghost", onClick: () => setExitWarning(null), disabled: quitting },
            { label: "Quit without syncing", kind: "ghost", onClick: () => void quitNow(), disabled: quitting },
            { label: "Sync & quit", kind: "primary", onClick: () => void syncAndQuit(), disabled: quitting, busyLabel: "Working…" },
          ]}
        >
          {exitWarning.dirtyTabs && (
            <p>
              Some tabs still have <strong>unsaved changes</strong> — they exist
              only in this window and will be lost if you quit.
            </p>
          )}
          {exitWarning.unsynced > 0 && (
            <p>
              <strong>{exitWarning.unsynced} file{exitWarning.unsynced === 1 ? " is" : "s are"} saved
              on this device</strong> but not yet acknowledged by the server.
              They survive a restart and will sync later — quitting is safe,
              but the server won't have them yet.
            </p>
          )}
          {exitWarning.conflict && (
            <p>
              A <strong>sync conflict</strong> is unresolved. Quitting now
              leaves your local work untouched but unreconciled.
            </p>
          )}
        </Dialog>
      )}
    </div>
  );
}

/** Side-panel tabs with the words a candidate would use for each one. */
const PANEL_TABS = [
  ["brief", "Brief"],
  ["team", "Team"],
  ["tests", "Tests"],
  ["analysis", "Code check"],
  ["timeline", "History"],
  ["submit", "Send work"],
] as const;

function langOf(path: string): string {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (path.endsWith(".json")) return "json";
  return "plaintext";
}
