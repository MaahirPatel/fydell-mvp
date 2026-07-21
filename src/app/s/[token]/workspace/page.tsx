"use client";

/**
 * Project Relay — event-sourced IDE workspace.
 * UI mutates state ONLY via dispatchCommand → server reducer → reconciled state.
 * No disconnected setEditorText / mock preview / checkbox scoring.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import MonacoEditor from "@/components/relay/MonacoEditor";
import DataTableView from "@/components/relay/DataTableView";
import ShipGateModal, { type ShipFields } from "@/components/relay/ShipGateModal";
import AiWorkspacePanel from "@/components/relay/AiWorkspacePanel";
import type { ExecutionProvider } from "@/lib/relay/execution-provider";
import { fetchSession, patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";
import {
  dispatchCommand,
  fetchEngine,
  filesForRuntime,
  reportRuntimeResult,
  saveLabel,
} from "@/lib/relay/workspace/client-store";
import { missionProgress } from "@/lib/relay/workspace/requirements";
import type { WorkspaceEngineState } from "@/lib/relay/workspace/types";
import { cn } from "@/lib/cn";
import type { PatchProposal } from "@/lib/relay/ai-patch";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type RailId = "mission" | "messages" | "files" | "search" | "history";

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function buildTree(paths: string[]): { dir: string; files: string[] }[] {
  const map = new Map<string, string[]>();
  for (const p of paths.sort()) {
    const i = p.lastIndexOf("/");
    const dir = i < 0 ? "." : p.slice(0, i);
    const name = i < 0 ? p : p.slice(i + 1);
    if (!map.has(dir)) map.set(dir, []);
    map.get(dir)!.push(name);
  }
  return [...map.entries()].map(([dir, files]) => ({ dir, files }));
}

export default function RelayWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<WorkspaceEngineState | null>(null);
  const [ackHead, setAckHead] = useState(0);
  const [candidateFacts, setCandidateFacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [rail, setRail] = useState<RailId>("files");
  const [bottomTab, setBottomTab] = useState<"terminal" | "tests" | "problems" | "output">("terminal");
  const [terminalCmd, setTerminalCmd] = useState("");
  const [terminalLog, setTerminalLog] = useState("Workspace engine ready.\n");
  const [running, setRunning] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [shipOpen, setShipOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localEdit, setLocalEdit] = useState<string | null>(null);
  const [dirtyPath, setDirtyPath] = useState<string | null>(null);
  const [curveballText, setCurveballText] = useState<string | null>(null);

  const providerRef = useRef<ExecutionProvider | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const syncEngine = useCallback(async (sid: string) => {
    const data = await fetchEngine(sid);
    setState(data.state);
    setAckHead(data.acknowledgedHeadVersion);
    setCandidateFacts(data.candidateFacts);
    setSaveFailed(false);
    return data.state;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resolved = await resolveSessionByToken(token);
        const stage = stageForStatus(resolved.status);
        if (stage === "consent") return router.replace(`/s/${token}/consent`);
        if (stage === "preflight") return router.replace(`/s/${token}/preflight`);
        if (stage === "submitted") return router.replace(`/s/${token}/submitted`);

        setSessionId(resolved.sessionId);
        const sess = await fetchSession(resolved.sessionId);
        setEndsAt(sess.session.ends_at);
        setCurveballText(sess.curveballText || null);
        await syncEngine(resolved.sessionId);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load workspace");
        setLoading(false);
      }
    })();
  }, [token, router, syncEngine]);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setRemaining((new Date(endsAt).getTime() - Date.now()) / 1000);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  // Curveball trigger via legacy session API, then store text in UI (ack via engine)
  useEffect(() => {
    if (!sessionId || curveballText) return;
    const id = setInterval(async () => {
      try {
        const sess = await fetchSession(sessionId);
        if (sess.curveballText) setCurveballText(sess.curveballText);
        else if (sess.session.started_at) {
          const elapsed = (Date.now() - new Date(sess.session.started_at).getTime()) / 1000;
          const dur = (sess.durationMinutes || 55) * 60;
          if (elapsed >= dur * 0.3) {
            const r = await patchSession<{ curveballText: string }>(sessionId, "curveball");
            if (r.curveballText) setCurveballText(r.curveballText);
          }
        }
      } catch {
        /* ignore */
      }
    }, 20_000);
    return () => clearInterval(id);
  }, [sessionId, curveballText]);

  async function runDispatch(
    type: Parameters<typeof dispatchCommand>[1],
    payload: Record<string, unknown>
  ) {
    if (!sessionId || !stateRef.current) return null;
    const expected = stateRef.current.headVersion;
    setSaveFailed(false);
    const result = await dispatchCommand(sessionId, type, expected, payload);
    if (result.ok === false) {
      setSaveFailed(true);
      if (result.state) {
        setState(result.state);
        setAckHead(result.state.headVersion);
      }
      setError(result.error || "Command failed");
      return null;
    }
    setState(result.state);
    setAckHead(result.acknowledgedHeadVersion);
    setLocalEdit(null);
    setDirtyPath(null);
    return result.state;
  }

  function scheduleFileSave(path: string, content: string, baseVersion: number) {
    setLocalEdit(content);
    setDirtyPath(path);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runDispatch("EDIT_FILE", { path, content, baseVersion });
    }, 500);
  }

  async function flushSave() {
    if (!dirtyPath || localEdit == null || !state) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const baseVersion = state.artifacts[dirtyPath]?.version ?? 1;
    await runDispatch("EDIT_FILE", { path: dirtyPath, content: localEdit, baseVersion });
  }

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") void flushSave();
    };
    window.addEventListener("beforeunload", () => void flushSave());
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyPath, localEdit, state?.headVersion]);

  async function openArtifact(path: string) {
    await flushSave();
    await runDispatch("OPEN_ARTIFACT", { path });
    setRail("files");
  }

  async function ensureProvider(files: Record<string, string>) {
    if (providerRef.current) {
      for (const [p, c] of Object.entries(files)) await providerRef.current.writeFile(p, c);
      return providerRef.current;
    }
    const { PyodideExecutionProvider } = await import("@/lib/relay/pyodide-provider");
    const p = new PyodideExecutionProvider();
    await p.initializeSession(files);
    providerRef.current = p;
    return p;
  }

  async function runTerminal(command: string) {
    if (!sessionId || !state || running) return;
    await flushSave();
    const head = stateRef.current!;
    setRunning(true);
    setBottomTab("terminal");
    setTerminalLog((t) => `${t}\n$ ${command}\n`);
    await runDispatch("RUN_COMMAND", { command });
    try {
      const files = filesForRuntime(head);
      const provider = await ensureProvider(files);
      for (const [p, c] of Object.entries(filesForRuntime(stateRef.current!))) {
        await provider.writeFile(p, c);
      }
      const result = await provider.runCommand(command);
      setTerminalLog(
        (t) =>
          `${t}${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}\nexit ${result.exitCode}\n`
      );
      const applied = await reportRuntimeResult(sessionId, {
        command,
        ok: result.ok,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        workspaceVersion: head.headVersion,
      });
      if (applied.ok) {
        setState(applied.state);
        setAckHead(applied.acknowledgedHeadVersion);
      }
    } catch (err) {
      setTerminalLog((t) => `${t}[error] ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      setRunning(false);
      setTerminalCmd("");
    }
  }

  async function sendChat() {
    const text = chatDraft.trim();
    if (!text) return;
    setChatDraft("");
    await runDispatch("SEND_STAKEHOLDER_MESSAGE", { text });
  }

  async function acceptAi(proposal: PatchProposal) {
    if (!state) return;
    const art = state.artifacts[proposal.file];
    if (!art) return;
    await runDispatch("ACCEPT_AI_PATCH", {
      path: proposal.file,
      content: proposal.after,
      baseVersion: art.version,
    });
  }

  async function submitHandoff(fields: ShipFields) {
    if (!sessionId || !state) return;
    setSubmitting(true);
    try {
      await flushSave();
      await runDispatch("SAVE_HANDOFF", {
        whatChanged: fields.whatBuilt,
        evidence: fields.verification,
        limitations: fields.limitations,
        clientMessage: fields.clientMessage,
      });
      const latest = stateRef.current!;
      if (latest.headVersion !== ackHead && latest.headVersion > ackHead) {
        // wait for ack
      }
      const sub = await runDispatch("SUBMIT_SESSION", {});
      if (!sub) throw new Error("Submit blocked — sync first");
      await patchSession(sessionId, "submit", {
        files: filesForRuntime(sub),
        handoff: {
          whatBuilt: fields.whatBuilt,
          verification: fields.verification,
          limitations: fields.limitations,
          clientMessage: fields.clientMessage,
        },
      });
      router.push(`/s/${token}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
      setSubmitting(false);
    }
  }

  const saveUi = saveLabel(
    state?.headVersion ?? 0,
    ackHead,
    saveFailed,
    offline
  );

  const activePath = state?.activePath;
  const activeArt = activePath ? state?.artifacts[activePath] : null;
  const editorContent =
    dirtyPath === activePath && localEdit != null ? localEdit : activeArt?.content ?? "";

  const tree = useMemo(
    () => buildTree(Object.keys(state?.artifacts || {}).filter((p) => !p.startsWith("outputs/") || true)),
    [state?.artifacts]
  );

  const progress = state ? missionProgress(state.requirements) : 0;
  const problems = useMemo(() => {
    const lines = terminalLog.split("\n").filter((l) => /FAIL|error|stderr/i.test(l));
    return lines.slice(-12);
  }, [terminalLog]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#080A0F] text-[#9AA3B2]">
        Loading workspace engine…
      </div>
    );
  }
  if (error && !state) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#080A0F] px-6 text-[#fda4b0]">
        {error}
      </div>
    );
  }
  if (!state) return null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#080A0F] text-[#F4F5F7]">
      {/* TOP CHROME */}
      <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0B0E14] px-3">
        <div className="flex min-w-0 items-center gap-3">
          <FydellBrand markSize={20} wordmarkSize={14} />
          <span className="hidden text-[12.5px] text-[#9AA3B2] sm:inline">Project Relay</span>
          <span className="hidden text-white/20 sm:inline">/</span>
          <span className="truncate text-[12.5px] text-[#F4F5F7]">{state.companyName}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-[12px] text-[#9AA3B2] md:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-[#F26B82]" : "bg-[#67d9a0]"}`} />
            {offline ? "Offline" : "Live"}
          </span>
          <button
            type="button"
            onClick={() => void (saveFailed ? syncEngine(sessionId!) : flushSave())}
            className={cn(
              "text-[12px]",
              saveUi.state === "failed" ? "text-[#fda4b0] underline" : "text-[#687182]"
            )}
          >
            {saveUi.label}
            {state.headVersion > 0 ? ` · v${state.headVersion}` : ""}
          </button>
          <span className="tabular-nums text-[12.5px] text-[#F4F5F7]" style={{ fontFamily: MONO }}>
            {formatClock(remaining)}
          </span>
          <button
            type="button"
            onClick={() => {
              if (confirm("Exit safely? Progress is persisted on the server.")) router.push("/app/fde");
            }}
            className="h-8 rounded-[8px] border border-white/[0.14] px-2.5 text-[12px] text-[#9AA3B2]"
          >
            Exit safely
          </button>
          <button
            type="button"
            onClick={async () => {
              await flushSave();
              if (state.headVersion > ackHead) {
                setError("Your latest changes are still syncing. Wait or retry before submitting.");
                return;
              }
              setShipOpen(true);
            }}
            className="h-8 rounded-[8px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C]"
          >
            Review handoff
          </button>
        </div>
      </header>

      {curveballText && !state.curveballAcked && (
        <div className="flex shrink-0 items-center gap-3 border-b border-[#6470FF]/30 bg-[#6470FF]/[0.1] px-3 py-2 text-[12.5px] text-[#D5DBFF]">
          <span className="min-w-0 flex-1">
            <strong className="text-white">New constraint · </strong>
            {curveballText}
          </span>
          <button
            type="button"
            className="shrink-0 text-[#B8C4FF] underline"
            onClick={() =>
              void runDispatch("ACKNOWLEDGE_CURVEBALL", { text: curveballText }).then(() =>
                setState((s) => (s ? { ...s, curveballText, curveballAcked: true } : s))
              )
            }
          >
            Acknowledge
          </button>
        </div>
      )}

      {error && (
        <div className="shrink-0 border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-3 py-1.5 text-[12.5px] text-[#fda4b0]">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ICON RAIL */}
        <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-white/[0.08] bg-[#0B0E14] py-2">
          {(
            [
              ["mission", "Mission"],
              ["messages", "Msgs"],
              ["files", "Files"],
              ["search", "Search"],
              ["history", "Hist"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRail(id)}
              className={cn(
                "flex h-10 w-10 flex-col items-center justify-center rounded-[8px] text-[9px] font-medium",
                rail === id ? "bg-[#6470FF]/20 text-white" : "text-[#687182] hover:bg-white/[0.04]"
              )}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* PROJECT SIDEBAR */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[0.08] bg-[#10141D] md:flex">
          <div className="border-b border-white/[0.06] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
            Project Relay
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {rail === "search" ? (
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search files…"
                className="mb-2 w-full rounded-[7px] border border-white/10 bg-[#0B0E14] px-2 py-1.5 text-[12px]"
              />
            ) : null}
            {rail === "messages" ? (
              <div className="space-y-2 p-1">
                <p className="text-[11px] text-[#687182]">CLIENT</p>
                <button type="button" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[12.5px] hover:bg-white/[0.04]" onClick={() => setRail("messages")}>
                  Dana Whitfield
                </button>
                <button type="button" className="block w-full rounded-[6px] px-2 py-1.5 text-left text-[12.5px] hover:bg-white/[0.04]">
                  Priya Anand
                </button>
              </div>
            ) : (
              tree
                .filter(({ dir, files }) =>
                  !searchQ ||
                  files.some((f) => `${dir}/${f}`.toLowerCase().includes(searchQ.toLowerCase()))
                )
                .map(({ dir, files }) => (
                  <div key={dir} className="mb-2">
                    <p className="px-1 text-[10.5px] font-medium uppercase tracking-[0.05em] text-[#687182]">
                      {dir === "." ? "root" : dir}
                    </p>
                    {files.map((name) => {
                      const path = dir === "." ? name : `${dir}/${name}`;
                      const art = state.artifacts[path];
                      return (
                        <button
                          key={path}
                          type="button"
                          onClick={() => void openArtifact(path)}
                          className={cn(
                            "flex w-full items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-left text-[12px]",
                            activePath === path ? "bg-white/[0.08] text-white" : "text-[#9AA3B2] hover:bg-white/[0.04]"
                          )}
                          style={{ fontFamily: MONO }}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              art?.status === "stale"
                                ? "bg-[#F2C36B]"
                                : art?.status === "modified" || dirtyPath === path
                                  ? "bg-[#6470FF]"
                                  : "bg-transparent"
                            )}
                          />
                          {name}
                        </button>
                      );
                    })}
                  </div>
                ))
            )}
          </div>
        </aside>

        {/* CENTER + BOTTOM */}
        <main className="flex min-w-0 flex-1 flex-col bg-[#0B0E14]">
          <div className="flex gap-1 border-b border-white/[0.06] px-2 py-1.5 overflow-x-auto">
            {state.openTabs.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => void openArtifact(path)}
                className={cn(
                  "shrink-0 rounded-[6px] px-2.5 py-1 text-[12px]",
                  activePath === path ? "bg-white/[0.08] text-white" : "text-[#687182]"
                )}
              >
                {path.split("/").pop()}
                {dirtyPath === path ? " ·" : ""}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {!activeArt ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-[16px] font-medium text-[#F4F5F7]">Start here</p>
                <p className="max-w-[42ch] text-[13px] text-[#9AA3B2]">
                  Open <button type="button" className="text-[#B8C4FF] underline" onClick={() => void openArtifact("docs/customer-brief.md")}>customer_brief.md</button>{" "}
                  then inspect the CSVs under data/. Every edit versions the workspace and invalidates downstream outputs.
                </p>
              </div>
            ) : activeArt.kind === "data" ? (
              <DataTableView
                content={editorContent}
                path={activeArt.path}
                onCellEdit={(row, col, newValue) => {
                  void runDispatch("EDIT_DATASET_CELL", {
                    path: activeArt.path,
                    row,
                    col,
                    newValue,
                    baseVersion: activeArt.version,
                  });
                }}
              />
            ) : activeArt.path.startsWith("outputs/") || activePath === "outputs/daily_delay_view.csv" ? (
              <pre className="h-full overflow-auto p-4 text-[12.5px] text-[#9AA3B2]" style={{ fontFamily: MONO }}>
                {state.preview.status === "stale" && (
                  <div className="mb-3 text-[#F2C36B]">Preview stale — re-run preview against current workspace v{state.headVersion}</div>
                )}
                {state.preview.content || editorContent || "No preview generated yet. Run preview in the terminal."}
              </pre>
            ) : (
              <MonacoEditor
                path={activeArt.path}
                value={editorContent}
                onChange={(v) => scheduleFileSave(activeArt.path, v, activeArt.version)}
                height="100%"
              />
            )}
          </div>

          {/* BOTTOM PANEL */}
          <div className="flex h-[240px] shrink-0 flex-col border-t border-white/[0.08]">
            <div className="flex gap-1 border-b border-white/[0.06] px-2 py-1">
              {(["terminal", "tests", "problems", "output"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBottomTab(t)}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-[11.5px] capitalize",
                    bottomTab === t ? "bg-white/[0.08] text-white" : "text-[#687182]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-3 py-2 text-[12px]" style={{ fontFamily: MONO }}>
              {bottomTab === "terminal" && (
                <pre className="whitespace-pre-wrap text-[#9CE5B0]">{terminalLog}</pre>
              )}
              {bottomTab === "tests" && (
                <ul className="space-y-2 text-[#9AA3B2]">
                  {state.tests.map((t) => (
                    <li key={t.id}>
                      <span
                        className={
                          t.status === "PASS"
                            ? "text-[#67d9a0]"
                            : t.status === "FAIL"
                              ? "text-[#fda4b0]"
                              : t.status === "STALE"
                                ? "text-[#F2C36B]"
                                : ""
                        }
                      >
                        [{t.status}]
                      </span>{" "}
                      {t.label}
                      {t.workspaceVersion != null
                        ? ` · ran on v${t.workspaceVersion}${
                            t.workspaceVersion !== state.headVersion ? " (not current)" : ""
                          }`
                        : ""}
                    </li>
                  ))}
                  <li className="pt-2">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => void runTerminal("test")}
                      className="rounded-[6px] bg-[#F1F2F4] px-2.5 py-1 text-[11.5px] font-semibold text-[#08090C] disabled:opacity-50"
                    >
                      Run visible tests
                    </button>
                  </li>
                </ul>
              )}
              {bottomTab === "problems" && (
                <ul className="space-y-1 text-[#fda4b0]">
                  {problems.length === 0 ? (
                    <li className="text-[#687182]">No problems in latest output.</li>
                  ) : (
                    problems.map((p, i) => <li key={i}>{p}</li>)
                  )}
                </ul>
              )}
              {bottomTab === "output" && (
                <pre className="whitespace-pre-wrap text-[#9AA3B2]">
                  {state.lastRuntime
                    ? `v${state.lastRuntime.workspaceVersion} · ${state.lastRuntime.command} · exit ${state.lastRuntime.exitCode}\n${state.lastRuntime.stdout}`
                    : "No runs yet."}
                  {state.lastRuntime &&
                    state.lastRuntime.workspaceVersion !== state.headVersion &&
                    `\n\nCompleted against workspace v${state.lastRuntime.workspaceVersion} · current is v${state.headVersion}`}
                </pre>
              )}
            </div>
            {bottomTab === "terminal" && (
              <form
                className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runTerminal(terminalCmd);
                }}
              >
                <span className="text-[#6470FF]">$</span>
                <input
                  value={terminalCmd}
                  onChange={(e) => setTerminalCmd(e.target.value)}
                  disabled={running}
                  placeholder="test | preview | reconcile | ls | help"
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
                  style={{ fontFamily: MONO }}
                />
                <button type="submit" disabled={running || !terminalCmd.trim()} className="text-[12px] text-[#B8C4FF] disabled:opacity-40">
                  Run
                </button>
              </form>
            )}
          </div>
        </main>

        {/* RIGHT CONTEXT */}
        <aside className="hidden w-[320px] shrink-0 flex-col border-l border-white/[0.08] bg-[#10141D] lg:flex">
          <div className="border-b border-white/[0.06] px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
              Current objective
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#F4F5F7]">
              Find why the delay report understates late shipments, fix the pipeline, and give Dana a
              reliable daily view.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full bg-[#6470FF]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>

          <div className="border-b border-white/[0.06] px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
              Requirements
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px]">
              {state.requirements.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <span
                    className={
                      r.status === "SATISFIED"
                        ? "text-[#67d9a0]"
                        : r.status === "REGRESSED"
                          ? "text-[#F2C36B]"
                          : "text-[#687182]"
                    }
                  >
                    {r.status === "SATISFIED" ? "✓" : r.status === "REGRESSED" ? "!" : "○"}
                  </span>
                  <span className="text-[#9AA3B2]">{r.description}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-[#687182]">
              Status from verification predicates — not checkboxes.
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-b border-white/[0.06]">
            <p className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
              Client thread
            </p>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3">
              {state.messages.length === 0 && (
                <p className="text-[12px] text-[#687182]">No messages yet. Ask Dana what she needs daily.</p>
              )}
              {state.messages.map((m) => (
                <div key={m.id} className="text-[12px]">
                  <p className="font-medium text-[#F4F5F7]">
                    {m.authorName}{" "}
                    <span className="font-normal text-[#687182]">{m.authorRole}</span>
                  </p>
                  <p className="mt-0.5 text-[#9AA3B2]">{m.text}</p>
                </div>
              ))}
            </div>
            <form
              className="flex gap-1 border-t border-white/[0.06] p-2"
              onSubmit={(e) => {
                e.preventDefault();
                void sendChat();
              }}
            >
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Message Northbeam…"
                className="min-w-0 flex-1 rounded-[7px] border border-white/10 bg-[#0B0E14] px-2 py-1.5 text-[12px]"
              />
              <button type="submit" className="rounded-[7px] bg-[#6470FF] px-2.5 text-[12px] text-white">
                Send
              </button>
            </form>
          </div>

          <div className="max-h-[220px] overflow-y-auto border-b border-white/[0.06] px-2 py-2">
            <p className="px-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
              AI copilot · activity recorded
            </p>
            <AiWorkspacePanel
              activeFile={activePath || ""}
              activeFileContent={editorContent}
              onApply={(p) => void acceptAi(p)}
            />
          </div>

          <div className="px-3 py-2 text-[11px] text-[#687182]">
            <p className="font-medium text-[#9AA3B2]">Known context</p>
            <ul className="mt-1 space-y-1">
              {candidateFacts.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <ShipGateModal
        open={shipOpen}
        initial={{
          whatBuilt: state.handoff.whatChanged,
          verification: state.handoff.evidence,
          limitations: state.handoff.limitations,
          clientMessage: state.handoff.clientMessage,
        }}
        submitting={submitting}
        onClose={() => setShipOpen(false)}
        onShip={submitHandoff}
        readiness={{
          fileCount: Object.keys(state.artifacts).length,
          testsLastRunAt: state.tests.find((t) => t.id === "visible_suite")?.workspaceVersion
            ? new Date().toISOString()
            : null,
          testsOk: state.tests.find((t) => t.id === "visible_suite")?.status === "PASS",
          curveballAck: state.curveballAcked || !curveballText,
        }}
      />
    </div>
  );
}
