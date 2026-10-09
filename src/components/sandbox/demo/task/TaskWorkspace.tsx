"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Clock, HardDrive, PanelRight, Play } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { demoScenario } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { diffFiles } from "@/lib/sandbox-demo/diff";
import { runtimeFor } from "@/lib/sandbox-demo/runtime";
import { ATTEMPT_LIMIT, RUN_SUMMARY_LIMIT, emptyReview, type Attempt, type HandoffField } from "@/lib/sandbox-demo/state";
import { minutesBetween, summarizeRun } from "@/lib/sandbox-demo/team-client";
import type { TestMeta } from "@/lib/sandbox-demo/types";
import { EditorArea, tabId, type EditorTab } from "@/components/simulations/workspace/EditorArea";
import { FileTree } from "@/components/simulations/workspace/FileTree";
import type { ChangeKind, WorkspaceFile } from "@/components/simulations/workspace/lib";
import type { RevealRequest } from "@/components/simulations/workspace/MonacoViews";
import { setSimPrefs, useMediaQuery, useSimPrefs } from "@/components/simulations/workspace/prefs";
import { ResizeHandle } from "@/components/simulations/workspace/Resizable";
import { RightRail } from "@/components/simulations/workspace/RightPanel";
import { SettingsMenu } from "@/components/simulations/workspace/SettingsMenu";
import { SidebarRail, type SidebarSection } from "@/components/simulations/workspace/Sidebar";
import { SimThemeRoot } from "@/components/simulations/workspace/SimThemeRoot";
import { useHydrated, useNow, useScenarioProgress } from "../useDemoState";
import { useTestRun } from "../useTestRun";
import { SubmitDialog } from "./SubmitDialog";
import { ChangesList, TaskBottomPanel, TaskBrief, type BottomTab } from "./TaskPanels";
import { TeamDock } from "./TeamDock";
import { useTeam } from "./useTeam";
import t from "./task.module.css";

const BOTTOM_COLLAPSED = 36;
const SECTIONS: SidebarSection[] = ["brief", "files", "changes"];
const SECTION_LABEL: Record<string, string> = { brief: "Brief", files: "Files", changes: "Changes" };
const NO_PATHS = new Set<string>();

function elapsedText(minutes: number): string {
  if (minutes < 1) return "Under a minute";
  if (minutes >= 90) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${minutes} min`;
}

/** The line where a test is registered, so selecting it in the Tests panel can reveal it. */
function testLine(source: string, name: string): number {
  const quoted = [JSON.stringify(name), `'${name}'`, `\`${name}\``];
  const lines = source.split("\n");
  const i = lines.findIndex((l) => quoted.some((q) => l.includes(q)));
  return i >= 0 ? i + 1 : 1;
}

/**
 * How the task behaves when it runs inside the employer demo workspace rather
 * than as a standalone preview: drafts are scoped to the account, a notice says
 * whose perspective this is, and submitting saves to the demo workspace.
 */
export type TaskEmbed = {
  storageScope: string;
  overview: { href: string; label: string };
  notice: ReactNode;
  consequence: { confirm: string; kept: string };
  onSubmitted: (attempt: Attempt) => Promise<{ ok: true; href: string } | { ok: false; error: string }>;
};

/** A simulation's full-screen workspace, in the production workspace's theme. */
export default function DemoWorkspace({ scenarioKey, embed }: { scenarioKey: string; embed?: TaskEmbed }) {
  const hydrated = useHydrated();
  const scenario = demoScenario(scenarioKey);
  if (!scenario) return null;
  return (
    <SimThemeRoot className={t.root}>
      {hydrated ? (
        <TaskWorkspace scenario={scenario} embed={embed} />
      ) : (
        <div className="grid h-dvh place-items-center">
          <p role="status" className="text-[14px] text-[var(--text-secondary)]">
            Opening the workspace
          </p>
        </div>
      )}
    </SimThemeRoot>
  );
}

function TaskWorkspace({ scenario, embed }: { scenario: DemoScenario; embed?: TaskEmbed }) {
  const router = useRouter();
  const rt = runtimeFor(scenario);
  const { progress: p, updateProgress } = useScenarioProgress(scenario, embed?.storageScope);
  const prefs = useSimPrefs();
  const wide = useMediaQuery("(min-width: 1024px)");
  const now = useNow(15_000);
  const { running, run } = useTestRun(scenario);
  const team = useTeam(scenario, p, updateProgress);
  const overview = embed?.overview ?? { href: `/sandbox/${scenario.key}`, label: "Simulation overview" };

  /* Start the clock the first time the workspace opens. */
  useEffect(() => {
    if (p.startedAt) return;
    const at = new Date().toISOString();
    updateProgress((cur) => (cur.startedAt ? cur : { ...cur, startedAt: at, lastActivityAt: at }));
  }, [p.startedAt, updateProgress]);

  /* Navigate only after the state effect has written to storage. */
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  useEffect(() => {
    if (leaveTo) router.push(leaveTo);
  }, [leaveTo, router]);

  const locked = useMemo(() => new Set(rt.lockedPaths), [rt]);
  const testFiles = useMemo(() => new Set(rt.publicTestFiles), [rt]);
  const starter = useMemo(() => rt.candidateFiles.map((f) => ({ path: f.path, content: f.content })), [rt]);
  const files = useMemo<WorkspaceFile[]>(
    () => rt.candidateFiles.map((f) => ({ path: f.path, content: f.editable ? (p.files[f.path] ?? f.content) : f.content, editable: f.editable })),
    [rt, p.files],
  );
  const diffs = useMemo(() => diffFiles(rt.starterFiles, { ...rt.starterFiles, ...p.files }, rt.editablePaths), [rt, p.files]);
  const changeMap = useMemo(() => new Map<string, ChangeKind>(diffs.map((d) => [d.path, "modified"])), [diffs]);

  /* Tabs */
  const readme = rt.candidatePaths.find((path) => path.toLowerCase() === "readme.md") ?? null;
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    const first: EditorTab = { kind: "file", path: p.activeFile };
    return readme && p.activeFile !== readme ? [first, { kind: "file", path: readme }] : [first];
  });
  const [activeId, setActiveId] = useState<string | null>(() => tabId({ kind: "file", path: p.activeFile }));
  const [reveal, setReveal] = useState<RevealRequest | null>(null);
  const activeTab = tabs.find((x) => tabId(x) === activeId) ?? null;

  const openTab = useCallback(
    (tab: EditorTab) => {
      const id = tabId(tab);
      setTabs((list) => {
        if (list.some((x) => tabId(x) === id)) return list;
        const at = list.findIndex((x) => tabId(x) === activeId);
        const next = [...list];
        next.splice(at >= 0 ? at + 1 : next.length, 0, tab);
        return next;
      });
      setActiveId(id);
      if (tab.kind === "file") updateProgress((cur) => (cur.activeFile === tab.path ? cur : { ...cur, activeFile: tab.path }));
    },
    [activeId, updateProgress],
  );
  const openFile = useCallback((path: string) => openTab({ kind: "file", path }), [openTab]);
  const openDiff = useCallback((path: string) => openTab({ kind: "diff", path }), [openTab]);
  const closeTab = (id: string) => {
    const i = tabs.findIndex((x) => tabId(x) === id);
    const next = tabs.filter((x) => tabId(x) !== id);
    setTabs(next);
    if (id === activeId) {
      const neighbor = next[i] ?? next[i - 1] ?? null;
      setActiveId(neighbor ? tabId(neighbor) : null);
    }
  };

  /* Layout */
  const [section, setSection] = useState<SidebarSection>(() => (p.lastRun || diffs.length ? "files" : "brief"));
  const [compactLeftOpen, setCompactLeftOpen] = useState(false);
  const leftOpen = wide ? prefs.leftOpen : compactLeftOpen;
  const [leftWidth, setLeftWidth] = useState(Math.max(prefs.leftWidth, 260));
  const [rightWidth, setRightWidth] = useState(prefs.rightWidth);
  const [bottomHeight, setBottomHeight] = useState(prefs.bottomHeight);
  const [bottomTab, setBottomTab] = useState<BottomTab>("tests");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const rightOpen = wide ? prefs.rightOpen : drawerOpen;

  const teammateCount = p.team.filter((m) => m.from !== "you" && m.from !== "system").length;
  const [seen, setSeen] = useState(teammateCount);
  const teamUnread = !rightOpen && teammateCount > seen;

  const toggleLeft = (next: SidebarSection) => {
    if (leftOpen && section === next) {
      if (wide) setSimPrefs({ leftOpen: false });
      else setCompactLeftOpen(false);
      return;
    }
    setSection(next);
    if (wide) setSimPrefs({ leftOpen: true });
    else setCompactLeftOpen(true);
  };
  const setRightOpen = (open: boolean) => {
    if (!open) setSeen(teammateCount);
    if (wide) setSimPrefs({ rightOpen: open });
    else setDrawerOpen(open);
  };

  useEffect(() => {
    if (wide || !drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [wide, drawerOpen]);

  /* Editing and tests */
  const onEdit = (path: string, content: string) => {
    if (!rt.editablePaths.includes(path) || p.files[path] === content) return;
    const at = new Date().toISOString();
    updateProgress((cur) => ({ ...cur, files: { ...cur.files, [path]: content }, lastActivityAt: at }));
  };

  const runTests = async () => {
    if (running) return;
    setBottomTab("tests");
    if (!prefs.bottomOpen) setSimPrefs({ bottomOpen: true });
    const record = await run({ ...p.files }, "public");
    const at = new Date().toISOString();
    updateProgress((cur) => ({
      ...cur,
      lastRun: record,
      runs: [...cur.runs, summarizeRun(scenario, record)].slice(-RUN_SUMMARY_LIMIT),
      runCount: cur.runCount + 1,
      lastActivityAt: at,
    }));
  };

  const selectTest = (meta: TestMeta) => {
    openFile(meta.file);
    const source = rt.starterFiles[meta.file] ?? "";
    setReveal((r) => ({ path: meta.file, line: testLine(source, meta.name), column: 1, nonce: (r?.nonce ?? 0) + 1 }));
  };

  /* Review and submit */
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setHandoff = (field: HandoffField, value: string) => updateProgress((cur) => ({ ...cur, handoff: { ...cur.handoff, [field]: value } }));

  const submit = async () => {
    if (running || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const submitted = { ...p.files };
    let record: Awaited<ReturnType<typeof run>>;
    try {
      record = await run(submitted, "all");
    } catch {
      setSubmitting(false);
      setSubmitError("The tests could not start in this browser, so nothing was submitted. Try again.");
      return;
    }
    const attempt: Attempt = {
      id: `attempt-${Date.now()}`,
      at: record.at,
      files: submitted,
      run: record,
      handoff: { ...p.handoff },
      transcript: p.team.filter((m) => m.status !== "sending"),
    };
    if (embed) {
      const saved = await embed.onSubmitted(attempt).catch(() => ({ ok: false as const, error: "The submission could not reach the server. Your files are still here; try again." }));
      if ("error" in saved) {
        setSubmitting(false);
        setSubmitError(saved.error);
        return;
      }
      updateProgress((cur) => ({ ...cur, attempts: [...cur.attempts, attempt].slice(-ATTEMPT_LIMIT), review: emptyReview() }));
      setLeaveTo(saved.href);
      return;
    }
    updateProgress((cur) => ({ ...cur, attempts: [...cur.attempts, attempt].slice(-ATTEMPT_LIMIT), review: emptyReview() }));
    setLeaveTo(`/sandbox/${scenario.key}/report`);
  };

  const elapsed = minutesBetween(p.startedAt, now);

  const teamDock = (
    <TeamDock
      scenario={scenario}
      team={p.team}
      typing={team.typing}
      messageInFlight={team.messageInFlight}
      onSend={team.send}
      onRetry={team.retry}
      onCollapse={() => setRightOpen(false)}
      collapseLabel={wide ? "Collapse the team panel" : "Close the team panel"}
    />
  );

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden" inert={reviewOpen}>
        {embed?.notice}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-3">
          <Link href="/" aria-label="Fydell home" className="shrink-0 rounded-[4px]">
            <FydellLogo height={17} tone={prefs.theme === "dark" ? "dark" : "light"} />
          </Link>
          <span aria-hidden className="h-5 w-px bg-[var(--border-default)]" />
          <h1 className="min-w-0 truncate text-[14px] font-medium text-[var(--text-primary)]" title={scenario.title}>
            {scenario.title}
          </h1>
          <span className={t.demoBadge} title="Not a candidate assessment. Real assessments run tests in Fydell's isolated runner.">
            Browser preview
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1.5 text-app-marker tabular-nums text-[var(--text-secondary)] md:inline-flex" title="Time since you opened the workspace">
              <Clock aria-hidden size={13} />
              {elapsedText(elapsed)}
            </span>
            <span className="hidden items-center gap-1.5 text-app-meta text-[var(--text-secondary)] xl:inline-flex" title="Your edits are kept in this browser's local storage. Fydell does not store them.">
              <HardDrive aria-hidden size={13} />
              Saved in this browser
            </span>
            <div className="flex items-center gap-0.5">
              <Link
                href={overview.href}
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <ArrowLeft aria-hidden size={14} />
                <span className="hidden lg:inline">{overview.label}</span>
                <span className="lg:hidden">Back</span>
              </Link>
              <SettingsMenu showFontSize />
              {!wide ? (
                <button
                  type="button"
                  onClick={() => setRightOpen(!drawerOpen)}
                  aria-expanded={drawerOpen}
                  aria-controls="demo-team-panel"
                  className={cn(
                    "relative inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                    drawerOpen && "bg-[var(--surface-hover)] text-[var(--text-primary)]",
                  )}
                >
                  <PanelRight aria-hidden size={15} />
                  Team
                  {teamUnread ? (
                    <>
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      <span className="sr-only">, new messages</span>
                    </>
                  ) : null}
                </button>
              ) : null}
            </div>
            <Button size="sm" variant="secondary" onClick={() => void runTests()} loading={running === "public"} disabled={running !== null}>
              {running === "public" ? null : <Play aria-hidden size={13} />}
              {running === "public" ? "Running" : "Run tests"}
            </Button>
            <Button size="sm" variant="primary" onClick={() => setReviewOpen(true)}>
              Review submission
            </Button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          <SidebarRail section={section} open={leftOpen} changeCount={diffs.length} onSelect={toggleLeft} sections={SECTIONS} />
          {leftOpen ? (
            <>
              <div id="demo-left" className="min-h-0 shrink-0 border-r border-[var(--border-default)]" style={{ width: leftWidth }}>
                <div id="sim-sidebar-panel" role="tabpanel" aria-labelledby={`sim-side-tab-${section}`} className="flex h-full min-h-0 flex-col bg-[var(--surface-panel)]">
                  <div className="flex h-9 shrink-0 items-center px-3">
                    <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">{SECTION_LABEL[section]}</h2>
                  </div>
                  {section === "brief" ? (
                    <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">
                      <TaskBrief scenario={scenario} />
                    </div>
                  ) : null}
                  {section === "files" ? (
                    <FileTree
                      paths={rt.candidatePaths}
                      activePath={activeTab?.kind === "file" ? activeTab.path : null}
                      dirtyPaths={NO_PATHS}
                      changes={changeMap}
                      deletable={NO_PATHS}
                      readOnly
                      lockedPaths={locked}
                      onOpen={openFile}
                      onAdd={() => undefined}
                      onDelete={() => undefined}
                    />
                  ) : null}
                  {section === "changes" ? (
                    <div className="sim-scroll min-h-0 flex-1 overflow-y-auto pb-2">
                      <ChangesList diffs={diffs} onOpenDiff={openDiff} />
                    </div>
                  ) : null}
                </div>
              </div>
              <ResizeHandle
                orientation="vertical"
                value={leftWidth}
                min={200}
                max={480}
                direction={1}
                label="Resize sidebar"
                controls="demo-left"
                onChange={setLeftWidth}
                onCommit={(w) => setSimPrefs({ leftWidth: w })}
              />
            </>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Editor">
            <div className="min-h-0 flex-1">
              <EditorArea
                tabs={tabs}
                activeId={activeId}
                files={files}
                starter={starter}
                testFiles={testFiles}
                dirtyPaths={NO_PATHS}
                readOnly={false}
                readOnlyReason={null}
                theme={prefs.theme}
                fontSize={prefs.fontSize}
                reveal={reveal}
                overlay={null}
                onActivate={setActiveId}
                onClose={closeTab}
                onOpenDiff={openDiff}
                onOpenFile={openFile}
                onChange={onEdit}
                onCursor={() => undefined}
                onSave={() => undefined}
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
                controls="demo-bottom"
                onChange={setBottomHeight}
                onCommit={(h) => setSimPrefs({ bottomHeight: h })}
              />
            ) : null}
            <div id="demo-bottom" className="shrink-0" style={{ height: prefs.bottomOpen ? bottomHeight : BOTTOM_COLLAPSED }}>
              <TaskBottomPanel
                scenario={scenario}
                tab={bottomTab}
                open={prefs.bottomOpen}
                run={p.lastRun}
                running={running === "public"}
                onTab={setBottomTab}
                onToggle={() => setSimPrefs({ bottomOpen: !prefs.bottomOpen })}
                onRun={() => void runTests()}
                onSelectTest={selectTest}
              />
            </div>
          </main>

          {wide ? (
            rightOpen ? (
              <>
                <ResizeHandle
                  orientation="vertical"
                  value={rightWidth}
                  min={300}
                  max={560}
                  direction={-1}
                  label="Resize team panel"
                  controls="demo-team-panel"
                  onChange={setRightWidth}
                  onCommit={(w) => setSimPrefs({ rightWidth: w })}
                />
                <aside id="demo-team-panel" aria-label="Team" className="min-h-0 shrink-0 border-l border-[var(--border-default)]" style={{ width: rightWidth }}>
                  {teamDock}
                </aside>
              </>
            ) : (
              <RightRail assistantAvailable={false} teamUnread={teamUnread} onOpen={() => setSimPrefs({ rightOpen: true })} />
            )
          ) : drawerOpen ? (
            <aside
              id="demo-team-panel"
              aria-label="Team"
              className="absolute inset-y-0 right-0 z-40 w-[min(380px,92vw)] border-l border-[var(--border-default)] shadow-[var(--sim-shadow)]"
            >
              {teamDock}
            </aside>
          ) : null}
        </div>
      </div>

      {reviewOpen ? (
        <SubmitDialog
          scenario={scenario}
          diffs={diffs}
          run={p.lastRun}
          handoff={p.handoff}
          teamCount={p.team.filter((m) => m.kind !== "notice").length}
          submitting={submitting}
          error={submitError}
          onHandoff={setHandoff}
          onOpenDiff={(path) => {
            setReviewOpen(false);
            openDiff(path);
          }}
          onSubmit={() => void submit()}
          onClose={() => setReviewOpen(false)}
          consequence={embed?.consequence}
        />
      ) : null}
    </>
  );
}
