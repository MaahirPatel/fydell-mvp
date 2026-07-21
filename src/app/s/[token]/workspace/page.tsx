"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import TopBar, { type ConnectionState, type RuntimeStage, type SaveState } from "@/components/relay/TopBar";
import PhaseRail from "@/components/relay/PhaseRail";
import ContextPanel, { type ContextTab } from "@/components/relay/ContextPanel";
import WorkbenchPanel, { type WorkbenchTab } from "@/components/relay/WorkbenchPanel";
import MissionPanel, { type MissionNavTarget } from "@/components/relay/MissionPanel";
import CurveballBanner from "@/components/relay/CurveballBanner";
import ShipGateModal, { type ShipFields } from "@/components/relay/ShipGateModal";
import RecoveryCenter from "@/components/relay/RecoveryCenter";
import type { MissionInfo } from "@/components/relay/BriefPanel";
import { DEFAULT_CHECKLIST, type WorkingNotesState } from "@/components/relay/WorkingNotes";
import type { ChatMessage } from "@/components/relay/ClientInbox";
import {
  buildChannelSeed,
  buildCurveballSeed,
  inboxMeta,
  speakerForActor,
} from "@/lib/relay/inbox-seed";
import type { CommandResult, ExecutionProvider, FileMap } from "@/lib/relay/execution-provider";
import { fetchSession, patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";
import { parseEvalSummary, type EvalMetrics } from "@/lib/relay/eval-summary";
import { computeStageIndex, type RelayStage } from "@/lib/relay/phase";
import type { PatchProposal } from "@/lib/relay/ai-patch";

type EventRow = {
  id: string;
  session_id: string;
  sequence_number: number;
  actor: string;
  event_type: string;
  source_surface: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type MobileZone = "context" | "workbench" | "mission";

const HEARTBEAT_MS = 20_000;
const AUTOSAVE_MS = 15_000;

const EMPTY_SHIP_FIELDS: ShipFields = {
  whatBuilt: "",
  verification: "",
  limitations: "",
  clientMessage: "",
};
const EMPTY_NOTES: WorkingNotesState = {
  knowledge: "",
  unknowns: "",
  risks: "",
  checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
};

function localKey(sessionId: string) {
  return `relay-session-${sessionId}`;
}

function normalizeHandoff(raw?: Partial<ShipFields> | null): ShipFields {
  return {
    whatBuilt: raw?.whatBuilt || "",
    verification: raw?.verification || "",
    limitations: raw?.limitations || "",
    clientMessage: raw?.clientMessage || "",
  };
}

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
  const [notes, setNotes] = useState<WorkingNotesState>(EMPTY_NOTES);
  const [handoff, setHandoff] = useState<ShipFields>(EMPTY_SHIP_FIELDS);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [curveballKey, setCurveballKey] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const [terminalOutput, setTerminalOutput] = useState<string>("Workspace loading…");
  const [previewOutput, setPreviewOutput] = useState<string | null>(null);
  const [curveballText, setCurveballText] = useState<string | null>(null);
  const [curveballAck, setCurveballAck] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runtimeStage, setRuntimeStage] = useState<RuntimeStage>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [connection, setConnection] = useState<ConnectionState>("online");
  const [monacoReady, setMonacoReady] = useState(false);

  const [contextTab, setContextTab] = useState<ContextTab>("brief");
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTab>("data");
  const [focusStage, setFocusStage] = useState<RelayStage | null>(null);
  const [mobileZone, setMobileZone] = useState<MobileZone>("workbench");
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [shipGateOpen, setShipGateOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  const [editCount, setEditCount] = useState(0);
  const [verifyRunCount, setVerifyRunCount] = useState(0);
  const [inspectedData, setInspectedData] = useState(false);
  const [openedBriefOrChat, setOpenedBriefOrChat] = useState(true);

  const [evalMetrics, setEvalMetrics] = useState<EvalMetrics | null>(null);
  const [evalLastRunAt, setEvalLastRunAt] = useState<string | null>(null);
  const [evalLastRunOk, setEvalLastRunOk] = useState<boolean | null>(null);

  const providerRef = useRef<ExecutionProvider | null>(null);
  const filesRef = useRef<FileMap>({});
  const curveballTriggeredRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(55 * 60);
  const wasCrashedOrErrorRef = useRef(false);

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
        startedAtRef.current = data.session.started_at
          ? new Date(data.session.started_at).getTime()
          : Date.now();
        setCurveballText(data.curveballText || null);
        setCurveballKey(data.session.curveball_key || null);
        curveballTriggeredRef.current = Boolean(data.curveballText);

        const serverState = (data.session.workspace_state || {}) as {
          files?: FileMap;
          handoff?: Partial<ShipFields> & Record<string, string>;
          notes?: Partial<WorkingNotesState>;
        };

        let localFiles: FileMap | null = null;
        try {
          const raw = window.localStorage.getItem(localKey(resolved.sessionId));
          if (raw) {
            const parsed = JSON.parse(raw) as {
              files?: FileMap;
              handoff?: Partial<ShipFields>;
              notes?: Partial<WorkingNotesState>;
            };
            localFiles = parsed.files || null;
            if (parsed.handoff) setHandoff((h) => ({ ...h, ...normalizeHandoff(parsed.handoff) }));
            if (parsed.notes) {
              setNotes((n) => ({
                ...n,
                ...parsed.notes,
                checklist: parsed.notes?.checklist?.length
                  ? parsed.notes.checklist
                  : n.checklist,
              }));
            }
          }
        } catch {
          // ignore corrupt local cache
        }

        const initialFiles = localFiles || serverState.files || {};
        setFiles(initialFiles);
        filesRef.current = initialFiles;
        const firstCsv =
          Object.keys(initialFiles)
            .sort()
            .find((p) => p.endsWith(".csv")) || Object.keys(initialFiles).sort()[0] || "";
        setActiveFile(firstCsv);
        if (serverState.handoff) setHandoff(normalizeHandoff(serverState.handoff));
        if (serverState.notes) {
          setNotes((n) => ({
            ...n,
            ...serverState.notes,
            checklist: serverState.notes?.checklist?.length
              ? serverState.notes.checklist
              : n.checklist,
          }));
        }
        setEvents((data.events || []) as EventRow[]);
        setTerminalOutput("Ready. Commands: test · evals · preview · reconcile · ls · help");
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
    const tick = () => setRemaining((new Date(endsAt).getTime() - Date.now()) / 1000);
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
        const result = await patchSession<{ curveballText: string; event?: EventRow }>(
          sessionId,
          "curveball"
        );
        setCurveballText(result.curveballText);
        if (result.event) setEvents((prev) => [...prev, result.event as EventRow]);
        setUnreadChat((n) => n + 1);
      } catch {
        curveballTriggeredRef.current = false;
      }
    })();
  }, [remaining, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      try {
        const result = await patchSession<{ expired: boolean; session: { status: string } }>(
          sessionId,
          "heartbeat"
        );
        setStatus(result.session.status);
        if (result.expired) {
          setTerminalOutput((t) => `${t}\n\n[Time is up — review & submit your work now.]`);
        }
      } catch {
        // retry next beat
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
      window.localStorage.setItem(localKey(sessionId), JSON.stringify({ files, handoff, notes }));
      setSaveState((s) => (s === "syncing" ? s : "local"));
    } catch {
      setSaveState("error");
      setError("Browser storage is full or blocked. Local recovery may fail.");
    }
  }, [sessionId, files, handoff, notes]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      setSaveState("syncing");
      patchSession(sessionId, "save", { files, handoff, notes })
        .then(() => setSaveState("synced"))
        .catch(() => setSaveState("error"));
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [sessionId, files, handoff, notes]);

  useEffect(() => {
    const flush = () => {
      if (!sessionId) return;
      try {
        window.localStorage.setItem(localKey(sessionId), JSON.stringify({ files, handoff, notes }));
      } catch {
        /* ignore */
      }
      void patchSession(sessionId, "save", { files, handoff, notes }).catch(() => undefined);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sessionId, files, handoff, notes]);

  const recoveryAlert = runtimeStage === "crashed" || saveState === "error";
  useEffect(() => {
    if (recoveryAlert && !wasCrashedOrErrorRef.current) setRecoveryOpen(true);
    wasCrashedOrErrorRef.current = recoveryAlert;
  }, [recoveryAlert]);

  async function ensureProvider(): Promise<ExecutionProvider> {
    if (providerRef.current && runtimeStage === "ready") return providerRef.current;
    setRuntimeStage("booting");
    setTerminalOutput((t) => `${t}\n\n[workspace] Starting Python runtime…`);
    try {
      const { PyodideExecutionProvider } = await import("@/lib/relay/pyodide-provider");
      const provider = new PyodideExecutionProvider();
      await provider.initializeSession(filesRef.current);
      providerRef.current = provider;
      setRuntimeStage("ready");
      setTerminalOutput((t) => `${t}\n[workspace] Ready.`);
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
    if (!sessionId) return null;
    try {
      const result = await patchSession<{ event: EventRow; reply?: EventRow | null }>(
        sessionId,
        "command_event",
        { eventType, actor: "candidate", sourceSurface, payload }
      );
      setEvents((prev) => [...prev, result.event]);
      return result;
    } catch {
      return null;
    }
  }

  async function runCommand(command: string) {
    if (!sessionId) return;
    setRunning(true);
    const normalized = command.trim().toLowerCase();
    if (normalized === "evals" || normalized === "test" || normalized === "pytest") {
      setWorkbenchTab("tests");
      setVerifyRunCount((n) => n + 1);
    }
    if (normalized === "preview") {
      setWorkbenchTab("preview");
      setVerifyRunCount((n) => n + 1);
    }
    setTerminalOutput(`$ ${command}\n(running…)`);
    try {
      let provider: ExecutionProvider;
      try {
        provider = await ensureProvider();
      } catch (bootErr) {
        setTerminalOutput(
          `$ ${command}\n[interrupted] ${bootErr instanceof Error ? bootErr.message : String(bootErr)}\nRetrying…`
        );
        providerRef.current = null;
        setRuntimeStage("idle");
        provider = await ensureProvider();
      }
      await syncProviderFiles(provider);
      const result: CommandResult = await provider.runCommand(command);
      const combined = `$ ${command}\nexit ${result.exitCode} · ${result.durationMs}ms\n\n${result.stdout}${
        result.stderr ? `\n[stderr]\n${result.stderr}` : ""
      }`;
      setTerminalOutput(combined);
      if (normalized === "preview" || command.toLowerCase().includes("preview")) {
        setPreviewOutput(result.stdout || result.stderr || "(empty preview)");
      }

      let evalPayloadExtras: Record<string, unknown> = {};
      if (normalized === "evals") {
        const parsed = parseEvalSummary(result.stdout);
        setEvalMetrics(parsed);
        setEvalLastRunAt(new Date().toISOString());
        setEvalLastRunOk(result.ok);
        if (parsed) {
          evalPayloadExtras = {
            integrity_caught: parsed.integrityCaught,
            rows_dropped_naive: parsed.rowsDroppedNaive,
          };
        }
      }
      if (normalized === "test" || normalized === "pytest") {
        setEvalLastRunAt(new Date().toISOString());
        setEvalLastRunOk(result.ok);
      }

      await logEvent("command_run", "terminal", {
        command,
        ok: result.ok,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        ...evalPayloadExtras,
      });

      if (result.ok && (normalized === "test" || normalized === "evals" || normalized === "pytest")) {
        setNotes((n) => {
          const checklist = n.checklist.length ? n.checklist : DEFAULT_CHECKLIST;
          return {
            ...n,
            checklist: checklist.map((c) =>
              c.id === "verify" ? { ...c, done: true } : c
            ),
          };
        });
      }
    } catch (err) {
      setRuntimeStage("crashed");
      providerRef.current = null;
      setTerminalOutput(`$ ${command}\n[error] ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  async function onFileChange(path: string, content: string) {
    setEditCount((n) => n + 1);
    setFiles((f) => ({ ...f, [path]: content }));
    if (path.endsWith(".csv")) setInspectedData(true);
    if (path.includes("join") || path.includes("reconcile") || path.includes("src/")) {
      setNotes((n) => {
        const checklist = n.checklist.length ? n.checklist : DEFAULT_CHECKLIST;
        return {
          ...n,
          checklist: checklist.map((c) =>
            c.id === "normalize" ? { ...c, done: true } : c
          ),
        };
      });
    }
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
    setEditCount((n) => n + 1);
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

  const inboxJson = files["data/inbox_thread.json"] || null;
  const inbox = useMemo(() => inboxMeta(inboxJson), [inboxJson]);

  const messages = useMemo<ChatMessage[]>(() => {
    const curveballRevealedAt =
      events.find((e) => e.event_type === "curveball_revealed")?.created_at || null;
    const seed = buildChannelSeed(inboxJson);
    const curveballSeed = buildCurveballSeed(
      curveballKey,
      curveballText,
      curveballRevealedAt,
      inboxJson
    );
    const live: ChatMessage[] = events
      .filter((e) => e.event_type === "customer_chat_message")
      .map((e) => {
        const speaker = speakerForActor(e.actor, inboxJson);
        return {
          id: e.id,
          actor: e.actor,
          authorName: speaker.name,
          authorRole: speaker.role,
          text: String((e.payload as { text?: string })?.text || ""),
          at: e.created_at,
        };
      });
    return [...seed, ...curveballSeed, ...live].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );
  }, [events, curveballKey, curveballText, inboxJson]);

  async function sendMessage() {
    if (!sessionId || !chatDraft.trim() || chatSending) return;
    const text = chatDraft.trim();
    const tempId = `local-${Date.now()}`;
    setChatDraft("");
    setChatSending(true);
    setOpenedBriefOrChat(true);
    setNotes((n) => {
      const checklist = n.checklist.length ? n.checklist : DEFAULT_CHECKLIST;
      return {
        ...n,
        checklist: checklist.map((c) => (c.id === "priority" ? { ...c, done: true } : c)),
      };
    });
    setEvents((prev) => [
      ...prev,
      {
        id: tempId,
        session_id: sessionId,
        sequence_number: -1,
        actor: "candidate",
        event_type: "customer_chat_message",
        source_surface: "customer_chat",
        payload: { text },
        created_at: new Date().toISOString(),
      },
    ]);
    try {
      const result = await patchSession<{ event: EventRow; reply: EventRow | null }>(
        sessionId,
        "command_event",
        {
          eventType: "customer_chat_message",
          actor: "candidate",
          sourceSurface: "customer_chat",
          payload: { text },
        }
      );
      setEvents((prev) => [
        ...prev.filter((e) => e.id !== tempId),
        result.event,
        ...(result.reply ? [result.reply] : []),
      ]);
    } catch (err) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === tempId
            ? {
                ...e,
                payload: {
                  text: `${text}\n\n[Not sent — ${err instanceof Error ? err.message : "retry"}]`,
                },
              }
            : e
        )
      );
      setChatDraft(text);
    } finally {
      setChatSending(false);
    }
  }

  function toggleChecklistItem(id: string) {
    setNotes((n) => {
      const checklist = n.checklist.length > 0 ? n.checklist : DEFAULT_CHECKLIST;
      return {
        ...n,
        checklist: checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
      };
    });
  }

  async function addReasoningNote(text: string) {
    setNotes((n) => ({
      ...n,
      knowledge: n.knowledge ? `${n.knowledge}\n• ${text}` : `• ${text}`,
    }));
    await logEvent("file_saved", "mission_panel", { paths: ["notes"], text });
  }

  function restoreLocalSnapshot() {
    if (!sessionId) return;
    try {
      const raw = window.localStorage.getItem(localKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        files?: FileMap;
        handoff?: Partial<ShipFields>;
        notes?: Partial<WorkingNotesState>;
      };
      if (parsed.files) {
        setFiles(parsed.files);
        filesRef.current = parsed.files;
      }
      if (parsed.handoff) setHandoff((h) => ({ ...h, ...normalizeHandoff(parsed.handoff) }));
      if (parsed.notes) setNotes((n) => ({ ...n, ...parsed.notes }));
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
      // ensureProvider sets crashed
    }
  }

  async function reportTechnicalIssue(description: string) {
    await logEvent("technical_issue_reported", "recovery_center", { description });
  }

  async function retrySave() {
    if (!sessionId) return;
    setSaveState("syncing");
    try {
      await patchSession(sessionId, "save", { files, handoff, notes });
      setSaveState("synced");
    } catch {
      setSaveState("error");
    }
  }

  async function shipNow(fields: ShipFields) {
    if (!sessionId) return;
    setHandoff(fields);
    setSubmitting(true);
    setError(null);
    try {
      await patchSession(sessionId, "save", { files, handoff: fields, notes });
      await patchSession(sessionId, "submit", { files, handoff: fields, notes });
      try {
        window.localStorage.removeItem(localKey(sessionId));
      } catch {
        /* ignore */
      }
      setShipGateOpen(false);
      router.push(`/s/${token}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setSubmitting(false);
    }
  }

  function exitSafely() {
    if (
      window.confirm(
        "Exit the workspace? Progress is autosaved and you can resume from your Action Inbox."
      )
    ) {
      router.push("/app/fde");
    }
  }

  function selectFile(path: string) {
    const resolved =
      files[path] != null
        ? path
        : Object.keys(files).find((p) => p.endsWith(path) || p.endsWith(path.replace(/^data\//, ""))) ||
          path;
    setActiveFile(resolved);
    if (resolved.endsWith(".csv")) {
      setInspectedData(true);
      setWorkbenchTab("data");
      setNotes((n) => {
        const checklist = n.checklist.length ? n.checklist : DEFAULT_CHECKLIST;
        return {
          ...n,
          checklist: checklist.map((c) => (c.id === "inspect" ? { ...c, done: true } : c)),
        };
      });
    } else {
      setWorkbenchTab("code");
    }
    setMobileZone("workbench");
  }

  function navigateMission(target: MissionNavTarget) {
    if (target === "chat") {
      setContextTab("chat");
      setMobileZone("context");
      setUnreadChat(0);
      return;
    }
    if (target === "handoff") {
      setShipGateOpen(true);
      return;
    }
    setWorkbenchTab(target);
    setMobileZone("workbench");
  }

  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const handoffFilled = useMemo(
    () => Object.values(handoff).some((v) => v.trim().length > 0),
    [handoff]
  );
  const stageIndex = computeStageIndex({
    started: true,
    openedBriefOrChat,
    inspectedData,
    editCount,
    verifyRunCount,
    handoffFilled,
  });

  const checklist = notes.checklist.length ? notes.checklist : DEFAULT_CHECKLIST;
  const doneCount = checklist.filter((c) => c.done).length;
  const timeUp = remaining <= 0;
  void status;
  void monacoReady;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#080A0F] text-[#9AA3B2]">
        Loading workspace…
      </div>
    );
  }
  if (error && !sessionId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#080A0F] px-6 text-center text-[#fda4b0]">
        {error}
      </div>
    );
  }

  const shellHeight = "min-h-0 flex-1";

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#080A0F] text-[#F4F5F7]">
      <TopBar
        customerName="Northbeam Logistics"
        connection={connection}
        saveState={saveState}
        runtimeStage={runtimeStage}
        remainingSeconds={remaining}
        submitting={submitting}
        onExit={exitSafely}
        onOpenRecovery={() => setRecoveryOpen(true)}
        recoveryAlert={recoveryAlert}
        onOpenShipGate={() => setShipGateOpen(true)}
        onRetrySave={retrySave}
      />

      <PhaseRail
        index={stageIndex}
        activeStage={focusStage}
        onSelectStage={(s) => {
          setFocusStage(s);
          if (s === "understand") {
            setContextTab("brief");
            setMobileZone("context");
          } else if (s === "investigate") {
            setWorkbenchTab("data");
            setMobileZone("workbench");
          } else if (s === "build") {
            setWorkbenchTab("code");
            setMobileZone("workbench");
          } else if (s === "verify") {
            setWorkbenchTab("tests");
            setMobileZone("workbench");
          } else if (s === "handoff") {
            setShipGateOpen(true);
          }
        }}
      />

      {curveballText && (
        <CurveballBanner
          text={curveballText}
          onAcknowledge={() => {
            setCurveballAck(true);
            void logEvent("curveball_acknowledged", "curveball_banner", { text: curveballText });
          }}
        />
      )}
      {error && (
        <div className="shrink-0 border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">
          {error}
          <button type="button" className="ml-3 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {timeUp && (
        <div className="shrink-0 border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">
          Time is up — use Review & submit to hand off your work.
        </div>
      )}

      <div className="flex shrink-0 border-b border-white/[0.06] bg-[#0B0F16] lg:hidden">
        {(
          [
            { id: "context" as const, label: "Context" },
            { id: "workbench" as const, label: "Workbench" },
            { id: "mission" as const, label: "Mission" },
          ] as const
        ).map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => setMobileZone(z.id)}
            className={cn(
              "flex-1 border-b-2 px-2 py-2.5 text-[12.5px] font-medium",
              mobileZone === z.id
                ? "border-[#6470FF] text-white"
                : "border-transparent text-[#687182]"
            )}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-px bg-white/[0.06] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <div
          className={cn(
            mobileZone === "context" ? "flex" : "hidden",
            "lg:flex",
            shellHeight,
            "flex-col overflow-hidden"
          )}
        >
          <ContextPanel
            tab={contextTab}
            onTabChange={(t) => {
              setContextTab(t);
              setOpenedBriefOrChat(true);
              if (t === "chat") setUnreadChat(0);
            }}
            unreadChat={unreadChat}
            mission={mission}
            canonicalFacts={canonicalFacts}
            messages={messages}
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onSend={sendMessage}
            sending={chatSending}
            channelName={inbox.channel}
            participants={inbox.participants}
            onOpenFile={selectFile}
          />
        </div>

        <div
          className={cn(
            mobileZone === "workbench" ? "flex" : "hidden",
            "lg:flex",
            shellHeight,
            "flex-col overflow-hidden"
          )}
        >
          <WorkbenchPanel
            tab={workbenchTab}
            onTabChange={setWorkbenchTab}
            filePaths={filePaths}
            files={files}
            activeFile={activeFile}
            onSelectFile={selectFile}
            onChangeFile={onFileChange}
            onEditorMount={() => setMonacoReady(true)}
            previewOutput={previewOutput}
            onRunPreview={() => runCommand("preview")}
            evalMetrics={evalMetrics}
            evalLastRunAt={evalLastRunAt}
            evalLastRunOk={evalLastRunOk}
            onRunTests={() => runCommand("test")}
            onRunEvals={() => runCommand("evals")}
            running={running}
            terminalOutput={terminalOutput}
            onRunCommand={runCommand}
          />
        </div>

        <div
          className={cn(
            mobileZone === "mission" ? "flex" : "hidden",
            "lg:flex",
            shellHeight,
            "flex-col overflow-hidden"
          )}
        >
          <MissionPanel
            notes={notes}
            onToggleChecklistItem={toggleChecklistItem}
            onAddNote={addReasoningNote}
            events={events}
            activeFile={activeFile}
            activeFileContent={files[activeFile] || ""}
            onApplyAi={applyAiPatch}
            onNavigate={navigateMission}
            doneCount={doneCount}
            totalCount={checklist.length}
          />
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

      <ShipGateModal
        open={shipGateOpen}
        initial={handoff}
        submitting={submitting}
        onClose={() => setShipGateOpen(false)}
        onShip={shipNow}
        readiness={{
          fileCount: filePaths.length,
          testsLastRunAt: evalLastRunAt,
          testsOk: evalLastRunOk,
          curveballAck: curveballAck || !curveballText,
        }}
      />
    </div>
  );
}
