import { NextResponse } from "next/server";
import { getCompanySession } from "@/lib/auth";
import { completeOnboarding } from "@/lib/platform-store";
import type { OnboardingAnswers } from "@/lib/platform-types";

export async function POST(req: Request) {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const answers = (await req.json()) as OnboardingAnswers;
  const required: (keyof OnboardingAnswers)[] = [
    "hearAbout",
    "companySize",
    "yourRole",
    "hiresPerYear",
    "primaryUse",
    "hiringFor",
    "hiringPain",
    "simulationPriority"
  ];
  for (const k of required) {
    if (!answers[k]?.trim()) {
      return NextResponse.json({ error: "Please complete every step." }, { status: 400 });
    }
  }
  await completeOnboarding(session.userId, answers);
  return NextResponse.json({ ok: true });
}
