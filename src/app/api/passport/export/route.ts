import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { exportPassport, PASSPORT_EXPORT_VERSION } from "@/lib/passport/export";
import { getOwnerPassport, listCorrections } from "@/lib/passport/store";
import { getPresentations } from "@/lib/passport/presentation-store";

export const runtime = "nodejs";

/**
 * Downloadable, usable record of the candidate's own passport (PASS-08).
 * Contains only the candidate's data plus their corrections - never
 * employer-private notes or hidden assessment material.
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const passport = await getOwnerPassport(user.id);
  if (!passport) return NextResponse.json({ error: "No passport to export yet." }, { status: 404 });
  const [corrections, presentations] = await Promise.all([listCorrections(user.id), getPresentations(user.id, passport.projects)]);
  const record = {
    ...exportPassport(passport, corrections),
    projectPresentations: presentations.filter((p) => p.id !== null).map((p) => ({ ...p, id: undefined, version: undefined })),
  };
  return new NextResponse(JSON.stringify(record, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fydell-passport-${PASSPORT_EXPORT_VERSION}.json"`,
    },
  });
}
