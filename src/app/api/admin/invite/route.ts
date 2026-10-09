import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/security/request-body";
import { getAdminSession } from "@/lib/auth";
import { createInvite } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import { rateLimit } from "@/lib/security/rate-limit";
import { appUrl } from "@/lib/app-url";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const rl = rateLimit(`invite:${session.email}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many invites. Try again later." }, { status: 429 });

  const body = await readJsonObject(req);
  const name = (body.name ?? "").toString().trim();
  const email = (body.email ?? "").toString().trim();
  const employerName = (body.employerName ?? "").toString().trim();
  const role = (body.role ?? "").toString().trim();

  if (!name || !email || !employerName || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  try {
    const { employer, invitationToken } = await createInvite({
      name,
      email,
      employerName,
      role
    });

    const base = appUrl();
    const inviteUrl = `${base}/apply/${invitationToken}`;
    const employerUrl = `${base}/employer/${employer.token}`;

    const emailed = await sendInviteEmail({
      to: email,
      name,
      employerName,
      role,
      inviteUrl
    });

    return NextResponse.json({
      inviteUrl,
      employerName: employer.name,
      employerUrl,
      employerPasscode: employer.passcode,
      emailed
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create the invite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
