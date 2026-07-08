import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GenerateBody = {
  prompt?: string;
  simId?: string;
  sceneIndex?: number;
  width?: number;
  height?: number;
  sectorKey?: string;
};

const ENTERPRISE_PROMPT_SUFFIX =
  "Ultra photorealistic architectural visualization, wide elevated cinematic view of a modern glass corporate workplace, bustling city street, controlled dusk lighting, premium commercial render quality, no watermark, no cartoon.";

function enhancePrompt(prompt: string, sectorKey?: string) {
  const base = prompt.trim();
  if (/headquarters|office|workplace/i.test(base)) {
    return `${base}. ${ENTERPRISE_PROMPT_SUFFIX}`;
  }
  if (sectorKey === "fastfood") {
    return `${base}. Photorealistic quick-service restaurant flagship, drive-thru lane, branded signage, suburban intersection, golden hour, marketing render quality.`;
  }
  return `${base}. Photorealistic architectural visualization, cinematic lighting, professional commercial render, 16:9 widescreen, no watermark.`;
}

/**
 * AI image endpoint for simulation hero scenes.
 * Set OPENAI_API_KEY for photorealistic product renders.
 */
export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured", fallback: "stock" },
      { status: 503 }
    );
  }

  const finalPrompt = enhancePrompt(prompt, body.sectorKey).slice(0, 4000);

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: "1792x1024",
        quality: "hd",
        response_format: "url",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI image error:", errText);
      return NextResponse.json({ error: "Image generation failed", fallback: "stock" }, { status: 502 });
    }

    const data = (await res.json()) as { data?: { url?: string }[] };
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned", fallback: "stock" }, { status: 502 });
    }

    return NextResponse.json({
      imageUrl,
      provider: "openai",
      simId: body.simId,
      sceneIndex: body.sceneIndex,
    });
  } catch (e) {
    console.error("Visual generate error:", e);
    return NextResponse.json({ error: "Server error", fallback: "stock" }, { status: 500 });
  }
}
