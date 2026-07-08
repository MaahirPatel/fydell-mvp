import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { upsertScore } from "@/lib/db";
import type { Score } from "@/lib/types";

const BOOL_KEYS: (keyof Score)[] = [
  "error_1_found",
  "error_2_found",
  "error_3_found",
  "uncertainty_communicated",
  "updated_view",
  "genuine_reasoning"
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Partial<Score> = {};
  for (const key of BOOL_KEYS) {
    if (typeof body[key] === "boolean") patch[key] = body[key] as never;
  }
  if (typeof body.admin_notes === "string") {
    patch.admin_notes = body.admin_notes as never;
  }

  await upsertScore(id, patch);
  return NextResponse.json({ ok: true });
}
