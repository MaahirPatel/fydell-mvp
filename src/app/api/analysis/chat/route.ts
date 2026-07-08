import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SessionSnapshot = {
  elapsedMin?: number;
  remainingMin?: number;
  sheetEdits?: number;
  tabsVisited?: string[];
  gateCleared?: boolean;
  workbookDone?: string;
  tasksDone?: number | null;
  tasksTotal?: number | null;
  recommendation?: string | null;
  notYetOpened?: string[];
  offer?: string;
  skills?: string;
  company?: Record<string, string>;
};

type ChatBody = {
  message?: string;
  intent?: string;
  responseDepth?: number;
  repeatDetected?: boolean;
  lastAssistantMessage?: string;
  agent?: { name?: string; role?: string; persona?: string };
  history?: { role: string; name?: string; content: string }[];
  context?: {
    sim?: Record<string, unknown>;
    pres?: Record<string, unknown>;
    state?: Record<string, unknown>;
    stage?: string;
    companyProfile?: Record<string, string>;
    sessionSnapshot?: SessionSnapshot;
  };
};

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: "local" }, { status: 503 });
  }

  const agent = body.agent || {};
  const snap = body.context?.sessionSnapshot || {};
  const co = snap.company || body.context?.companyProfile || {};
  const depth = body.responseDepth ?? 0;
  const persona = agent.persona || "coworker";

  const system = [
    `You are ${agent.name || "a teammate"}, ${agent.role || "analyst"} on a LIVE M&A simulation hiring assessment.`,
    `Persona: ${persona}. Speak as a busy coworker on the deal team - not a generic chatbot.`,
    "",
    "SESSION SNAPSHOT (ground truth - use this to give SPECIFIC instructions):",
    JSON.stringify({
      elapsedMin: snap.elapsedMin,
      remainingMin: snap.remainingMin,
      sheetEdits: snap.sheetEdits,
      tabsOpened: snap.tabsVisited,
      tabsNotOpened: snap.notYetOpened,
      workbookProgress: snap.workbookDone,
      recommendation: snap.recommendation,
      offer: snap.offer,
      skillsScored: snap.skills
    }),
    "",
    "COMPANY:",
    JSON.stringify(co),
    "",
    `Response depth tier: ${depth} (0=overview, 1=concrete UI steps, 2=cell-level + time pressure).`,
    body.repeatDetected ? "USER REPEATED A SIMILAR QUESTION - you MUST give NEW detail (tabs, cells, minutes), NEVER repeat your prior message." : "",
    body.lastAssistantMessage ? `YOUR LAST MESSAGE (do NOT copy verbatim): "${body.lastAssistantMessage.slice(0, 300)}"` : "",
    "",
    "RULES:",
    "1. Answer the candidate's ACTUAL question in 3-7 sentences.",
    "2. 'What do I do' / 'specifically' → numbered steps with **tab names** (Overview, Financials, Valuation, Risks) and **cells** (B9 terminal growth, B10 WACC, B14 EV) when depth≥1.",
    "3. Reference session snapshot: if they haven't opened Financials or have 0 model edits, say that explicitly.",
    "4. Off-topic (sports, jokes, slang) → brief redirect to the deal; do NOT answer off-topic.",
    "5. Company questions → explain what the business does using COMPANY facts.",
    "6. Use **bold** for UI labels and numbers. Never repeat prior assistant text."
  ].filter(Boolean).join("\n");

  const historyMessages = (body.history || []).slice(-8).map((h) => ({
    role: h.role === "user" ? "user" as const : "assistant" as const,
    content: h.name ? `${h.name}: ${h.content}` : h.content
  }));

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
          ...historyMessages,
          { role: "user", content: message }
        ],
        max_tokens: 450,
        temperature: 0.75
      })
    });

    if (!res.ok) return NextResponse.json({ fallback: "local" }, { status: 502 });

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ fallback: "local" }, { status: 502 });

    return NextResponse.json({ text, provider: "openai" });
  } catch {
    return NextResponse.json({ fallback: "local" }, { status: 500 });
  }
}
