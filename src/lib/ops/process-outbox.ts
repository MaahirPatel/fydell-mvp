import "server-only";
import { Resend } from "resend";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { renderEmailTemplate } from "@/lib/ops/email-outbox";
import { DIRECT_TEMPLATE_PREFIX, isProductionDeployment } from "@/lib/email";
import { routeRecipient } from "@/lib/email-html";

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

const MAX_ATTEMPTS = 5;
const STALE_LOCK_MS = 10 * 60 * 1000;

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
  // A worker killed after claiming leaves its row in "processing"; after this
  // long the row is taken over. The provider idempotency key below makes the
  // takeover safe even if the first worker did send.
  const staleLock = new Date(Date.now() - STALE_LOCK_MS).toISOString();
  const claimable = `status.in.(pending,failed),and(status.eq.processing,locked_at.lt.${staleLock})`;

  const { data: pending, error } = await admin
    .from("email_outbox")
    .select("*")
    .or(`and(status.in.(pending,failed),scheduled_for.lte.${now},attempt_count.lt.${MAX_ATTEMPTS}),and(status.eq.processing,locked_at.lt.${staleLock})`)
    .order("priority", { ascending: true })
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!pending?.length) return { processed: 0, sent: 0, failed: 0 };

  const client = resendClient();
  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    if (row.status === "processing" && (row.attempt_count || 0) >= MAX_ATTEMPTS) {
      await admin
        .from("email_outbox")
        .update({
          status: "failed",
          last_error: "The worker sending this email stopped responding on its last attempt. Check the provider log before resending.",
          locked_at: null,
          locked_by: null,
        })
        .eq("id", row.id)
        .eq("status", "processing")
        .lt("locked_at", staleLock);
      failed += 1;
      continue;
    }

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
      .or(claimable)
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

    const route = routeRecipient(String(row.recipient_email), isProductionDeployment());
    if (String(row.template_key).startsWith(DIRECT_TEMPLATE_PREFIX) || "refused" in route) {
      await admin
        .from("email_outbox")
        .update({
          status: "cancelled",
          last_error: "refused" in route ? route.refused : "Sent immediately when it was created; the queue does not resend it. Resend from the product to issue a fresh link.",
          locked_at: null,
          locked_by: null,
        })
        .eq("id", row.id);
      failed += 1;
      continue;
    }

    try {
      const rendered = renderEmailTemplate(row.template_key, row.payload || {});
      const subject = row.subject_override || rendered.subject;
      const result = await client.emails.send(
        {
          from: fromAddress(),
          to: route.to,
          replyTo: row.reply_to || process.env.EMAIL_REPLY_TO || undefined,
          subject,
          html: rendered.html,
        },
        { idempotencyKey: `outbox-${row.id}` },
      );
      if (result.error) throw new Error(result.error.message || "The email provider rejected the message.");

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
