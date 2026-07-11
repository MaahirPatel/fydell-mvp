import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

function verifyResendSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  // Resend uses Svix-style headers in many setups: t=...,v1=...
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k.trim(), v?.trim() || ""];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    // Fallback: raw hex hmac of body
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }
  const signed = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function mapEventStatus(type: string): string | null {
  switch (type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delayed";
    case "email.bounced":
      return "bounced";
    case "email.failed":
      return "failed";
    case "email.complained":
      return "failed";
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";
  const raw = await req.text();
  const signature =
    req.headers.get("resend-signature") ||
    req.headers.get("svix-signature") ||
    req.headers.get("webhook-signature");

  if (!secret || !verifyResendSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    type?: string;
    created_at?: string;
    data?: {
      email_id?: string;
      to?: string[] | string;
      bounce?: { message?: string };
    };
    id?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = getSupabaseAdmin();
  const eventType = String(body.type || "unknown");
  const providerEventId = String(body.id || `${eventType}:${body.data?.email_id || raw.slice(0, 40)}`);
  const providerMessageId = body.data?.email_id || null;
  const recipient = Array.isArray(body.data?.to)
    ? body.data?.to[0]
    : typeof body.data?.to === "string"
      ? body.data.to
      : null;

  const { data: existing } = await admin
    .from("email_events")
    .select("id")
    .eq("provider_event_id", providerEventId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let outboxId: string | null = null;
  if (providerMessageId) {
    const { data: outbox } = await admin
      .from("email_outbox")
      .select("id, related_entity_type, related_entity_id")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle();
    outboxId = outbox?.id || null;

    const status = mapEventStatus(eventType);
    if (outbox && status) {
      await admin
        .from("email_outbox")
        .update({
          status,
          last_error:
            eventType === "email.bounced" || eventType === "email.failed"
              ? body.data?.bounce?.message || eventType
              : null,
        })
        .eq("id", outbox.id);

      if (
        outbox.related_entity_type === "pilot_request" &&
        outbox.related_entity_id &&
        (eventType === "email.delivered" || eventType === "email.bounced" || eventType === "email.failed")
      ) {
        await admin.from("pilot_request_events").insert({
          pilot_request_id: outbox.related_entity_id,
          event_type: `email_${status}`,
          description: `Provider event ${eventType}`,
          metadata: { provider_event_id: providerEventId },
        });
      }
    }
  }

  await admin.from("email_events").insert({
    provider_event_id: providerEventId,
    email_outbox_id: outboxId,
    provider_message_id: providerMessageId,
    event_type: eventType,
    recipient_email: recipient,
    occurred_at: body.created_at || new Date().toISOString(),
    payload: body,
  });

  if ((eventType === "email.bounced" || eventType === "email.complained") && recipient) {
    await admin.from("email_suppressions").upsert(
      {
        email: recipient.toLowerCase(),
        reason: eventType === "email.complained" ? "complaint" : "hard_bounce",
        source: "resend_webhook",
      },
      { onConflict: "email" }
    );
  }

  return NextResponse.json({ ok: true });
}
