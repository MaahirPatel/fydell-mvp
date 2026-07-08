import { NextResponse } from "next/server";
import { getSimulation } from "@/lib/platform-store";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sim = await getSimulation(id);
  if (!sim) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ simulation: sim });
}
