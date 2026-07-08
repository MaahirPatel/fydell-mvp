import { NextRequest, NextResponse } from "next/server";
import { getCompanySession } from "@/lib/auth";
import { createRole, deleteRole, listRolesForUser } from "@/lib/platform-store";

export async function GET() {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = await listRolesForUser(session.userId);
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; department?: string; level?: string; skills?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const role = await createRole(session.userId, {
    title: body.title,
    department: body.department,
    level: body.level,
    skills: body.skills
  });
  return NextResponse.json({ role });
}

export async function DELETE(req: NextRequest) {
  const session = await getCompanySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const ok = await deleteRole(session.userId, id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
