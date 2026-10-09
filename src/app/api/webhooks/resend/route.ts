import { NextResponse } from "next/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { svixHeaders, verifySvixSignature } from "@/lib/security/webhook-signature";
import { providerStatusFor, statusesBelow } from "@/lib/ops/email-status";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  if (!verifySvixSignature(raw, svixHeaders(req.headers), secret).ok) {
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

    const status = providerStatusFor(eventType);
    if (outbox && status) {
      const { data: advanced } = await admin
        .from("email_outbox")
        .update({
          status,
          last_error:
            eventType === "email.bounced" || eventType === "email.failed"
              ? body.data?.bounce?.message || eventType
              : null,
        })
        .eq("id", outbox.id)
        .in("status", statusesBelow(status))
        .select("id");

      if (
        advanced?.length &&
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
