import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { getOwnerPassport } from "@/lib/passport/store";
import { accountDisplayName } from "@/lib/auth/account-name";
import { parsePresentationInput } from "@/lib/passport/presentation";
import {
  arrangePresentations,
  createManualProject,
  deleteManualProject,
  getPresentations,
  savePresentation,
} from "@/lib/passport/presentation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function body(req: Request): Promise<Record<string, unknown> | null> {
  const b = (await req.json().catch(() => null)) as unknown;
  return typeof b === "object" && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
}

const versionOf = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
const keyOf = (v: unknown): string => (typeof v === "string" && v.length >= 3 && v.length <= 200 ? v : "");

async function signedIn(req: Request, mutate: boolean) {
  if (mutate) {
    const blocked = csrfGuard(req);
    if (blocked) return { response: blocked } as const;
  }
  const user = await requireUser();
  if (!user) return { response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  return { user } as const;
}

/** GET - every project on the owner's profile, with drafts for unpresented repositories. */
export async function GET(req: Request) {
  const auth = await signedIn(req, false);
  if ("response" in auth) return auth.response;
  const passport = await getOwnerPassport(auth.user.id);
  return NextResponse.json({ presentations: await getPresentations(auth.user.id, passport?.projects ?? []) });
}

/** POST { clientRequestId, confirmDuplicate?, presentation } - add a project with no analyzed source. */
export async function POST(req: Request) {
  const auth = await signedIn(req, true);
  if ("response" in auth) return auth.response;
  const b = await body(req);
  const input = parsePresentationInput(b?.presentation);
  if (input.ok === false) return NextResponse.json({ error: input.error }, { status: 400 });
  const result = await createManualProject(
    { id: auth.user.id, displayName: await accountDisplayName(auth.user.id, auth.user.email) },
    input.value,
    typeof b?.clientRequestId === "string" ? b.clientRequestId : "",
    b?.confirmDuplicate === true,
  );
  if (result.ok === false) return NextResponse.json({ error: result.error, duplicateOf: result.duplicateOf }, { status: result.status });
  return NextResponse.json({ presentation: result.value, reused: result.reused ?? false }, { status: result.reused ? 200 : 201 });
}

/** PUT { projectKey, expectedVersion, presentation } - save and confirm one project's presentation. */
export async function PUT(req: Request) {
  const auth = await signedIn(req, true);
  if ("response" in auth) return auth.response;
  const b = await body(req);
  const key = keyOf(b?.projectKey);
  if (!key) return NextResponse.json({ error: "That project is not in your profile." }, { status: 404 });
  const expected = versionOf(b?.expectedVersion);
  if (expected === null) return NextResponse.json({ error: "Missing the version you edited." }, { status: 400 });
  const input = parsePresentationInput(b?.presentation);
  if (input.ok === false) return NextResponse.json({ error: input.error }, { status: 400 });
  const result = await savePresentation(auth.user.id, key, input.value, expected);
  if (result.ok === false) return NextResponse.json({ error: result.error, current: result.current }, { status: result.status });
  return NextResponse.json({ presentation: result.value });
}

/** PATCH { order: [{ projectKey, featured }] } - order and featured set for the whole profile. */
export async function PATCH(req: Request) {
  const auth = await signedIn(req, true);
  if ("response" in auth) return auth.response;
  const b = await body(req);
  if (!Array.isArray(b?.order) || b.order.length > 200) return NextResponse.json({ error: "Send the full project order." }, { status: 400 });
  const order: { projectKey: string; featured: boolean }[] = [];
  for (const entry of b.order as unknown[]) {
    if (!entry || typeof entry !== "object") return NextResponse.json({ error: "Send the full project order." }, { status: 400 });
    const e = entry as Record<string, unknown>;
    const key = keyOf(e.projectKey);
    if (!key) return NextResponse.json({ error: "Send the full project order." }, { status: 400 });
    order.push({ projectKey: key, featured: e.featured === true });
  }
  const result = await arrangePresentations(auth.user.id, order);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

/** DELETE ?projectKey=manual:… - remove a manual project. Analyzed repositories are removed from the work record instead. */
export async function DELETE(req: Request) {
  const auth = await signedIn(req, true);
  if ("response" in auth) return auth.response;
  const removed = await deleteManualProject(auth.user.id, keyOf(new URL(req.url).searchParams.get("projectKey")));
  return removed ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Project not found." }, { status: 404 });
}
