import { NextResponse } from "next/server";
import { getCompanySession } from "@/lib/auth";
import { listSimulationsForUser } from "@/lib/platform-store";

export async function GET() {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sims = await listSimulationsForUser(session.userId);
  return NextResponse.json({ simulations: sims });
}
