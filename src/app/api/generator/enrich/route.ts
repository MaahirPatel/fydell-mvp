import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type EnrichBody = {
  sectorKey?: string;
  role?: string;
  brief?: string;
  hardSkills?: string[];
  softSkills?: string[];
  difficulty?: string;
  durationMinutes?: number;
  title?: string;
};

const SECTOR_LABELS: Record<string, string> = {
  finance: "Finance & investment banking",
  tech: "Technology",
  cybersecurity: "Cybersecurity",
  healthcare: "Healthcare",
  law: "Legal",
  consulting: "Management consulting",
  retail: "Retail & CPG",
  fastfood: "Fast food & QSR",
  energy: "Energy",
  manufacturing: "Manufacturing",
  public: "Public sector",
  realestate: "Commercial real estate"
};

export async function POST(req: NextRequest) {
  let body: EnrichBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sectorKey = body.sectorKey || "finance";
  const role = body.role?.trim() || "Analyst";
  const brief = body.brief?.trim() || "";
  const hardSkills = body.hardSkills?.length ? body.hardSkills : ["Financial modeling", "Decision making"];
  const softSkills = body.softSkills?.length ? body.softSkills : ["Communication", "Composure"];
  const difficulty = body.difficulty || "standard";
  const duration = body.durationMinutes || 25;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: "local", enriched: false }, { status: 503 });
  }

  const sectorLabel = SECTOR_LABELS[sectorKey] || sectorKey;
  const system = [
    "You are Fydell Simulation Studio - generate realistic hiring simulation metadata.",
    "Return ONLY valid JSON with keys: title, scenarioHeader, brief, archetype, stake, embeddedErrors (array of 3-4 short buried-error labels candidates must find).",
    "Titles use format: Project [Codename] - [Scenario type]. scenarioHeader is 2-3 sentences of live-desk context.",
    "embeddedErrors must be specific, testable, and match the sector - not generic.",
    "No markdown, no code fences."
  ].join(" ");

  const user = [
    `Sector: ${sectorLabel} (${sectorKey})`,
    `Role: ${role}`,
    `Duration: ${duration} minutes | Difficulty: ${difficulty}`,
    `Hard skills to test: ${hardSkills.join(", ")}`,
    `Soft skills: ${softSkills.join(", ")}`,
    brief ? `User brief: ${brief}` : "Generate a compelling transaction or operations scenario.",
    body.title ? `Suggested title: ${body.title}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        response_format: { type: "json_object" },
        max_tokens: 650,
        temperature: 0.55
      })
    });

    if (!res.ok) {
      return NextResponse.json({ fallback: "local", enriched: false }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ fallback: "local", enriched: false }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return NextResponse.json({
      enriched: true,
      provider: "openai",
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      scenarioHeader: typeof parsed.scenarioHeader === "string" ? parsed.scenarioHeader : undefined,
      brief: typeof parsed.brief === "string" ? parsed.brief : undefined,
      archetype: typeof parsed.archetype === "string" ? parsed.archetype : undefined,
      stake: typeof parsed.stake === "string" ? parsed.stake : undefined,
      embeddedErrors: Array.isArray(parsed.embeddedErrors)
        ? parsed.embeddedErrors.filter((e): e is string => typeof e === "string").slice(0, 5)
        : undefined
    });
  } catch {
    return NextResponse.json({ fallback: "local", enriched: false }, { status: 500 });
  }
}
