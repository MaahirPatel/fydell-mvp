import { affectedClosure, DEFAULT_DEPENDENTS, kindForPath } from "./deps";
import { chainHash, contentHash, headHashFromArtifacts } from "./hash";
import { DEFAULT_REQUIREMENTS, DEFAULT_TESTS, recomputeRequirements } from "./requirements";
import type {
  ArtifactRecord,
  WorkspaceCommand,
  WorkspaceDomainEvent,
  WorkspaceEngineState,
  WorkspaceEventType,
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function makeEvent(
  state: WorkspaceEngineState,
  type: WorkspaceEventType,
  actorType: WorkspaceDomainEvent["actorType"],
  causationId: string,
  payload: Record<string, unknown>,
  versionAfter: number
): WorkspaceDomainEvent {
  const payloadJson = JSON.stringify(payload);
  return {
    eventId: `evt_${causationId}_${type}_${versionAfter}`,
    sessionId: state.sessionId,
    sequenceNumber: versionAfter,
    eventType: type,
    actorType,
    occurredAt: nowIso(),
    causationId,
    workspaceVersionBefore: state.headVersion,
    workspaceVersionAfter: versionAfter,
    payload,
    payloadHash: contentHash(payloadJson),
    schemaVersion: 1,
  };
}

function bumpHead(state: WorkspaceEngineState, actorId: string): WorkspaceEngineState {
  const headVersion = state.headVersion + 1;
  const headHash = headHashFromArtifacts(headVersion, state.artifacts);
  void actorId;
  return { ...state, headVersion, headHash };
}

function markAffectedStale(state: WorkspaceEngineState, path: string): WorkspaceEngineState {
  const affected = affectedClosure(path, state.dependents);
  const artifacts = { ...state.artifacts };
  for (const [p, art] of Object.entries(artifacts)) {
    if (affected.has(p) || affected.has("__preview__") || affected.has("__tests__")) {
      if (p.startsWith("outputs/") || p === path) {
        artifacts[p] = { ...art, status: p === path ? art.status : "stale" };
      }
    }
  }
  const tests = state.tests.map((t) => {
    if (affected.has("__tests__") && (t.status === "PASS" || t.status === "FAIL")) {
      return { ...t, status: "STALE" as const };
    }
    return t;
  });
  const preview =
    affected.has("__preview__") && state.preview.content
      ? { ...state.preview, status: "stale" as const }
      : state.preview;
  return { ...state, artifacts, tests, preview };
}

function setArtifact(
  state: WorkspaceEngineState,
  path: string,
  content: string,
  actorId: string
): WorkspaceEngineState {
  const prev = state.artifacts[path];
  const version = (prev?.version || 0) + 1;
  const hash = contentHash(content);
  const record: ArtifactRecord = {
    path,
    kind: kindForPath(path),
    version,
    content,
    contentHash: hash,
    status: "modified",
    updatedAt: nowIso(),
  };
  const artifacts = { ...state.artifacts, [path]: record };
  let next: WorkspaceEngineState = {
    ...state,
    artifacts,
    headHash: chainHash(state.headHash, path, version, content, actorId, record.updatedAt),
  };
  next = bumpHead(next, actorId);
  next = markAffectedStale(next, path);
  next = { ...next, requirements: recomputeRequirements(next) };
  return next;
}

export function emptyWorkspace(sessionId: string, companyName = "Northbeam Logistics"): WorkspaceEngineState {
  return {
    schemaVersion: 1,
    sessionId,
    headVersion: 0,
    headHash: "genesis",
    companyName,
    artifacts: {},
    dependents: DEFAULT_DEPENDENTS,
    requirements: DEFAULT_REQUIREMENTS.map((r) => ({ ...r })),
    tests: DEFAULT_TESTS.map((t) => ({ ...t })),
    preview: { content: null, workspaceVersion: null, status: "empty", lastRunAt: null },
    messages: [],
    handoff: {
      whatChanged: "",
      evidence: "",
      limitations: "",
      clientMessage: "",
      version: 0,
    },
    curveballText: null,
    curveballAcked: false,
    openTabs: [],
    activePath: null,
    lastRuntime: null,
    submitted: false,
    submissionHeadHash: null,
  };
}

export function initFromFiles(
  sessionId: string,
  files: Record<string, string>,
  companyName = "Northbeam Logistics"
): WorkspaceEngineState {
  let state = emptyWorkspace(sessionId, companyName);
  const artifacts: Record<string, ArtifactRecord> = {};
  const at = nowIso();
  for (const [path, content] of Object.entries(files)) {
    artifacts[path] = {
      path,
      kind: kindForPath(path),
      version: 1,
      content,
      contentHash: contentHash(content),
      status: "current",
      updatedAt: at,
    };
  }
  state = {
    ...state,
    artifacts,
    headVersion: 1,
    headHash: headHashFromArtifacts(1, artifacts),
  };
  const start =
    artifacts["docs/customer-brief.md"]?.path ||
    artifacts["README.md"]?.path ||
    Object.keys(artifacts).sort()[0] ||
    null;
  if (start) {
    state = {
      ...state,
      openTabs: [start],
      activePath: start,
    };
  }
  return { ...state, requirements: recomputeRequirements(state) };
}

export function applyCommand(
  state: WorkspaceEngineState,
  command: WorkspaceCommand
): { state: WorkspaceEngineState; events: WorkspaceDomainEvent[] } {
  if (state.submitted && command.type !== "INIT_WORKSPACE") {
    throw new Error("SESSION_SUBMITTED");
  }
  if (
    command.type !== "INIT_WORKSPACE" &&
    command.expectedHeadVersion !== state.headVersion
  ) {
    const err = new Error("VERSION_CONFLICT");
    (err as Error & { code: string }).code = "VERSION_CONFLICT";
    throw err;
  }

  const events: WorkspaceDomainEvent[] = [];
  const actorId = command.actor;
  let next = state;

  switch (command.type) {
    case "INIT_WORKSPACE": {
      const files = (command.payload.files || {}) as Record<string, string>;
      next = initFromFiles(state.sessionId || String(command.payload.sessionId || ""), files, state.companyName);
      events.push(
        makeEvent(state, "workspace.initialized", "system", command.commandId, {
          fileCount: Object.keys(files).length,
        }, next.headVersion)
      );
      break;
    }
    case "OPEN_ARTIFACT": {
      const path = String(command.payload.path || "");
      if (!next.artifacts[path]) throw new Error("UNKNOWN_ARTIFACT");
      const tabs = next.openTabs.includes(path) ? next.openTabs : [...next.openTabs, path];
      next = { ...next, openTabs: tabs, activePath: path };
      next = { ...next, requirements: recomputeRequirements(next) };
      events.push(
        makeEvent(state, "artifact.opened", actorId, command.commandId, { path }, next.headVersion)
      );
      break;
    }
    case "EDIT_FILE": {
      const path = String(command.payload.path || "");
      const content = String(command.payload.content ?? "");
      const baseVersion = Number(command.payload.baseVersion);
      const art = next.artifacts[path];
      if (!art) throw new Error("UNKNOWN_ARTIFACT");
      if (art.version !== baseVersion) {
        const err = new Error("VERSION_CONFLICT");
        (err as Error & { code: string }).code = "VERSION_CONFLICT";
        throw err;
      }
      next = setArtifact(next, path, content, actorId);
      events.push(
        makeEvent(state, "file.patch_applied", actorId, command.commandId, {
          path,
          baseVersion,
          newVersion: next.artifacts[path].version,
          contentHash: next.artifacts[path].contentHash,
        }, next.headVersion)
      );
      events.push(
        makeEvent(state, "deps.invalidated", "system", command.commandId, {
          source: path,
          affected: [...affectedClosure(path, next.dependents)],
        }, next.headVersion)
      );
      events.push(
        makeEvent(state, "preview.invalidated", "system", command.commandId, { source: path }, next.headVersion)
      );
      break;
    }
    case "EDIT_DATASET_CELL": {
      const path = String(command.payload.path || "");
      const row = Number(command.payload.row);
      const col = Number(command.payload.col);
      const newValue = String(command.payload.newValue ?? "");
      const baseVersion = Number(command.payload.baseVersion);
      const art = next.artifacts[path];
      if (!art) throw new Error("UNKNOWN_ARTIFACT");
      if (art.version !== baseVersion) {
        const err = new Error("VERSION_CONFLICT");
        (err as Error & { code: string }).code = "VERSION_CONFLICT";
        throw err;
      }
      const lines = art.content.replace(/\r\n/g, "\n").split("\n");
      if (row < 0 || row >= lines.length) throw new Error("INVALID_CELL");
      const cells = splitCsvLine(lines[row]);
      if (col < 0 || col >= cells.length) throw new Error("INVALID_CELL");
      const oldValue = cells[col];
      cells[col] = escapeCsv(newValue);
      lines[row] = cells.join(",");
      const content = lines.join("\n");
      next = setArtifact(next, path, content, actorId);
      events.push(
        makeEvent(state, "dataset.cell_updated", actorId, command.commandId, {
          path,
          row,
          col,
          oldValue,
          newValue,
          newVersion: next.artifacts[path].version,
        }, next.headVersion)
      );
      events.push(
        makeEvent(state, "preview.invalidated", "system", command.commandId, { source: path }, next.headVersion)
      );
      break;
    }
    case "SEND_STAKEHOLDER_MESSAGE": {
      const text = String(command.payload.text || "").trim();
      if (!text) throw new Error("EMPTY_MESSAGE");
      const msg = {
        id: `msg_${command.commandId}`,
        actor: "candidate" as const,
        authorName: "You",
        authorRole: "Candidate",
        text,
        at: nowIso(),
        status: "sent" as const,
      };
      next = { ...next, messages: [...next.messages, msg] };
      next = bumpHead(next, actorId);
      next = { ...next, requirements: recomputeRequirements(next) };
      events.push(
        makeEvent(state, "message.sent", actorId, command.commandId, { text }, next.headVersion)
      );
      const replyText = String(command.payload.replyText || "");
      if (replyText) {
        const reply = {
          id: `msg_reply_${command.commandId}`,
          actor: "customer_simulator" as const,
          authorName: String(command.payload.replyAuthorName || "Dana Whitfield"),
          authorRole: String(command.payload.replyAuthorRole || "Operations Manager"),
          text: replyText,
          at: nowIso(),
          status: "sent" as const,
        };
        next = { ...next, messages: [...next.messages, reply] };
        events.push(
          makeEvent(next, "message.received", "customer_simulator", command.commandId, {
            text: replyText,
          }, next.headVersion)
        );
      }
      break;
    }
    case "ACCEPT_AI_PATCH": {
      const path = String(command.payload.path || "");
      const content = String(command.payload.content ?? "");
      const baseVersion = Number(command.payload.baseVersion);
      const art = next.artifacts[path];
      if (!art || art.version !== baseVersion) {
        const err = new Error("VERSION_CONFLICT");
        (err as Error & { code: string }).code = "VERSION_CONFLICT";
        throw err;
      }
      next = setArtifact(next, path, content, actorId);
      events.push(
        makeEvent(state, "ai.patch_accepted", actorId, command.commandId, {
          path,
          newVersion: next.artifacts[path].version,
        }, next.headVersion)
      );
      events.push(
        makeEvent(state, "file.patch_applied", actorId, command.commandId, {
          path,
          source: "ai",
          newVersion: next.artifacts[path].version,
        }, next.headVersion)
      );
      break;
    }
    case "REJECT_AI_PATCH": {
      events.push(
        makeEvent(state, "ai.patch_rejected", actorId, command.commandId, {
          path: command.payload.path,
        }, next.headVersion)
      );
      break;
    }
    case "RUN_COMMAND": {
      events.push(
        makeEvent(state, "runtime.started", actorId, command.commandId, {
          command: command.payload.command,
          workspaceVersion: next.headVersion,
        }, next.headVersion)
      );
      break;
    }
    case "APPLY_RUNTIME_RESULT": {
      const commandName = String(command.payload.command || "");
      const ok = Boolean(command.payload.ok);
      const exitCode = Number(command.payload.exitCode ?? 1);
      const stdout = String(command.payload.stdout || "");
      const stderr = String(command.payload.stderr || "");
      const runVersion = Number(command.payload.workspaceVersion ?? next.headVersion);
      next = {
        ...next,
        lastRuntime: {
          command: commandName,
          workspaceVersion: runVersion,
          exitCode,
          ok,
          at: nowIso(),
          stdout,
          stderr,
        },
      };
      const isTest = /^(test|pytest|evals)$/i.test(commandName);
      const isPreview = /^preview$/i.test(commandName);
      if (isTest) {
        next = {
          ...next,
          tests: next.tests.map((t) =>
            t.id === "visible_suite"
              ? {
                  ...t,
                  status: ok ? "PASS" : "FAIL",
                  workspaceVersion: runVersion,
                  detail: ok ? "Suite passed" : stderr || "Suite failed",
                }
              : t
          ),
        };
        events.push(
          makeEvent(state, "tests.completed", "system", command.commandId, {
            ok,
            workspaceVersion: runVersion,
          }, next.headVersion)
        );
      }
      if (isPreview) {
        const generated = stdout || "(empty preview)";
        const outPath = "outputs/daily_delay_view.csv";
        if (!next.artifacts[outPath]) {
          next = {
            ...next,
            artifacts: {
              ...next.artifacts,
              [outPath]: {
                path: outPath,
                kind: "output",
                version: 1,
                content: generated,
                contentHash: contentHash(generated),
                status: "current",
                updatedAt: nowIso(),
              },
            },
          };
        } else {
          next = setArtifact(next, outPath, generated, "system");
        }
        next = {
          ...next,
          preview: {
            content: generated,
            workspaceVersion: runVersion,
            status: runVersion === next.headVersion ? "current" : "stale",
            lastRunAt: nowIso(),
          },
          tests: next.tests.map((t) =>
            t.id === "preview"
              ? {
                  ...t,
                  status: ok ? "PASS" : "FAIL",
                  workspaceVersion: runVersion,
                  detail: null,
                }
              : t
          ),
        };
        // setArtifact may bump head — align preview currentness
        if (next.preview.workspaceVersion === next.headVersion) {
          next = { ...next, preview: { ...next.preview, status: "current" } };
        }
        events.push(
          makeEvent(state, "preview.generated", "system", command.commandId, {
            workspaceVersion: runVersion,
            ok,
          }, next.headVersion)
        );
      }
      events.push(
        makeEvent(
          state,
          ok ? "runtime.completed" : "runtime.failed",
          "system",
          command.commandId,
          { command: commandName, exitCode, workspaceVersion: runVersion },
          next.headVersion
        )
      );
      next = { ...next, requirements: recomputeRequirements(next) };
      for (const r of next.requirements) {
        const prev = state.requirements.find((x) => x.id === r.id);
        if (r.status === "SATISFIED" && prev?.status !== "SATISFIED") {
          const artifactVersionMap: Record<string, number> = {};
          for (const [p, art] of Object.entries(next.artifacts)) {
            artifactVersionMap[p] = art.version;
          }
          events.push(
            makeEvent(
              state,
              "requirement.satisfied",
              "system",
              command.commandId,
              {
                id: r.id,
                workspaceVersion: next.headVersion,
                testWorkspaceVersion: next.tests.find((t) => t.id === "visible_suite")?.workspaceVersion,
                artifactVersionMap,
                runtimeCommand: commandName,
              },
              next.headVersion
            )
          );
        }
        if (r.status === "REGRESSED" && prev?.status === "SATISFIED") {
          events.push(
            makeEvent(state, "requirement.regressed", "system", command.commandId, { id: r.id }, next.headVersion)
          );
        }
      }
      break;
    }
    case "ACKNOWLEDGE_CURVEBALL": {
      const text = String(command.payload.text || next.curveballText || "");
      next = { ...next, curveballText: text || next.curveballText, curveballAcked: true };
      next = bumpHead(next, actorId);
      events.push(
        makeEvent(state, "curveball.acknowledged", actorId, command.commandId, {
          text: next.curveballText,
        }, next.headVersion)
      );
      break;
    }
    case "ADD_REASONING_NOTE": {
      const text = String(command.payload.text || "").trim();
      events.push(
        makeEvent(state, "file.patch_applied", actorId, command.commandId, {
          path: "notes/reasoning",
          text,
        }, next.headVersion)
      );
      next = bumpHead(next, actorId);
      break;
    }
    case "SAVE_HANDOFF": {
      next = {
        ...next,
        handoff: {
          whatChanged: String(command.payload.whatChanged || ""),
          evidence: String(command.payload.evidence || ""),
          limitations: String(command.payload.limitations || ""),
          clientMessage: String(command.payload.clientMessage || ""),
          version: next.handoff.version + 1,
        },
      };
      next = bumpHead(next, actorId);
      next = { ...next, requirements: recomputeRequirements(next) };
      events.push(
        makeEvent(state, "handoff.saved", actorId, command.commandId, { version: next.handoff.version }, next.headVersion)
      );
      break;
    }
    case "SUBMIT_SESSION": {
      next = {
        ...next,
        submitted: true,
        submissionHeadHash: next.headHash,
      };
      events.push(
        makeEvent(state, "session.submitted", actorId, command.commandId, {
          headVersion: next.headVersion,
          headHash: next.headHash,
        }, next.headVersion)
      );
      break;
    }
    default:
      throw new Error("UNKNOWN_COMMAND");
  }

  return { state: next, events };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function fileMapFromState(state: WorkspaceEngineState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, art] of Object.entries(state.artifacts)) {
    out[path] = art.content;
  }
  return out;
}
