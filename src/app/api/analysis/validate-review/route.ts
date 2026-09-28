/**
 * POST /api/analysis/validate-review
 *
 * Validates a proposed interpretive (model) review against the deterministic
 * record. Checks, in order: AI-01 separation (no test verdicts in model
 * output), AI-06 schema/labels/bounds/contradictions, AI-04 citations,
 * AI-08 narrow communication.
 *
 * This endpoint never fabricates a report: invalid output is returned with
 * reasons and a route ("retry" | "human_review"). A valid response contains
 * only validation results — the caller assembles the report.
 *
 * Body: {
 *   deterministic: DeterministicSection,
 *   review: unknown,            // untrusted model JSON
 *   snapshotFiles: [{ path, content }],
 *   testOutputIds: string[],
 *   messageIds: string[]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { validateModelOutput } from "@/lib/analysis/modelOutput";
import { indexSnapshot } from "@/lib/analysis/citations";
import type { DeterministicSection } from "@/lib/analysis/separation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const { deterministic, review, snapshotFiles, testOutputIds, messageIds } = body as {
    deterministic?: unknown;
    review?: unknown;
    snapshotFiles?: unknown;
    testOutputIds?: unknown;
    messageIds?: unknown;
  };
  if (!isRecord(deterministic) || !Array.isArray((deterministic as { tests?: unknown }).tests)) {
    return NextResponse.json(
      { error: "deterministic section with a tests array is required." },
      { status: 400 },
    );
  }
  if (!Array.isArray(snapshotFiles)) {
    return NextResponse.json({ error: "snapshotFiles: [{ path, content }] is required." }, { status: 400 });
  }
  const files: { path: string; content: string }[] = [];
  for (const f of snapshotFiles.slice(0, 100)) {
    if (isRecord(f) && typeof f.path === "string" && typeof f.content === "string") {
      files.push({ path: f.path.slice(0, 300), content: f.content.slice(0, 200_000) });
    }
  }

  const result = validateModelOutput(review, {
    snapshot: indexSnapshot(files),
    testOutputs: new Set(Array.isArray(testOutputIds) ? testOutputIds.filter((s) => typeof s === "string") : []),
    messages: new Set(Array.isArray(messageIds) ? messageIds.filter((s) => typeof s === "string") : []),
    deterministic: deterministic as unknown as DeterministicSection,
  });

  return NextResponse.json(
    {
      valid: result.ok,
      reasons: result.reasons,
      route: result.route ?? null,
      note: result.ok
        ? "Review passed validation. Deterministic and interpretive sections remain separate in the assembled report."
        : "Invalid model output is never repaired into a complete report. Route it as indicated.",
    },
    { status: 200 },
  );
}
