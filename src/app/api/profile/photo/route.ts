import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { ProfileInputError, getOrCreateProfile, removeProfilePhoto, setProfilePhoto } from "@/lib/profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upload or replace the profile photo. Body: multipart form with a `photo` file. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to change your photo." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  try {
    await getOrCreateProfile(user.id, user.email.split("@")[0]);
    const profile = await setProfilePhoto(user.id, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ avatarUrl: profile.avatarUrl });
  } catch (err) {
    if (err instanceof ProfileInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Could not save the photo. Try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to change your photo." }, { status: 401 });
  try {
    await removeProfilePhoto(user.id);
    return NextResponse.json({ avatarUrl: "" });
  } catch {
    return NextResponse.json({ error: "Could not remove the photo. Try again." }, { status: 500 });
  }
}
