import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type AssistBody = {
  question?: string;
  context?: {
    sim?: {
      title?: string;
      sectorKey?: string;
      hardSkills?: string[];
      softSkills?: string[];
      embeddedErrors?: string[];
      scenarioHeader?: string;
      brief?: string;
    };
    pres?: {
      company?: string;
      sentiment?: string;
      marketEnv?: string;
      valuation?: { mid?: string; low?: string; high?: string };
      projectName?: string;
      metrics?: { k?: string; v?: string }[];
    };
    elapsed?: number;
    sheetEditCount?: number;
    aiAssistCount?: number;
    chatReplies?: number;
    workbookDone?: string;
    tabsVisited?: string[];
    gateCleared?: boolean;
    recommendation?: string;
    chatMessages?: { text?: string; stage?: string }[];
    aiAssistLog?: { question?: string }[];
    sessionLog?: { type?: string; title?: string; detail?: string }[];
    responsesSummary?: number;
    analysis?: { overallScore?: number; verdict?: string };
  };
};

export async function POST(req: NextRequest) {
  let body: AssistBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: "local", answer: null }, { status: 503 });
  }

  const sim = body.context?.sim || {};
  const pres = body.context?.pres || {};
  const ctx = body.context || {};

  const system = [
    "You are Fydell AI Analyst - expert coach inside a LIVE hiring simulation (M&A / finance or operations).",
    "Answer in 3-6 sentences with concrete numbers, formulas, tab names, and next actions.",
    "Use **bold** for key terms. Reference the candidate's actual session state when provided.",
    "If they ask what to do, give a numbered runbook. If they ask DCF/WACC/terminal growth, give formulas.",
    "Never give empty platitudes. Never say 'leverage' or 'synergy' without quantification.",
    "Distinguish team chat (coworkers) from you (coach) - you give deeper technical help."
  ].join(" ");

  const chatSnippet = (ctx.chatMessages || [])
    .slice(-4)
    .map((m) => `[team chat] ${m.text?.slice(0, 120) || ""}`)
    .join("\n");

  const recentLog = (ctx.sessionLog || [])
    .slice(-6)
    .map((e) => `${e.type}: ${e.detail || e.title || ""}`)
    .join("\n");

  const user = [
    `=== DEAL ===`,
    `Company: ${pres.company || sim.title || "Target"}`,
    `Sector: ${sim.sectorKey || "finance"} | Sentiment: ${pres.sentiment || "NEUTRAL"} | Market: ${pres.marketEnv || "-"}`,
    `Valuation: ${pres.valuation?.mid || "-"} (low ${pres.valuation?.low || "-"}, high ${pres.valuation?.high || "-"})`,
    `Hard skills scored: ${(sim.hardSkills || []).join(", ") || "analysis"}`,
    `Soft skills scored: ${(sim.softSkills || []).join(", ") || "communication"}`,
    sim.brief ? `Brief: ${sim.brief.slice(0, 200)}` : "",
    `=== SESSION STATE ===`,
    `Elapsed: ${ctx.elapsed || 0}s | Workbook: ${ctx.workbookDone || "-"} | Model edits: ${ctx.sheetEditCount || 0}`,
    `Tabs opened: ${(ctx.tabsVisited || []).join(", ") || "none"}`,
    `Team chat messages: ${ctx.chatReplies || 0} | AI queries so far: ${ctx.aiAssistCount || 0}`,
    `Manager gate: ${ctx.gateCleared ? "cleared" : "not cleared"} | Recommendation: ${ctx.recommendation || "not set"}`,
    ctx.analysis ? `Post-debrief score: ${ctx.analysis.overallScore}/100 - ${ctx.analysis.verdict}` : "Live session (no debrief yet)",
    chatSnippet ? `Recent team chat:\n${chatSnippet}` : "",
    recentLog ? `Recent actions:\n${recentLog}` : "",
    `=== QUESTION ===`,
    question
  ].filter(Boolean).join("\n");

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
        max_tokens: 420,
        temperature: 0.45
      })
    });

    if (!res.ok) {
      return NextResponse.json({ fallback: "local", answer: null }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const answer = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ answer, provider: "openai" });
  } catch {
    return NextResponse.json({ fallback: "local", answer: null }, { status: 500 });
  }
}
