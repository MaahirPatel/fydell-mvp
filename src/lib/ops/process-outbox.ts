import "server-only";
import { Resend } from "resend";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { renderEmailTemplate } from "@/lib/ops/email-outbox";

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your")) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return (
    process.env.EMAIL_FROM_TRANSACTIONAL ||
    process.env.EMAIL_FROM ||
    "Fydell <admin@fydell.com>"
  );
}

export async function processEmailOutbox(limit = 20): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  if (!isSupabaseConfigured()) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const admin = getSupabaseAdmin();
  const workerId = `worker-${process.pid}-${Date.now()}`;
  const now = new Date().toISOString();

  const { data: pending, error } = await admin
    .from("email_outbox")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("scheduled_for", now)
    .lt("attempt_count", 5)
    .order("priority", { ascending: true })
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!pending?.length) return { processed: 0, sent: 0, failed: 0 };

  const client = resendClient();
  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    // Claim
    const { data: claimed } = await admin
      .from("email_outbox")
      .update({
        status: "processing",
        locked_at: now,
        locked_by: workerId,
        attempt_count: (row.attempt_count || 0) + 1,
      })
      .eq("id", row.id)
      .in("status", ["pending", "failed"])
      .select("id")
      .maybeSingle();

    if (!claimed) continue;

    if (!client) {
      await admin
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: "RESEND_API_KEY is not configured",
          locked_at: null,
          locked_by: null,
          scheduled_for: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .eq("id", row.id);
      failed += 1;
      continue;
    }

    try {
      const rendered = renderEmailTemplate(row.template_key, row.payload || {});
      const subject = row.subject_override || rendered.subject;
      const result = await client.emails.send({
        from: fromAddress(),
        to: row.recipient_email,
        replyTo: row.reply_to || process.env.EMAIL_REPLY_TO || undefined,
        subject,
        html: rendered.html,
      });

      const messageId =
        (result.data as { id?: string } | null)?.id ||
        `resend-${row.id}-${Date.now()}`;

      await admin
        .from("email_outbox")
        .update({
          status: "sent",
          provider_message_id: messageId,
          sent_at: new Date().toISOString(),
          last_error: null,
          locked_at: null,
          locked_by: null,
        })
        .eq("id", row.id);

      if (row.related_entity_type === "pilot_request" && row.related_entity_id) {
        const patch =
          row.template_key === "pilot_request_received"
            ? { acknowledgment_email_status: "sent" }
            : row.template_key === "admin_new_pilot_request"
              ? { admin_notification_status: "sent" }
              : null;
        if (patch) {
          await admin.from("pilot_requests").update(patch).eq("id", row.related_entity_id);
        }
        await admin.from("pilot_request_events").insert({
          pilot_request_id: row.related_entity_id,
          event_type:
            row.template_key === "pilot_request_received"
              ? "acknowledgment_sent"
              : "admin_notification_sent",
          description: `Email marked sent (${row.template_key})`,
          metadata: { outbox_id: row.id, provider_message_id: messageId },
        });
      }

      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      const attempts = (row.attempt_count || 0) + 1;
      const backoffMinutes = Math.min(60, 2 ** Math.min(attempts, 5));
      await admin
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: message.slice(0, 500),
          locked_at: null,
          locked_by: null,
          scheduled_for: new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString(),
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return { processed: pending.length, sent, failed };
}
