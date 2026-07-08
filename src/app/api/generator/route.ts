import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/mvp/guard";
import {
  generateSimulationWithLLM,
  saveDraftSimulation,
  validateSimulationJson
} from "@/lib/mvp/generator";
import type { GeneratorInput, SimulationDraft } from "@/lib/mvp/generator-types";

export const runtime = "nodejs";

// POST /api/generator
//   { action: "generate", input }          -> run pipeline + validate, return draft
//   { action: "save", draft, status? }     -> validate + persist as draft simulation
// Server-only: requires an authenticated manager + their workspace.
type Body =
  | { action?: "generate"; input: GeneratorInput; useLLM?: boolean }
  | { action: "save" | "publish"; draft: SimulationDraft };

export async function POST(req: NextRequest) {
  const ctx = await requireManager();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = "action" in body && body.action ? body.action : "generate";

  if (action === "save" || action === "publish") {
    const draft = (body as { draft?: SimulationDraft }).draft;
    if (!draft) return NextResponse.json({ error: "Missing draft." }, { status: 400 });
    const validation = validateSimulationJson(draft);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, validation }, { status: 422 });
    }
    const result = await saveDraftSimulation(
      ctx.workspace.id,
      draft,
      ctx.userId,
      action === "publish" ? "active" : "draft"
    );
    return NextResponse.json({
      ok: result.ok,
      simulation: result.simulation,
      validation: result.validation
    });
  }

  const input = (body as { input?: GeneratorInput }).input;
  if (!input || !input.role_title?.trim()) {
    return NextResponse.json({ error: "A role title is required." }, { status: 400 });
  }

  const useLLM = (body as { useLLM?: boolean }).useLLM ?? false;
  const { draft, source } = await generateSimulationWithLLM(input, { useLLM });
  const validation = validateSimulationJson(draft);
  return NextResponse.json({ draft, source, validation });
}
