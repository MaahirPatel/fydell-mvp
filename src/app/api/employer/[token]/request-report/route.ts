import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getEmployerSession } from "@/lib/auth";
import { getEmployerByToken } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const employer = await getEmployerByToken(token);
  if (!employer) {
    return NextResponse.json({ error: "Unknown employer link." }, { status: 404 });
  }

  const sessionEmp = await getEmployerSession();
  if (!sessionEmp || sessionEmp.token !== token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const candidateName = (body.candidateName ?? "a candidate").toString();

  const key = process.env.RESEND_API_KEY;
  const adminTo = process.env.ADMIN_EMAIL;
  if (!key || key.startsWith("re_your") || !adminTo) {
    // Never pretend the request was delivered when no provider is configured.
    return NextResponse.json(
      {
        error:
          "Email delivery is not configured, so the report request could not be sent. Contact Fydell directly.",
      },
      { status: 503 }
    );
  }

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Fydell <noreply@fydell.com>",
      to: adminTo,
      subject: `Report request from ${employer.name}`,
      html: `<p><strong>${employer.name}</strong> requested the full PDF report for <strong>${candidateName}</strong>.</p>`,
    });
    if (error) {
      return NextResponse.json(
        { error: `The report request email failed to send: ${error.message}` },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `The report request email failed to send: ${
          err instanceof Error ? err.message : "unknown provider error"
        }`,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
