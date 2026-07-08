import { NextResponse } from "next/server";
import { clearMvpSession } from "@/lib/mvp/auth";

export async function POST() {
  await clearMvpSession();
  return NextResponse.json({ ok: true });
}
