import { NextResponse } from "next/server";
import { getCompanySession } from "@/lib/auth";
import { saveSimulation } from "@/lib/platform-store";
import { generateSimulation } from "@/lib/simulation-generator";
import type { GenerateSimulationInput } from "@/lib/platform-types";

export async function POST(req: Request) {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const input: GenerateSimulationInput = {
    industry: body.industry?.trim() || "Finance",
    role: body.role?.trim() || "Analyst",
    scenarioBrief: body.scenarioBrief?.trim() || "",
    skills: Array.isArray(body.skills) ? body.skills : [],
    durationMinutes: Number(body.durationMinutes) || 25,
    difficulty: body.difficulty === "advanced" ? "advanced" : "standard"
  };

  if (!input.industry || !input.role) {
    return NextResponse.json({ error: "Industry and role are required." }, { status: 400 });
  }

  const sim = await generateSimulation(session.userId, input);
  await saveSimulation(sim);
  return NextResponse.json({ simulation: sim });
}
