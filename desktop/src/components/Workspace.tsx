import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { api, FileContent, FileEntry, Receipt, SessionInfo } from "../lib/tauri";
import { messageOf } from "../App";
import { BriefPanel, TestsPanel, TeamPanel, SubmitPanel, TimelinePanel, Milestone } from "./Panels";
import { Dialog, EmptyState, ProvenanceTag } from "./ui";

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
  const [panel, setPanel] = useState<"brief" | "tests" | "team" | "submit" | "timeline">("brief");
  const [elapsed, setElapsed] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [conflict, setConflict] = useState<{ path: string; server: FileContent } | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

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
  }, [refreshFiles]);

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

  const closeTab = useCallback((path: string) => {
    if (timers.current[path]) clearTimeout(timers.current[path]);
    setTabs((ts) => {
      const next = ts.filter((t) => t.path !== path);
      if (active === path) setActive(next.length ? next[next.length - 1].path : null);
      return next;
    });
  }, [active]);

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

  const activeTab = tabs.find((t) => t.path === active) ?? null;
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
          Fydell<span className="dot">.</span>
        </div>
        <span className="scenario-chip">
          {session.title ?? session.scenario_id}
          {session.organization ? ` · ${session.organization}` : ""}
        </span>
        <span className="pill">In progress</span>
        <span className={`save-state ${saveState === "synced" ? "ok" : saveState === "dirty" ? "dirty" : saveState === "error" ? "err" : ""}`}>
          {saveState === "synced" ? "Saved · Synced" : saveState === "dirty" ? "Unsaved changes" : saveState === "saving" ? "Saving…" : "Save failed — retrying"}
        </span>
        <span className="timer">{fmt(elapsed)}</span>
      </div>

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
            Object.keys(tree).sort().map((dir) => (
              <div key={dir}>
                {dir && <div className="dir">{dir}/</div>}
                {tree[dir].map((f) => (
                  <button
                    key={f.path}
                    className={`file ${active === f.path ? "active" : ""}`}
                    onClick={() => openFile(f.path)}
                    title={f.path}
                  >
                    {f.path.split("/").pop()}
                  </button>
                ))}
              </div>
            ))
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
                theme="vs-dark"
                value={activeTab.content}
                onChange={(v) => editTab(activeTab.path, v ?? "")}
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
          <div className="panel-tabs">
            {(["brief", "tests", "team", "submit", "timeline"] as const).map((p) => (
              <button key={p} className={`panel-tab ${panel === p ? "active" : ""}`} onClick={() => setPanel(p)}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="panel-body">
            {panel === "brief" && <BriefPanel />}
            {panel === "tests" && <TestsPanel onTestsRun={onTestsRun} />}
            {panel === "team" && <TeamPanel />}
            {panel === "submit" && <SubmitPanel onSubmitted={onSubmitted} />}
            {panel === "timeline" && <TimelinePanel />}
          </div>
        </div>
      </div>

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
    </div>
  );
}

function langOf(path: string): string {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
  if (path.endsWith(".json")) return "json";
  return "plaintext";
}
