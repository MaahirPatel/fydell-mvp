/**
 * Prototype: deterministic code analysis API.
 *
 * POST /api/prototypes/code-analysis
 * Body: { files?: [{ path, content }], demo?: "northbeam" }
 *
 * Never executes the submitted code — it is parsed with Python's `ast`
 * module only, in a throwaway subprocess. Responses are fully deterministic
 * AST-pattern findings; no LLM is involved unless OPENAI_API_KEY is set
 * (see the `llm` field in the report), and even then it may only explain
 * deterministic findings.
 */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { analyzeSource, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "@/lib/code-analysis/analyzer";
import type { AnalysisReport } from "@/lib/code-analysis/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NORTHBEAM_FILES = [
  "src/join.py",
  "src/report.py",
  "src/reconcile.py",
  "src/metrics.py",
  "src/load.py",
  "tests/test_reconcile.py",
];

function scenarioRoot(): string {
  return join(process.cwd(), "scenarios", "project-relay");
}

async function loadNorthbeamDemo(): Promise<{ path: string; content: string }[]> {
  const root = scenarioRoot();
  const out: { path: string; content: string }[] = [];
  for (const rel of NORTHBEAM_FILES) {
    try {
      const content = await readFile(join(root, rel), "utf8");
      out.push({ path: `northbeam/${rel}`, content });
    } catch {
      // A missing fixture file simply isn't included; the report stays honest.
    }
  }
  return out;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  let files: { path: string; content: string }[];
  if (body.demo === "northbeam") {
    files = await loadNorthbeamDemo();
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Northbeam demo sources are not available on this server." },
        { status: 503 },
      );
    }
  } else if (Array.isArray(body.files)) {
    files = [];
    let total = 0;
    for (const f of body.files.slice(0, MAX_FILES)) {
      if (!isRecord(f) || typeof f.path !== "string" || typeof f.content !== "string") continue;
      const bytes = Buffer.byteLength(f.content, "utf8");
      total += bytes;
      if (total > MAX_TOTAL_BYTES) break;
      if (bytes > MAX_FILE_BYTES) continue; // analyzer reports it as skipped
      const safePath = f.path.replace(/\\/g, "/").replace(/\.\./g, "").slice(0, 200) || "snippet.py";
      files.push({ path: safePath, content: f.content.slice(0, MAX_FILE_BYTES) });
    }
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No usable files. Provide files: [{ path, content }] with Python source." },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json(
      { error: 'Provide { files: [{ path, content }] } or { demo: "northbeam" }.' },
      { status: 400 },
    );
  }

  try {
    const report: AnalysisReport = await analyzeSource({ files });
    return NextResponse.json(report, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: `Analysis failed: ${String(e).slice(0, 200)}` },
      { status: 500 },
    );
  }
}
