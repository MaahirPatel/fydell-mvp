"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { engFetch } from "@/components/eng/api";
import { Button } from "@/components/ui/Button";
import type { AssistantInteractionView, ScenarioEventKey } from "@/lib/eng/authored/collaboration-types";
import type { AuthoredCandidateView, PublicRunView } from "@/lib/eng/authored/types";
import { AssistantPanel, readInteraction, upsertInteraction } from "./AssistantPanel";
import { BottomPanel, type BottomTab } from "./BottomPanel";
import { BriefContent, teammatesFor } from "./BriefContent";
import { Dialog } from "./Dialog";
import { clearDraft, readDraft, writeDraft, type LocalDraft } from "./draft";
import { EditorArea, tabId, type EditorTab } from "./EditorArea";
import { diffFileSets, formatClock, parseProblems, runTally, sameFiles, type Problem, type WorkspaceFile } from "./lib";
import { downloadWorkspaceZip, LocalEditingBar, LocalEditingDialog, planSync, readFolder, SyncPreviewDialog, type SyncPlan, type SyncStatus } from "./LocalEditing";
import type { RevealRequest } from "./MonacoViews";
import { PatchReview } from "./PatchReview";
import { setSimPrefs, useHydrated, useMediaQuery, useSimPrefs } from "./prefs";
import { ResizeHandle } from "./Resizable";
import { ReviewSubmission } from "./ReviewSubmission";
import { RightPanel, RightRail, type RightTab } from "./RightPanel";
import { SidebarPanel, SidebarRail, type ActivityItem, type ActivityKind, type SidebarSection } from "./Sidebar";
import { TeamPanel } from "./TeamPanel";
import { TopBar, useRemaining } from "./TopBar";
import { readCollaboration, useCollaboration } from "./useCollaboration";
import { useWorkspaceFiles, type SaveEvent, type SaveResult } from "./useWorkspaceFiles";

const EVENT_TEXT: Record<ScenarioEventKey, string> = {
  initial_context: "A teammate shared context for the task",
  review_question: "A teammate asked a question about your work",
  final_handoff: "A teammate asked for your handoff",
};

const BOTTOM_COLLAPSED = 36;

function runActivityText(run: PublicRunView): string {
  const t = runTally(run);
  if (run.status === "ran") return t.total ? `Public tests ran: ${t.passed} of ${t.total} passed` : "Public tests ran with no individual results";
  if (run.status === "timeout") return "Public test run timed out";
  if (run.status === "runner_unavailable") return "Public test run could not start: the runner is unavailable";
  if (run.status === "infrastructure_error") return "Public test run hit a runner error";
  return "Public test run started";
}

function saveFailureText(result: Extract<SaveResult, { ok: false }>): string {
  if (result.reason === "offline") return "You appear to be offline. Your edits are kept here and will save when the connection is back.";
  if (result.reason === "conflict") return "Your files changed in another tab or window. Choose which copy to keep first.";
  return result.message ?? "Your files could not be saved.";
}

function defaultTabs(files: WorkspaceFile[], testFiles: Set<string>): EditorTab[] {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const readme = sorted.find((f) => /^readme(\.md)?$/i.test(f.path));
  const source = sorted.find((f) => !testFiles.has(f.path) && f !== readme && f.content.trim().length > 0 && /\.(py|ts|tsx|js|mjs|go|rb|java)$/.test(f.path));
  const picked = [source, readme].filter((f): f is WorkspaceFile => Boolean(f));
  if (picked.length === 0 && files[0]) picked.push(files[0]);
  return picked.map((f) => ({ kind: "file", path: f.path }));
}

function locateTest(name: string, file: WorkspaceFile | undefined): number {
  if (!file) return 1;
  const short = (name.split("::").pop() ?? name).split("[")[0].trim();
  const lines = file.content.split(/\r?\n/);
  const patterns = [`def ${short}(`, `def ${short} (`, `"${short}"`, `'${short}'`, short];
  for (const p of patterns) {
    const i = lines.findIndex((l) => l.includes(p));
    if (i >= 0) return i + 1;
  }
  return 1;
}

export type WorkspaceMode = "working" | "submitted";

/**
 * The candidate's IDE-style workspace for an employer-authored task. Renders
 * on the client only: it reads browser preferences and the local draft.
 */
export function SimulationWorkspace(props: {
  view: AuthoredCandidateView;
  base: string;
  mode: WorkspaceMode;
  onSubmitted: (view: AuthoredCandidateView) => void;
  onShowReceipt?: () => void;
}) {
  const hydrated = useHydrated();
  if (!hydrated || !props.view.workspace) {
    return (
      <div className="grid h-dvh place-items-center">
        <p role="status" className="text-[14px] text-[var(--text-secondary)]">
          {props.view.workspace ? "Opening your workspace" : "Your workspace is not available. Reload the page to try again."}
        </p>
      </div>
    );
  }
  return <WorkspaceInner {...props} workspace={props.view.workspace} />;
}

function WorkspaceInner({
  view,
  base,
  mode,
  workspace,
  onSubmitted,
  onShowReceipt,
}: {
  view: AuthoredCandidateView;
  base: string;
  mode: WorkspaceMode;
  workspace: NonNullable<AuthoredCandidateView["workspace"]>;
  onSubmitted: (view: AuthoredCandidateView) => void;
  onShowReceipt?: () => void;
}) {
  const submitted = mode === "submitted";
  const attemptId = view.attempt.id;
  const prefs = useSimPrefs();
  const wide = useMediaQuery("(min-width: 1280px)");
  const testFiles = useMemo(() => new Set(view.task.publicTests.map((t) => t.file)), [view.task.publicTests]);
  const starterPaths = useMemo(() => new Set(view.task.starterFiles.map((f) => f.path)), [view.task.starterFiles]);

  const [draft] = useState<LocalDraft | null>(() => (submitted ? null : readDraft(attemptId)));
  const [draftOffer, setDraftOffer] = useState<LocalDraft | null>(() => (draft && !sameFiles(draft.files, workspace.files) ? draft : null));
  const [localMode, setLocalMode] = useState(() => !submitted && (draft?.localMode ?? false));
  const [activity, setActivity] = useState<ActivityItem[]>(() => draft?.activity ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>(() => draft?.answers ?? {});
  const [aiUse, setAiUse] = useState(() => draft?.aiUse ?? "");

  const log = useCallback((kind: ActivityKind, text: string, id?: string) => {
    const at = new Date().toISOString();
    setActivity((list) => {
      if (id && list.some((a) => a.id === id)) return list;
      const head = list[0];
      if (kind === "save" && head?.kind === "save" && Date.parse(at) - Date.parse(head.at) < 60_000) return [{ ...head, at, text }, ...list.slice(1)];
      return [{ id: id ?? `${kind}:${at}:${list.length}`, at, kind, text }, ...list].slice(0, 150);
    });
  }, []);

  const onSaveEvent = useCallback(
    (e: SaveEvent) => {
      if (e.kind === "saved") log("save", `Saved your files (revision ${e.revision})`);
      else if (e.kind === "conflict") log("problem", "Save paused: your files changed in another tab or window");
      else log("problem", `Save refused: ${e.message}`);
    },
    [log],
  );

  const ws = useWorkspaceFiles({ base, initial: workspace, readOnly: submitted || localMode, onSaveEvent });
  const paths = useMemo(() => ws.files.map((f) => f.path), [ws.files]);

  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    const known = new Set(workspace.files.map((f) => f.path));
    const restored = (draft?.tabs ?? []).filter((t) => known.has(t.path) || t.kind === "diff");
    return restored.length ? restored : defaultTabs(workspace.files, testFiles);
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    const restored = draft?.active && tabs.some((t) => tabId(t) === draft.active) ? draft.active : null;
    return restored ?? (tabs[0] ? tabId(tabs[0]) : null);
  });
  const cursors = useRef<Record<string, { line: number; column: number }>>(draft?.cursors ?? {});
  const [reveal, setReveal] = useState<RevealRequest | null>(() => {
    const active = tabs.find((t) => tabId(t) === activeId);
    const c = active ? draft?.cursors[active.path] : undefined;
    return active && c ? { path: active.path, line: c.line, column: c.column, nonce: 1 } : null;
  });
  const activeTab = tabs.find((t) => tabId(t) === activeId) ?? null;
  const activePath = activeTab?.path ?? null;

  const [section, setSection] = useState<SidebarSection>("files");
  const [compactLeftOpen, setCompactLeftOpen] = useState(false);
  const leftOpen = wide ? prefs.leftOpen : compactLeftOpen;
  const [leftWidth, setLeftWidth] = useState(prefs.leftWidth);
  const [rightWidth, setRightWidth] = useState(prefs.rightWidth);
  const [bottomHeight, setBottomHeight] = useState(prefs.bottomHeight);
  const [bottomTab, setBottomTab] = useState<BottomTab>("tests");
  const [rightTab, setRightTab] = useState<RightTab>("team");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rightOpen = wide ? prefs.rightOpen : drawerOpen;

  const [run, setRun] = useState<PublicRunView | null>(view.publicRuns.latest?.purpose === "workspace" ? view.publicRuns.latest : null);
  const [runsUsed, setRunsUsed] = useState(view.publicRuns.used);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);

  const collab = useCollaboration(base, !submitted);
  const collabView = collab.view;
  const assistantAvailable = collab.state.status === "ready" && collab.state.view.assistant.enabled;

  const [reviewing, setReviewing] = useState<AssistantInteractionView | null>(null);
  const [patchBusy, setPatchBusy] = useState<"accept" | "reject" | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewOpened = useRef(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [syncPlan, setSyncPlan] = useState<SyncPlan | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "idle" });

  const [seenSeq, setSeenSeq] = useState(0);
  const maxTeammateSeq = useMemo(() => (collabView?.messages ?? []).filter((m) => m.sender === "teammate").reduce((n, m) => Math.max(n, m.seq), 0), [collabView?.messages]);
  const teamVisible = rightOpen && rightTab === "team";
  const teamUnread = !teamVisible && maxTeammateSeq > seenSeq;
  const markTeamSeen = () => setSeenSeq(maxTeammateSeq);

  const remaining = useRemaining(submitted ? null : view.attempt.dueAt, view.serverNow);

  /* Rate-limit countdown for public test runs. */
  useEffect(() => {
    if (!run) return;
    const offset = new Date(view.serverNow).getTime() - Date.now();
    const readyAt = new Date(run.createdAt).getTime() + view.publicRuns.minGapSeconds * 1000;
    const update = () => setWaitSeconds(Math.max(0, Math.ceil((readyAt - (Date.now() + offset)) / 1000)));
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [run, view.serverNow, view.publicRuns.minGapSeconds]);

  /* Local draft: buffers, tabs and cursor, for recovering after a reload. Paused while a restore is on offer. */
  useEffect(() => {
    if (submitted || draftOffer) return;
    const id = window.setTimeout(() => {
      writeDraft(attemptId, {
        v: 1,
        savedAt: new Date().toISOString(),
        revision: ws.revision,
        files: ws.files.map((f) => ({ path: f.path, content: f.content })),
        tabs,
        active: activeId,
        cursors: cursors.current,
        localMode,
        activity: activity.slice(0, 100),
        answers,
        aiUse,
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [submitted, draftOffer, attemptId, ws.revision, ws.files, tabs, activeId, localMode, activity, answers, aiUse]);

  const changes = useMemo(() => diffFileSets(ws.files, view.task.starterFiles), [ws.files, view.task.starterFiles]);
  const problems = useMemo(() => (run?.output ? parseProblems(run.output, paths) : []), [run, paths]);
  const deletable = useMemo(() => new Set(paths.filter((p) => !starterPaths.has(p))), [paths, starterPaths]);
  const teammates = teammatesFor(view, collabView?.teammates ?? null);

  const scenarioEvents = collabView?.events;
  const interactions = collabView?.assistant.interactions;
  const mergedActivity = useMemo(() => {
    const items = new Map<string, ActivityItem>();
    for (const a of activity) items.set(a.id, a);
    if (run && !items.has(`run:${run.id}`)) items.set(`run:${run.id}`, { id: `run:${run.id}`, at: run.createdAt, kind: "tests", text: runActivityText(run) });
    for (const e of scenarioEvents ?? []) items.set(`event:${e.key}`, { id: `event:${e.key}`, at: e.releasedAt, kind: "scenario", text: EVENT_TEXT[e.key] });
    for (const i of interactions ?? []) {
      if (!i.decidedAt || (i.decision !== "accepted" && i.decision !== "rejected")) continue;
      const n = i.patch?.length ?? 0;
      items.set(`decision:${i.id}`, {
        id: `decision:${i.id}`,
        at: i.decidedAt,
        kind: "assistant",
        text: i.decision === "accepted" ? `Accepted an assistant proposal (${n} ${n === 1 ? "file" : "files"})` : "Rejected an assistant proposal",
      });
    }
    return [...items.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [activity, run, scenarioEvents, interactions]);

  /* Tabs */
  const openTab = useCallback(
    (tab: EditorTab) => {
      const id = tabId(tab);
      setTabs((list) => {
        if (list.some((t) => tabId(t) === id)) return list;
        const at = list.findIndex((t) => tabId(t) === activeId);
        const next = [...list];
        next.splice(at >= 0 ? at + 1 : next.length, 0, tab);
        return next;
      });
      setActiveId(id);
    },
    [activeId],
  );
  const openFile = useCallback((path: string) => openTab({ kind: "file", path }), [openTab]);
  const openDiff = useCallback((path: string) => openTab({ kind: "diff", path }), [openTab]);
  const openAt = (path: string, line: number, column: number) => {
    openFile(path);
    setReveal((r) => ({ path, line, column, nonce: (r?.nonce ?? 0) + 1 }));
  };
  const closeTab = (id: string) => {
    const i = tabs.findIndex((t) => tabId(t) === id);
    const next = tabs.filter((t) => tabId(t) !== id);
    setTabs(next);
    if (id === activeId) {
      const neighbor = next[i] ?? next[i - 1] ?? null;
      setActiveId(neighbor ? tabId(neighbor) : null);
    }
  };
  const deleteFile = (path: string) => {
    ws.deleteFile(path);
    setTabs((list) => list.filter((t) => !(t.kind === "file" && t.path === path)));
    if (activePath === path && activeTab?.kind === "file") setActiveId(null);
  };
  const addFile = (path: string) => {
    ws.addFile(path);
    openFile(path);
  };

  /* Layout */
  const toggleLeft = (s: SidebarSection) => {
    if (leftOpen && section === s) {
      if (wide) setSimPrefs({ leftOpen: false });
      else setCompactLeftOpen(false);
      return;
    }
    setSection(s);
    if (wide) setSimPrefs({ leftOpen: true });
    else setCompactLeftOpen(true);
  };
  const setRightOpen = (open: boolean) => {
    if (!open && rightTab === "team") markTeamSeen();
    if (wide) setSimPrefs({ rightOpen: open });
    else setDrawerOpen(open);
  };
  const chooseRightTab = (tab: RightTab) => {
    if (tab !== "team" && rightTab === "team") markTeamSeen();
    setRightTab(tab);
  };
  const toggleBottom = () => setSimPrefs({ bottomOpen: !prefs.bottomOpen });

  useEffect(() => {
    if (wide || !drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [wide, drawerOpen]);

  /* Tests */
  const runTests = async () => {
    setRunning(true);
    setRunError(null);
    setBottomTab("tests");
    if (!prefs.bottomOpen) setSimPrefs({ bottomOpen: true });
    const saved = await ws.flush();
    if (saved.ok === false) {
      setRunning(false);
      setRunError(saveFailureText(saved));
      return;
    }
    const res = await engFetch<{ run: PublicRunView }>(`${base}/public-tests`, { body: { purpose: "workspace", files: saved.files } });
    setRunning(false);
    if (res.ok === false) {
      setRunError(res.error);
      return;
    }
    setRun(res.data.run);
    setRunsUsed((n) => n + 1);
    log("tests", runActivityText(res.data.run), `run:${res.data.run.id}`);
  };

  const selectTest = (name: string) => {
    const meta = view.task.publicTests.find((t) => t.name === name || name.endsWith(t.name) || t.name.endsWith(name));
    const file = meta ? ws.files.find((f) => f.path === meta.file) : undefined;
    if (!file) return;
    openAt(file.path, locateTest(name, file), 1);
  };

  /* Assistant patches */
  const startReview = (interaction: AssistantInteractionView) => {
    setPatchError(null);
    setReviewing(interaction);
  };

  const recordDecision = async (interaction: AssistantInteractionView, decision: "accepted" | "rejected", appliedRevision?: number): Promise<boolean> => {
    const res = await engFetch<unknown>(`${base}/assistant/${interaction.id}`, { body: decision === "accepted" ? { decision, appliedRevision } : { decision } });
    if (res.ok === false) {
      setPatchError(
        decision === "accepted"
          ? `Your files were updated and saved, but the decision could not be recorded: ${res.error} Choose Accept and save again to retry.`
          : `The decision could not be recorded: ${res.error}`,
      );
      return false;
    }
    const updated = readInteraction(res.data);
    if (updated) collab.updateView((v) => upsertInteraction(v, updated));
    else void collab.refresh();
    return true;
  };

  const acceptPatch = async () => {
    const interaction = reviewing;
    if (!interaction?.patch?.length) return;
    setPatchBusy("accept");
    setPatchError(null);
    const snapshot = ws.files;
    ws.writeFiles(interaction.patch.map((p) => ({ path: p.path, content: p.content })));
    const saved = await ws.flush();
    if (saved.ok === false) {
      if (saved.reason === "error") {
        ws.replaceAll(snapshot);
        setPatchError(`The proposal could not be saved, so your files were left as they were. ${saved.message ?? ""}`.trim());
      } else {
        setPatchError(`The changes are in your editor but not saved yet. ${saveFailureText(saved)}`);
      }
      setPatchBusy(null);
      return;
    }
    const ok = await recordDecision(interaction, "accepted", saved.revision);
    setPatchBusy(null);
    if (!ok) return;
    log("assistant", `Accepted an assistant proposal (${interaction.patch.length} ${interaction.patch.length === 1 ? "file" : "files"})`, `decision:${interaction.id}`);
    setReviewing(null);
    for (const p of interaction.patch) openFile(p.path);
  };

  const rejectPatch = async () => {
    const interaction = reviewing;
    if (!interaction) return;
    setPatchBusy("reject");
    setPatchError(null);
    const ok = await recordDecision(interaction, "rejected");
    setPatchBusy(null);
    if (!ok) return;
    log("assistant", "Rejected an assistant proposal", `decision:${interaction.id}`);
    setReviewing(null);
  };

  /* Review and submit */
  const openReview = () => {
    if (submitted) {
      onShowReceipt?.();
      return;
    }
    setReviewOpen(true);
    if (reviewOpened.current) return;
    reviewOpened.current = true;
    void engFetch<unknown>(`${base}/review-opened`, { method: "POST" }).then((res) => {
      if (res.ok === false) return;
      const next = readCollaboration(res.data);
      if (next) collab.setView(next);
    });
  };

  const submit = async (): Promise<string | null> => {
    const saved = await ws.flush();
    if (saved.ok === false) return saveFailureText(saved);
    const res = await engFetch<{ receipt: unknown }>(`${base}/submit`, { body: { files: saved.files, handoff: answers, ai_use: aiUse } });
    if (res.ok === false) return res.problems.length ? `${res.error} ${res.problems.join(" ")}` : res.error;
    clearDraft(attemptId);
    const refreshed = await engFetch<{ view: AuthoredCandidateView }>(base);
    if (refreshed.ok) onSubmitted(refreshed.data.view);
    else window.location.reload();
    return null;
  };

  /* Local editing */
  const pickFolder = async (list: FileList) => {
    setSyncStatus({ kind: "reading" });
    setSyncError(null);
    try {
      const read = await readFolder(list, paths);
      setSyncPlan(planSync(read, ws.files, testFiles));
      setSyncStatus((s) => (s.kind === "reading" ? { kind: "idle" } : s));
    } catch {
      setSyncStatus({ kind: "failed", message: "The folder could not be read. Try choosing it again." });
    }
  };

  const confirmSync = async (removeMissing: boolean) => {
    if (!syncPlan) return;
    setSyncBusy(true);
    setSyncError(null);
    const snapshot = ws.files;
    const updates = [...syncPlan.changed, ...syncPlan.added];
    const removed = removeMissing ? syncPlan.missing : [];
    ws.writeFiles(updates, removed);
    const saved = await ws.flush();
    setSyncBusy(false);
    if (saved.ok === false) {
      if (saved.reason === "error") {
        ws.replaceAll(snapshot);
        void ws.flush();
        setSyncError(`Nothing was synced. ${saved.message ?? "The server refused these files."}`);
      } else {
        setSyncError(saveFailureText(saved));
      }
      return;
    }
    const count = updates.length + removed.length;
    setSyncStatus({ kind: "synced", at: new Date().toISOString(), count });
    log("sync", `Synced ${count} ${count === 1 ? "file" : "files"} from your project folder`);
    setSyncPlan(null);
  };

  /* Draft restore */
  const restoreDraft = () => {
    if (!draftOffer) return;
    const existing = new Map(ws.files.map((f) => [f.path, f]));
    ws.replaceAll(draftOffer.files.map((f) => ({ ...existing.get(f.path), path: f.path, content: f.content })));
    setDraftOffer(null);
    log("save", "Restored your local draft");
  };

  const overlayOpen = reviewOpen || briefOpen || localDialogOpen || syncPlan !== null;
  const readOnlyReason = submitted ? "Submitted. Your files are read-only." : localMode ? "Local editing is on. Sync your project folder to update these files." : null;

  const teamPanel = <TeamPanel base={base} state={collab.state} onView={collab.setView} />;
  const assistantPanel = assistantAvailable ? (
    <AssistantPanel
      base={base}
      state={collab.state}
      contextOptions={tabs.filter((t) => t.kind === "file").map((t) => t.path)}
      activePath={activeTab?.kind === "file" ? activeTab.path : null}
      readOnly={submitted}
      reviewingId={reviewing?.id ?? null}
      getBuffers={(list) => ws.files.filter((f) => list.includes(f.path)).map((f) => ({ path: f.path, content: f.content }))}
      onInteraction={(interaction, usage) => {
        collab.updateView((v) => upsertInteraction(v, interaction, usage));
        if (interaction.patch?.length && interaction.decision === "pending") log("assistant", `The assistant proposed changes to ${interaction.patch.length} ${interaction.patch.length === 1 ? "file" : "files"}`);
      }}
      onReview={startReview}
    />
  ) : null;

  const rightPanel = (
    <RightPanel
      tab={assistantAvailable ? rightTab : "team"}
      assistantAvailable={assistantAvailable}
      teamUnread={teamUnread}
      onTab={chooseRightTab}
      onCollapse={() => setRightOpen(false)}
      collapseLabel={wide ? "Collapse the collaboration panel" : "Close the collaboration panel"}
      team={teamPanel}
      assistant={assistantPanel}
    />
  );

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden" inert={overlayOpen}>
        <TopBar
          title={view.task.title}
          submitted={submitted}
          saveState={ws.saveState}
          remaining={remaining}
          late={view.attempt.window === "late"}
          preview={view.preview}
          compact={!wide}
          rightOpen={rightOpen}
          rightAvailable
          onToggleRight={() => {
            if (!drawerOpen) setDrawerOpen(true);
            else setRightOpen(false);
          }}
          onRetrySave={ws.retry}
          onReview={openReview}
          onOpenLocal={submitted ? null : () => setLocalDialogOpen(true)}
          onDownloadCurrent={() => downloadWorkspaceZip(ws.files, view.task.title)}
          starterHref={`${base}/starter`}
        />

        {ws.saveState === "conflict" ? (
          <div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border-default)] bg-[var(--sim-attention-bg)] px-4 py-2">
            <p className="min-w-0 flex-1 text-[13.5px] text-[var(--text-primary)]">
              Your files were saved from another tab or window. Your edits here are kept and nothing has been overwritten. Choose which copy to continue with.
            </p>
            {ws.conflict ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => void ws.loadServerCopy()}>
                  Load the saved copy
                </Button>
                <Button size="sm" variant="quiet" onClick={ws.keepMine}>
                  Keep my version
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                Reload the saved copy
              </Button>
            )}
          </div>
        ) : null}
        {ws.saveState === "error" && ws.saveError ? (
          <div role="alert" className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border-default)] bg-[var(--sim-error-bg)] px-4 py-2">
            <p className="min-w-0 flex-1 text-[13.5px] text-[var(--text-primary)]">Your latest edits were not saved: {ws.saveError}</p>
            <Button size="sm" variant="secondary" onClick={ws.retry}>
              Try again
            </Button>
          </div>
        ) : null}
        {draftOffer ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-band)] px-4 py-2">
            <p className="min-w-0 flex-1 text-[13.5px] text-[var(--text-primary)]">
              This browser has a local draft from {formatClock(draftOffer.savedAt)} with edits that are not in your saved workspace
              {draftOffer.revision !== ws.revision ? ". It was based on an earlier saved version, so restoring it replaces newer saved changes" : ""}.
            </p>
            <Button size="sm" variant="secondary" onClick={restoreDraft} disabled={localMode}>
              Restore local draft
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setDraftOffer(null)}>
              Discard
            </Button>
          </div>
        ) : null}

        <div className="relative flex min-h-0 flex-1">
          <SidebarRail section={section} open={leftOpen} changeCount={changes.length} onSelect={toggleLeft} />
          {leftOpen ? (
            <>
              <div id="sim-left" className="min-h-0 shrink-0 border-r border-[var(--border-default)]" style={{ width: leftWidth }}>
                <SidebarPanel
                  section={section}
                  view={view}
                  teammates={teammates}
                  messagingAvailable={collab.state.status === "ready"}
                  paths={paths}
                  activePath={activeTab?.kind === "file" ? activeTab.path : null}
                  dirtyPaths={ws.dirtyPaths}
                  changes={changes}
                  deletable={deletable}
                  readOnly={submitted || localMode}
                  activity={mergedActivity}
                  onOpenFile={openFile}
                  onOpenDiff={openDiff}
                  onAddFile={addFile}
                  onDeleteFile={deleteFile}
                  onExpandBrief={() => setBriefOpen(true)}
                />
              </div>
              <ResizeHandle
                orientation="vertical"
                value={leftWidth}
                min={180}
                max={480}
                direction={1}
                label="Resize sidebar"
                controls="sim-left"
                onChange={setLeftWidth}
                onCommit={(w) => setSimPrefs({ leftWidth: w })}
              />
            </>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Editor">
            {localMode ? (
              <LocalEditingBar
                status={syncStatus}
                onPickFolder={(list) => void pickFolder(list)}
                onDownload={() => downloadWorkspaceZip(ws.files, view.task.title)}
                onStop={() => setLocalMode(false)}
              />
            ) : null}
            <div className="min-h-0 flex-1">
              <EditorArea
                tabs={tabs}
                activeId={activeId}
                files={ws.files}
                starter={view.task.starterFiles}
                testFiles={testFiles}
                dirtyPaths={ws.dirtyPaths}
                readOnly={submitted || localMode}
                readOnlyReason={readOnlyReason}
                theme={prefs.theme}
                fontSize={prefs.fontSize}
                reveal={reveal}
                overlay={
                  reviewing ? (
                    <PatchReview
                      key={reviewing.id}
                      interaction={reviewing}
                      files={ws.files}
                      theme={prefs.theme}
                      fontSize={prefs.fontSize}
                      busy={patchBusy}
                      error={patchError}
                      onAccept={() => void acceptPatch()}
                      onReject={() => void rejectPatch()}
                      onClose={() => setReviewing(null)}
                    />
                  ) : null
                }
                onActivate={setActiveId}
                onClose={closeTab}
                onOpenDiff={openDiff}
                onOpenFile={openFile}
                onChange={ws.updateFile}
                onCursor={(path, line, column) => {
                  cursors.current = { ...cursors.current, [path]: { line, column } };
                }}
                onSave={() => void ws.flush()}
              />
            </div>
            {prefs.bottomOpen ? (
              <ResizeHandle
                orientation="horizontal"
                value={bottomHeight}
                min={120}
                max={640}
                direction={-1}
                label="Resize bottom panel"
                controls="sim-bottom"
                onChange={setBottomHeight}
                onCommit={(h) => setSimPrefs({ bottomHeight: h })}
              />
            ) : null}
            <div id="sim-bottom" className="shrink-0" style={{ height: prefs.bottomOpen ? bottomHeight : BOTTOM_COLLAPSED }}>
              <BottomPanel
                tab={bottomTab}
                open={prefs.bottomOpen}
                run={run}
                running={running}
                runError={runError}
                canRun={!submitted}
                runsLeft={Math.max(0, view.publicRuns.limit - runsUsed)}
                runsLimit={view.publicRuns.limit}
                waitSeconds={waitSeconds}
                savedSha={ws.savedSha}
                hasUnsaved={ws.hasUnsaved}
                problems={problems}
                testCommand={view.task.environment.publicTestCommand}
                localEditingAvailable={!submitted}
                onTab={setBottomTab}
                onToggle={toggleBottom}
                onRun={() => void runTests()}
                onOpenProblem={(p: Problem) => openAt(p.path, p.line, p.column ?? 1)}
                onSelectTest={selectTest}
                onOpenLocal={() => setLocalDialogOpen(true)}
              />
            </div>
          </main>

          {wide ? (
            rightOpen ? (
              <>
                <ResizeHandle
                  orientation="vertical"
                  value={rightWidth}
                  min={280}
                  max={640}
                  direction={-1}
                  label="Resize collaboration panel"
                  controls="sim-right-panel"
                  onChange={setRightWidth}
                  onCommit={(w) => setSimPrefs({ rightWidth: w })}
                />
                <aside id="sim-right-panel" aria-label="Collaboration" className="min-h-0 shrink-0 border-l border-[var(--border-default)]" style={{ width: rightWidth }}>
                  {rightPanel}
                </aside>
              </>
            ) : (
              <RightRail
                assistantAvailable={assistantAvailable}
                teamUnread={teamUnread}
                onOpen={(tab) => {
                  setRightTab(tab);
                  setSimPrefs({ rightOpen: true });
                }}
              />
            )
          ) : drawerOpen ? (
            <aside
              id="sim-right-panel"
              aria-label="Collaboration"
              className="absolute inset-y-0 right-0 z-40 w-[min(380px,92vw)] border-l border-[var(--border-default)] shadow-[var(--sim-shadow)]"
            >
              {rightPanel}
            </aside>
          ) : null}
        </div>
      </div>

      {reviewOpen ? (
        <ReviewSubmission
          view={view}
          changes={changes}
          run={run}
          savedSha={ws.savedSha}
          hasUnsaved={ws.hasUnsaved}
          saveState={ws.saveState}
          localMode={localMode}
          answers={answers}
          aiUse={aiUse}
          teamMessages={collabView?.messages.length ?? 0}
          assistantInteractions={collabView?.assistant.interactions.length ?? 0}
          assistantEnabled={assistantAvailable}
          onAnswer={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))}
          onAiUse={setAiUse}
          onOpenDiff={(path) => {
            setReviewOpen(false);
            openDiff(path);
          }}
          onSaveNow={async () => (await ws.flush()).ok}
          onSubmit={submit}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}

      {briefOpen ? (
        <Dialog title={view.task.title} description={`${view.role.title} at ${view.role.organizationName}`} onClose={() => setBriefOpen(false)} size="lg">
          <BriefContent view={view} teammates={teammates} messagingAvailable={collab.state.status === "ready"} idBase="dialog-brief" />
        </Dialog>
      ) : null}

      {localDialogOpen ? (
        <LocalEditingDialog
          title={view.task.title}
          files={ws.files}
          starterHref={`${base}/starter`}
          testCommand={view.task.environment.publicTestCommand}
          setupCommands={view.task.environment.setupCommands}
          localMode={localMode}
          onStart={() => {
            void ws.flush();
            setLocalMode(true);
            setLocalDialogOpen(false);
          }}
          onClose={() => setLocalDialogOpen(false)}
        />
      ) : null}

      {syncPlan ? <SyncPreviewDialog plan={syncPlan} busy={syncBusy} error={syncError} onConfirm={(remove) => void confirmSync(remove)} onClose={() => setSyncPlan(null)} /> : null}
    </>
  );
}
