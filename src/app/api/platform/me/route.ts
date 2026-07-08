import { NextResponse } from "next/server";
import { getCompanySession } from "@/lib/auth";
import { getUserById } from "@/lib/platform-store";

export async function GET() {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ user: null });
  const user = await getUserById(session.userId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      companyName: user.companyName,
      onboardingComplete: user.onboardingComplete
    }
  });
}
