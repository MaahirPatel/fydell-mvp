import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type DebriefBody = {
  simTitle?: string;
  role?: string;
  sectorKey?: string;
  overallScore?: number;
  verdict?: string;
  hardSkills?: { name: string; score: number; evidence?: string }[];
  softSkills?: { name: string; score: number; evidence?: string }[];
  caught?: { label: string }[];
  missed?: { label: string }[];
  sessionMeta?: Record<string, string | number | boolean>;
  sessionLog?: { type?: string; title?: string; detail?: string; at?: number }[];
  aiAssistLog?: { question?: string; answer?: string }[];
  chatMessages?: { fromUser?: boolean; text?: string; stage?: string }[];
  recommendation?: string;
  channelScores?: Record<string, { score?: number; signals?: string[] }>;
  modelSummary?: string;
};

export async function POST(req: NextRequest) {
  let body: DebriefBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fallback: "local" }, { status: 503 });
  }

  const userChat = (body.chatMessages || []).filter((m) => m.fromUser);
  const chatSample = userChat.slice(-6).map((m) => m.text?.slice(0, 100)).join(" | ");
  const aiSample = (body.aiAssistLog || []).slice(-3).map((e) => e.question?.slice(0, 80)).join(" | ");
  const logSample = (body.sessionLog || []).slice(-8).map((e) => `${e.title}: ${e.detail || ""}`).join("\n");

  const system = [
    "You are Fydell post-session hiring coach. Write direct, evidence-based feedback.",
    "Return ONLY valid JSON: { executive: string (2-4 sentences with **bold**), verdict: string (one punchy hiring line), coachMessages: [{ role: 'coach', text: string }] } with exactly 3 coach messages.",
    "Reference ACTUAL session behavior: workbook completion, chat quality, model edits, AI questions, errors caught/missed.",
    "If score < 35, say clearly they did not demonstrate hire-ready work. If they only sent greetings, say that.",
    "Use channel scores if provided. Quote specific gaps from session log when possible."
  ].join(" ");

  const user = JSON.stringify({
    sim: body.simTitle,
    role: body.role,
    sector: body.sectorKey,
    score: body.overallScore,
    verdict: body.verdict,
    hard: body.hardSkills?.map((s) => `${s.name}:${s.score} (${s.evidence?.slice(0, 60) || ""})`),
    soft: body.softSkills?.map((s) => `${s.name}:${s.score}`),
    caught: body.caught?.map((e) => e.label),
    missed: body.missed?.map((e) => e.label),
    meta: body.sessionMeta,
    channels: body.channelScores,
    modelSummary: body.modelSummary,
    recommendation: body.recommendation,
    chatSample,
    aiQuestions: aiSample,
    sessionLog: logSample
  });

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
        temperature: 0.42
      })
    });

    if (!res.ok) {
      return NextResponse.json({ fallback: "local" }, { status: 502 });
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return NextResponse.json({ fallback: "local" }, { status: 502 });

    const parsed = JSON.parse(raw) as {
      executive?: string;
      verdict?: string;
      coachMessages?: { role: string; text: string }[];
    };

    return NextResponse.json({
      provider: "openai",
      narrative: parsed.executive ? { executive: parsed.executive } : undefined,
      verdict: parsed.verdict,
      coachMessages: Array.isArray(parsed.coachMessages) ? parsed.coachMessages : undefined
    });
  } catch {
    return NextResponse.json({ fallback: "local" }, { status: 500 });
  }
}
