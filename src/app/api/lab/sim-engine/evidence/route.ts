import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";
import {
  evaluateNorthlinePassA,
  evaluateNorthlinePassB,
  type NorthlineDefenseResponse,
} from "@/lib/sim-engine/analysis/northlineEvaluator";
import { getScenario } from "@/lib/sim-engine/scenarios/catalog";
import type { SimulationAttempt } from "@/lib/sim-engine/types";
import type {
  EvidenceWorkerResult,
  WorkerRunSnapshot,
} from "@/lib/sim-engine/golden-path/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT_BYTES = 256_000;
const MAX_OUTPUT_BYTES = 128_000;

export async function POST(request: Request) {
  if (!isSimEngineEnabled()) {
    return NextResponse.json({ error: "Simulation engine lab is disabled." }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const serialized = JSON.stringify(body);
  if (Buffer.byteLength(serialized, "utf8") > MAX_INPUT_BYTES) {
    return NextResponse.json({ error: "Evidence snapshot exceeds the lab limit." }, { status: 413 });
  }

  if (isNorthlineSnapshot(body)) {
    const scenario = getScenario(body.scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: "Unknown Northline scenario." }, { status: 400 });
    }
    const result =
      body.analysisPass === "A"
        ? evaluateNorthlinePassA(scenario, body.attempt)
        : evaluateNorthlinePassB(scenario, body.attempt, body.defenseResponses);
    return NextResponse.json({
      kind: "NORTHLINE_EVIDENCE",
      analysisPass: body.analysisPass,
      ...result,
    });
  }

  if (!isWorkerSnapshot(body)) {
    return NextResponse.json({ error: "Invalid evidence snapshot." }, { status: 400 });
  }

  try {
    const result = await runPythonWorker(serialized);
    if (!isWorkerResult(result)) throw new Error("Python returned an invalid result contract.");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Evidence analysis failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

interface NorthlineEvidenceSnapshot {
  kind: "NORTHLINE_EVIDENCE";
  scenarioId: "northline-operations-yield";
  analysisPass: "A" | "B";
  attempt: SimulationAttempt;
  defenseResponses: NorthlineDefenseResponse[];
}

function isNorthlineSnapshot(value: unknown): value is NorthlineEvidenceSnapshot {
  if (
    !isRecord(value) ||
    value.kind !== "NORTHLINE_EVIDENCE" ||
    value.scenarioId !== "northline-operations-yield" ||
    !["A", "B"].includes(String(value.analysisPass)) ||
    !isRecord(value.attempt)
  ) {
    return false;
  }
  const attempt = value.attempt;
  const validAttempt =
    typeof attempt.id === "string" &&
    isRecord(attempt.metadata) &&
    attempt.metadata.scenarioId === value.scenarioId &&
    Array.isArray(attempt.telemetry) &&
    isRecord(attempt.world) &&
    Array.isArray(attempt.world.scenarioEvents) &&
    isRecord(attempt.artifacts);
  const validDefense =
    Array.isArray(value.defenseResponses) &&
    value.defenseResponses.every(
      (response) =>
        isRecord(response) &&
        typeof response.eventId === "string" &&
        typeof response.response === "string"
    );
  return validAttempt && validDefense;
}

function runPythonWorker(input: string): Promise<unknown> {
  const executable =
    process.env.EVIDENCE_ENGINE_PYTHON || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(process.cwd(), "services", "evidence-engine", "worker.py");

  return new Promise((resolve, reject) => {
    const child = spawn(executable, [script], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Python evidence worker timed out."));
    }, 10_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout, "utf8") > MAX_OUTPUT_BYTES) child.kill();
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr || `Python evidence worker exited with code ${code}.`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as unknown);
      } catch {
        reject(new Error("Python evidence worker returned malformed JSON."));
      }
    });
    child.stdin.end(input);
  });
}

function isWorkerSnapshot(value: unknown): value is WorkerRunSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.runId === "string" &&
    ["A", "B"].includes(String(value.analysisPass)) &&
    value.changedFact !== null &&
    isRecord(value.changedFact) &&
    value.changedFact.factId === "AUTH_001" &&
    Array.isArray(value.events) &&
    Array.isArray(value.artifacts) &&
    Array.isArray(value.defenseQuestions) &&
    value.events.every(
      (event, index) => isRecord(event) && event.runId === value.runId && event.sequence === index + 1
    )
  );
}

function isWorkerResult(value: unknown): value is EvidenceWorkerResult {
  if (!isRecord(value) || value.resultVersion !== "1" || typeof value.runId !== "string") {
    return false;
  }
  const claim = value.claim;
  return (
    isRecord(claim) &&
    ["A", "B"].includes(String(value.analysisPass)) &&
    claim.competency === "ADAPTATION" &&
    ["STRENGTH", "CONCERN", "INSUFFICIENT_EVIDENCE"].includes(String(claim.direction)) &&
    ["HIGH", "MODERATE", "LOW", "INSUFFICIENT"].includes(String(claim.confidence)) &&
    typeof claim.statement === "string" &&
    Array.isArray(claim.supportingEventIds) &&
    Array.isArray(claim.counterEventIds) &&
    Array.isArray(claim.sourceArtifactIds) &&
    typeof claim.modelVersion === "string" &&
    typeof claim.rubricVersion === "string" &&
    Array.isArray(value.defenseQuestions) &&
    value.defenseQuestions.every((question) => typeof question === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
