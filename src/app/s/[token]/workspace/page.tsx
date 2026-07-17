"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar, { type ConnectionState, type RuntimeStage, type SaveState } from "@/components/relay/TopBar";
import StateRail from "@/components/fde/ui/StateRail";
import LeftNav, { type LeftTab } from "@/components/relay/LeftNav";
import RightNav, { type RightTab } from "@/components/relay/RightNav";
import BriefPanel, { type MissionInfo } from "@/components/relay/BriefPanel";
import FilesPanel from "@/components/relay/FilesPanel";
import EvaluationLab from "@/components/relay/EvaluationLab";
import DeploymentNotesPanel from "@/components/relay/DeploymentNotesPanel";
import HandoffComposer from "@/components/relay/HandoffComposer";
import TerminalPanel from "@/components/relay/TerminalPanel";
import CustomerPanel, { type ChatMessage } from "@/components/relay/CustomerPanel";
import AiWorkspacePanel from "@/components/relay/AiWorkspacePanel";
import EvidenceTrailPanel, { type WorkspaceEvent } from "@/components/relay/EvidenceTrailPanel";
import RecoveryCenter from "@/components/relay/RecoveryCenter";
import type { CommandResult, ExecutionProvider, FileMap } from "@/lib/relay/execution-provider";
import { fetchSession, patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";
import { parseEvalSummary, type EvalMetrics } from "@/lib/relay/eval-summary";
import { computePhaseIndex, PHASE_ORDER } from "@/lib/relay/phase";
import type { PatchProposal } from "@/lib/relay/ai-patch";

type EventRow = WorkspaceEvent & { sequence_number: number };

const HEARTBEAT_MS = 20_000;
const AUTOSAVE_MS = 15_000;

function localKey(sessionId: string) {
  return `relay-session-${sessionId}`;
}

const PHASE_STAGES = PHASE_ORDER.map((p) => ({ key: p.id, label: p.label }));

export default function RelayWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mission, setMission] = useState<MissionInfo>({
    title: "",
    objective: "",
    customerContext: "",
    expectedOutcome: "",
    systemsContext: "",
    technicalEnvironment: "",
    constraints: "",
    securityConsiderations: "",
    successMeasures: "",
  });
  const [canonicalFacts, setCanonicalFacts] = useState<string[]>([]);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [status, setStatus] = useState<string>("active");

  const [files, setFiles] = useState<FileMap>({});
  const [activeFile, setActiveFile] = useState<string>("");
  const [notes, setNotes] = useState<Record<string, string>>({ approach: "", risks: "", testStrategy: "" });
  const [handoff, setHandoff] = useState<Record<string, string>>({ summary: "", recommendation: "", followUps: "" });
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);

  const [terminalOutput, setTerminalOutput] = useState<string>("Workspace loading…");
  const [curveballText, setCurveballText] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runtimeStage, setRuntimeStage] = useState<RuntimeStage>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [connection, setConnection] = useState<ConnectionState>("online");
  const [monacoReady, setMonacoReady] = useState(false);

  const [leftTab, setLeftTab] = useState<LeftTab>("brief");
  const [rightTab, setRightTab] = useState<RightTab>("customer");
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const [evalMetrics, setEvalMetrics] = useState<EvalMetrics | null>(null);
  const [evalLastRunAt, setEvalLastRunAt] = useState<string | null>(null);
  const [evalLastRunOk, setEvalLastRunOk] = useState<boolean | null>(null);

  const providerRef = useRef<ExecutionProvider | null>(null);
  const filesRef = useRef<FileMap>({});
  const curveballTriggeredRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(55 * 60);
  const localEditCountRef = useRef(0);
  const localEvalsRunCountRef = useRef(0);
  const wasCrashedOrErrorRef = useRef(false);

  const eventsToChat = useCallback((rows: EventRow[]): ChatMessage[] => {
    return rows
      .filter((e) => e.event_type === "customer_chat_message")
      .map((e) => ({
        id: e.id,
        actor: e.actor,
        text: String((e.payload as { text?: string })?.text || ""),
        at: e.created_at,
      }));
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
        const data = await fetchSession(resolved.sessionId);
        setStatus(data.session.status);
        setMission({
          title: data.mission?.title || "Mission",
          objective: data.mission?.objective || "",
          customerContext: data.mission?.customer_context || "",
          expectedOutcome: data.mission?.expected_outcome || "",
          systemsContext: data.mission?.systems_context || "",
          technicalEnvironment: data.mission?.technical_environment || "",
          constraints: data.mission?.constraints || "",
          securityConsiderations: data.mission?.security_considerations || "",
          successMeasures: data.mission?.success_measures || "",
        });
        setCanonicalFacts(data.canonicalFacts || []);
        setEndsAt(data.session.ends_at);
        durationRef.current = (data.durationMinutes || 55) * 60;
        startedAtRef.current = data.session.started_at ? new Date(data.session.started_at).getTime() : Date.now();
        setCurveballText(data.curveballText || null);
        curveballTriggeredRef.current = Boolean(data.curveballText);

        const serverState = (data.session.workspace_state || {}) as {
          files?: FileMap;
          plan?: Record<string, string>;
          handoff?: Record<string, string>;
        };

        let localFiles: FileMap | null = null;
        try {
          const raw = window.localStorage.getItem(localKey(resolved.sessionId));
          if (raw) {
            const parsed = JSON.parse(raw) as {
              files?: FileMap;
              plan?: Record<string, string>;
              handoff?: Record<string, string>;
            };
            localFiles = parsed.files || null;
            if (parsed.plan) setNotes((p) => ({ ...p, ...parsed.plan }));
            if (parsed.handoff) setHandoff((h) => ({ ...h, ...parsed.handoff }));
          }
        } catch {
          // ignore corrupt local cache — fall back to server snapshot
        }

        const initialFiles = localFiles || serverState.files || {};
        setFiles(initialFiles);
        filesRef.current = initialFiles;
        setActiveFile(Object.keys(initialFiles).sort()[0] || "");
        if (serverState.plan) setNotes((p) => ({ ...p, ...serverState.plan }));
        if (serverState.handoff) setHandoff((h) => ({ ...h, ...serverState.handoff }));
        const rows = (data.events || []) as EventRow[];
        setEvents(rows);
        setChat(eventsToChat(rows));
        setTerminalOutput("Ready. Try `test`, `evals`, or `preview`.");
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load workspace");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const secs = (new Date(endsAt).getTime() - Date.now()) / 1000;
      setRemaining(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setConnection(navigator.onLine ? "online" : "offline");
    const goOnline = () => setConnection("online");
    const goOffline = () => setConnection("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId || curveballTriggeredRef.current || startedAtRef.current === null) return;
    const totalElapsed = (Date.now() - startedAtRef.current) / 1000;
    if (totalElapsed < durationRef.current * 0.3) return;
    curveballTriggeredRef.current = true;
    (async () => {
      try {
        const result = await patchSession<{ curveballText: string; event?: EventRow }>(sessionId, "curveball");
        setCurveballText(result.curveballText);
        if (result.event) setEvents((prev) => [...prev, result.event as EventRow]);
      } catch {
        curveballTriggeredRef.current = false;
      }
    })();
  }, [remaining, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      try {
        const result = await patchSession<{ expired: boolean; session: { status: string } }>(sessionId, "heartbeat");
        setStatus(result.session.status);
        if (result.expired) {
          setTerminalOutput((t) => `${t}\n\n[Time is up — submit your work now.]`);
        }
      } catch {
        // transient network issue — next heartbeat will retry
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      window.localStorage.setItem(localKey(sessionId), JSON.stringify({ files, plan: notes, handoff }));
      setSaveState((s) => (s === "syncing" ? s : "local"));
    } catch {
      setSaveState("error");
      setError(
        "Browser storage is full or blocked. Local recovery may fail — keep a copy of critical edits and retry after freeing space."
      );
    }
  }, [sessionId, files, notes, handoff]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      setSaveState("syncing");
      patchSession(sessionId, "save", { files, plan: notes, handoff })
        .then(() => setSaveState("synced"))
        .catch(() => setSaveState("error"));
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [sessionId, files, notes, handoff]);

  const recoveryAlert = runtimeStage === "crashed" || saveState === "error";
  useEffect(() => {
    if (recoveryAlert && !wasCrashedOrErrorRef.current) setRecoveryOpen(true);
    wasCrashedOrErrorRef.current = recoveryAlert;
  }, [recoveryAlert]);

  async function ensureProvider(): Promise<ExecutionProvider> {
    if (providerRef.current && runtimeStage === "ready") return providerRef.current;
    setRuntimeStage("booting");
    setTerminalOutput((t) => `${t}\n\n[runtime] Booting Python in the browser…`);
    try {
      const { PyodideExecutionProvider } = await import("@/lib/relay/pyodide-provider");
      const provider = new PyodideExecutionProvider();
      await provider.initializeSession(filesRef.current);
      providerRef.current = provider;
      setRuntimeStage("ready");
      setTerminalOutput((t) => `${t}\n[runtime] Python ready.`);
      return provider;
    } catch (err) {
      setRuntimeStage("crashed");
      providerRef.current = null;
      throw err;
    }
  }

  async function syncProviderFiles(provider: ExecutionProvider) {
    for (const [path, content] of Object.entries(filesRef.current)) {
      await provider.writeFile(path, content);
    }
  }

  async function logEvent(eventType: string, sourceSurface: string, payload: Record<string, unknown>) {
    if (!sessionId) return;
    try {
      const result = await patchSession<{ event: EventRow; reply?: EventRow | null }>(sessionId, "command_event", {
        eventType,
        actor: "candidate",
        sourceSurface,
        payload,
      });
      setEvents((prev) => [...prev, result.event]);
      return result;
    } catch {
      return null;
    }
  }

  async function runCommand(command: "test" | "evals" | "preview") {
    if (!sessionId) return;
    setRunning(true);
    setLeftTab((t) => (command === "evals" ? "evaluations" : t));
    setTerminalOutput(`$ ${command}\n(running…)`);
    try {
      let provider: ExecutionProvider;
      try {
        provider = await ensureProvider();
      } catch (bootErr) {
        setTerminalOutput(
          `$ ${command}\n[runtime crashed] ${bootErr instanceof Error ? bootErr.message : String(bootErr)}\nRetrying with a fresh worker…`
        );
        providerRef.current = null;
        setRuntimeStage("idle");
        provider = await ensureProvider();
      }
      await syncProviderFiles(provider);
      const result: CommandResult = await provider.runCommand(command);
      const combined = `$ ${command}\nexit ${result.exitCode} · ${result.durationMs}ms\n\n${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}`;
      setTerminalOutput(combined);

      if (command === "evals") {
        localEvalsRunCountRef.current += 1;
        const parsed = parseEvalSummary(result.stdout);
        setEvalMetrics(parsed);
        setEvalLastRunAt(new Date().toISOString());
        setEvalLastRunOk(result.ok);
      }

      await logEvent("command_run", "terminal", {
        command,
        ok: result.ok,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      });
    } catch (err) {
      setRuntimeStage("crashed");
      providerRef.current = null;
      setTerminalOutput(`$ ${command}\n[error] ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  async function onFileChange(path: string, content: string) {
    localEditCountRef.current += 1;
    setFiles((f) => ({ ...f, [path]: content }));
    if (providerRef.current) {
      try {
        await providerRef.current.writeFile(path, content);
      } catch {
        providerRef.current = null;
        setRuntimeStage("crashed");
      }
    }
  }

  async function applyAiPatch(proposal: PatchProposal) {
    localEditCountRef.current += 1;
    setFiles((f) => ({ ...f, [proposal.file]: proposal.after }));
    if (providerRef.current) {
      try {
        await providerRef.current.writeFile(proposal.file, proposal.after);
      } catch {
        providerRef.current = null;
        setRuntimeStage("crashed");
      }
    }
    await logEvent("ai_patch_applied", "ai_workspace", {
      file: proposal.file,
      source: proposal.source,
      summary: proposal.summary.slice(0, 300),
    });
  }

  async function sendChat() {
    if (!sessionId || !chatDraft.trim()) return;
    const text = chatDraft.trim();
    setChatDraft("");
    setChat((c) => [...c, { id: `local-${Date.now()}`, actor: "candidate", text, at: new Date().toISOString() }]);
    try {
      const result = await patchSession<{ event: EventRow; reply: EventRow | null }>(sessionId, "command_event", {
        eventType: "customer_chat_message",
        actor: "candidate",
        sourceSurface: "customer_chat",
        payload: { text },
      });
      setEvents((prev) => [...prev, result.event, ...(result.reply ? [result.reply] : [])]);
      if (result.reply) {
        setChat((c) => [
          ...c,
          {
            id: result.reply!.id,
            actor: result.reply!.actor,
            text: String((result.reply!.payload as { text?: string })?.text || ""),
            at: result.reply!.created_at,
          },
        ]);
      }
    } catch (err) {
      setChat((c) => [
        ...c,
        {
          id: `error-${Date.now()}`,
          actor: "system",
          text: `Message failed to send: ${err instanceof Error ? err.message : "unknown error"}`,
          at: new Date().toISOString(),
        },
      ]);
    }
  }

  function restoreLocalSnapshot() {
    if (!sessionId) return;
    try {
      const raw = window.localStorage.getItem(localKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { files?: FileMap; plan?: Record<string, string>; handoff?: Record<string, string> };
      if (parsed.files) {
        setFiles(parsed.files);
        filesRef.current = parsed.files;
      }
      if (parsed.plan) setNotes((p) => ({ ...p, ...parsed.plan }));
      if (parsed.handoff) setHandoff((h) => ({ ...h, ...parsed.handoff }));
    } catch {
      setError("Could not read the local snapshot — it may be corrupted.");
    }
  }

  async function reinitWorker() {
    providerRef.current = null;
    setRuntimeStage("idle");
    try {
      await ensureProvider();
    } catch {
      // ensureProvider already sets runtimeStage to "crashed" on failure
    }
  }

  async function reportTechnicalIssue(description: string) {
    await logEvent("technical_issue_reported", "recovery_center", { description });
  }

  async function submit() {
    if (!sessionId) return;
    if (
      !window.confirm(
        "Submit now? Your workspace files will be frozen for evidence review and can't be edited afterward."
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await patchSession(sessionId, "save", { files, plan: notes, handoff });
      await patchSession(sessionId, "submit", { files, plan: notes, handoff });
      try {
        window.localStorage.removeItem(localKey(sessionId));
      } catch {
        // best effort cleanup
      }
      router.push(`/s/${token}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setSubmitting(false);
    }
  }

  function exitSafely() {
    if (window.confirm("Exit the workspace? Your progress is autosaved, and you can resume from the Action Inbox.")) {
      router.push("/app/fde");
    }
  }

  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const candidateChatCount = useMemo(() => chat.filter((m) => m.actor === "candidate").length, [chat]);
  const notesFilled = useMemo(() => Object.values(notes).some((v) => v.trim().length > 0), [notes]);
  const handoffFilled = useMemo(() => Object.values(handoff).some((v) => v.trim().length > 0), [handoff]);
  const phaseIndex = computePhaseIndex({
    started: true,
    chatMessageCount: candidateChatCount,
    planFilled: notesFilled,
    editCount: localEditCountRef.current,
    evalsRunCount: localEvalsRunCountRef.current,
    curveballRevealed: Boolean(curveballText),
    handoffFilled,
  });

  const timeUp = remaining <= 0;
  void status;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050609] text-white/60">Loading workspace…</div>
    );
  }
  if (error && !sessionId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050609] px-6 text-center text-[#fda4b0]">
        {error}
      </div>
    );
  }

  const columnHeight = "min-h-[calc(100dvh-104px)]";

  return (
    <div className="min-h-[100dvh] bg-[#07080B] text-[#F4F5F7]">
      <TopBar
        missionTitle={mission.title}
        connection={connection}
        saveState={saveState}
        runtimeStage={runtimeStage}
        editorReady={monacoReady}
        remainingSeconds={remaining}
        submitting={submitting}
        onExit={exitSafely}
        onOpenRecovery={() => setRecoveryOpen(true)}
        recoveryAlert={recoveryAlert}
        onSubmit={submit}
      />

      <div className="flex items-center justify-between gap-4 overflow-x-auto border-b border-white/[0.06] bg-[#08090D] px-4 py-2.5 sm:px-6">
        <StateRail currentIndex={phaseIndex} stages={PHASE_STAGES} />
      </div>

      {curveballText && (
        <div className="border-b border-[#3B5BFF]/30 bg-[#3B5BFF]/10 px-4 py-2.5 text-[13px] text-[#c4cdff] sm:px-6">
          <strong className="font-semibold">Mid-session change: </strong>
          {curveballText}
        </div>
      )}
      {error && (
        <div className="border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">{error}</div>
      )}
      {timeUp && (
        <div className="border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">
          Time is up — submit your work now.
        </div>
      )}

      <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[220px_1fr_360px]">
        <div className={`${columnHeight} bg-[#0A0C11]`}>
          <LeftNav active={leftTab} onChange={setLeftTab} />
        </div>

        <div className={`flex ${columnHeight} flex-col bg-[#0A0C11]`}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {leftTab === "brief" && (
              <BriefPanel mission={mission} canonicalFacts={canonicalFacts} variant="brief" />
            )}
            {leftTab === "requirements" && (
              <BriefPanel mission={mission} canonicalFacts={canonicalFacts} variant="requirements" />
            )}
            {leftTab === "evaluations" && (
              <EvaluationLab
                metrics={evalMetrics}
                lastRunAt={evalLastRunAt}
                lastRunOk={evalLastRunOk}
                onRunEvals={() => runCommand("evals")}
                running={running}
              />
            )}
            {leftTab === "deployment_notes" && (
              <DeploymentNotesPanel notes={notes} onChange={(key, value) => setNotes((p) => ({ ...p, [key]: value }))} />
            )}
            {leftTab === "handoff" && (
              <HandoffComposer handoff={handoff} onChange={(key, value) => setHandoff((h) => ({ ...h, [key]: value }))} />
            )}
            {leftTab === "files" && (
              <FilesPanel
                filePaths={filePaths}
                activeFile={activeFile}
                content={files[activeFile] || ""}
                onSelectFile={setActiveFile}
                onChange={(value) => onFileChange(activeFile, value)}
                onMount={() => setMonacoReady(true)}
              />
            )}
          </div>
          <TerminalPanel onRun={runCommand} running={running} output={terminalOutput} />
        </div>

        <div className={`flex ${columnHeight} flex-col bg-[#0A0C11]`}>
          <RightNav active={rightTab} onChange={setRightTab} />
          <div className="min-h-0 flex-1">
            {rightTab === "customer" && (
              <CustomerPanel
                customerContext={mission.customerContext}
                canonicalFacts={canonicalFacts}
                chat={chat}
                chatDraft={chatDraft}
                onChatDraftChange={setChatDraft}
                onSend={sendChat}
              />
            )}
            {rightTab === "ai" && (
              <AiWorkspacePanel
                activeFile={activeFile}
                activeFileContent={files[activeFile] || ""}
                onApply={applyAiPatch}
              />
            )}
            {rightTab === "evidence" && <EvidenceTrailPanel events={events} />}
            {rightTab === "requirements" && (
              <div className="h-full overflow-y-auto">
                <BriefPanel mission={mission} canonicalFacts={canonicalFacts} variant="requirements" />
              </div>
            )}
          </div>
        </div>
      </div>

      <RecoveryCenter
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onRestoreSnapshot={restoreLocalSnapshot}
        onReinitWorker={reinitWorker}
        onReportIssue={reportTechnicalIssue}
        runtimeCrashed={runtimeStage === "crashed"}
        storageError={saveState === "error"}
      />
    </div>
  );
}
