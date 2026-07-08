import { NextResponse } from "next/server";
import { getEmployerSession } from "@/lib/auth";
import { createFeedback, getEmployerByToken } from "@/lib/db";
import { sendFeedbackNotification } from "@/lib/email";

function clampRating(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(1, n));
}

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
  const payload = {
    q1_rating: clampRating(body.q1_rating),
    q1_text: (body.q1_text ?? "").toString(),
    q2_rating: clampRating(body.q2_rating),
    q2_text: (body.q2_text ?? "").toString(),
    q3_rating: clampRating(body.q3_rating),
    q3_text: (body.q3_text ?? "").toString()
  };

  if (!payload.q1_rating || !payload.q2_rating || !payload.q3_rating) {
    return NextResponse.json(
      { error: "Please rate all three questions." },
      { status: 400 }
    );
  }

  await createFeedback(employer.id, payload);

  const avg = (payload.q1_rating + payload.q2_rating + payload.q3_rating) / 3;
  const adminTo = process.env.ADMIN_EMAIL;
  if (adminTo) {
    await sendFeedbackNotification({
      to: adminTo,
      employerName: employer.name,
      averageRating: avg
    });
  }

  return NextResponse.json({ ok: true });
}
