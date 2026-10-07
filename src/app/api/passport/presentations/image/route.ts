import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { IMAGE_MAX_BYTES } from "@/lib/passport/presentation";
import { removePresentationImage, setPresentationImage, setPresentationImageAlt, type ImageResult } from "@/lib/passport/presentation-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const keyOf = (v: unknown): string => (typeof v === "string" && v.length >= 3 && v.length <= 200 ? v : "");

async function owner(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return { response: blocked } as const;
  const user = await requireUser();
  if (!user) return { response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  return { user } as const;
}

function reply(result: ImageResult) {
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ presentation: result.value });
}

/** POST multipart { projectKey, alt, image } - add or replace a project's image. */
export async function POST(req: Request) {
  const auth = await owner(req);
  if ("response" in auth) return auth.response;
  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  const key = keyOf(form?.get("projectKey"));
  if (!key) return NextResponse.json({ error: "That project is not in your profile." }, { status: 404 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size > IMAGE_MAX_BYTES) return NextResponse.json({ error: "Use an image under 2 MB." }, { status: 400 });
  return reply(await setPresentationImage(auth.user.id, key, new Uint8Array(await file.arrayBuffer()), form?.get("alt")));
}

/** PATCH { projectKey, alt } - change the image description. */
export async function PATCH(req: Request) {
  const auth = await owner(req);
  if ("response" in auth) return auth.response;
  const b = (await req.json().catch(() => null)) as unknown;
  const body = typeof b === "object" && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
  const key = keyOf(body.projectKey);
  if (!key) return NextResponse.json({ error: "That project is not in your profile." }, { status: 404 });
  return reply(await setPresentationImageAlt(auth.user.id, key, body.alt));
}

/** DELETE ?projectKey=… - remove the image. */
export async function DELETE(req: Request) {
  const auth = await owner(req);
  if ("response" in auth) return auth.response;
  const key = keyOf(new URL(req.url).searchParams.get("projectKey"));
  if (!key) return NextResponse.json({ error: "That project is not in your profile." }, { status: 404 });
  return reply(await removePresentationImage(auth.user.id, key));
}
