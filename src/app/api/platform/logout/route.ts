import { NextResponse } from "next/server";
import { clearCompanySession } from "@/lib/auth";

export async function POST() {
  await clearCompanySession();
  return NextResponse.json({ ok: true });
}
