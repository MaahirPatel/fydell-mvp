/**
 * Shared wiring for /api/employer routes (employer chunk).
 *
 * The state rules live in src/lib/invitations and src/lib/employer and are
 * covered by scripts/test-employer-grind-*.ts. Store persistence against
 * Supabase is NEEDS-LIVE: the functions below return in-memory stores today
 * so the routes are reviewable and the rules stay testable; swapping in
 * Supabase-backed stores is the only live-environment step.
 */
import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/ops/email-outbox";
import {
  createInvitationMemoryStore,
  type InvitationStore,
} from "@/lib/invitations/types";
import { createAuditMemoryStore, type AuditStore } from "@/lib/employer/audit";
import type { InvitationMailer } from "@/lib/invitations/types";

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * NEEDS-LIVE: replace with Supabase-backed stores (sim_candidate_invitations
 * + invitation audit events). Rules stay in the lib; only persistence moves.
 */
export function getEmployerStores(): {
  invites: InvitationStore;
  audit: AuditStore;
} {
  return {
    invites: createInvitationMemoryStore(),
    audit: createAuditMemoryStore(),
  };
}

/** Async live lookup of the current pinned versions for a template. */
export async function pinLiveTemplateVersion(
  templateId: string
): Promise<{ scenarioVersionId: string; rubricVersionId: string } | null> {
  const admin = createAdminSupabaseClient();
  const { data: t } = await admin
    .from("sim_templates")
    .select("id, current_version_id, status")
    .eq("id", templateId)
    .maybeSingle();
  if (!t || t.status !== "published" || !t.current_version_id) return null;
  const { data: v } = await admin
    .from("sim_template_versions")
    .select("id, rubric_version_id")
    .eq("id", t.current_version_id)
    .maybeSingle();
  if (!v) return null;
  return {
    scenarioVersionId: v.id as string,
    // Rubrics travel with the scenario version row when no separate rubric
    // version exists; the pin is explicit either way.
    rubricVersionId: ((v as { rubric_version_id?: string }).rubric_version_id ?? v.id) as string,
  };
}

/** InvitationMailer backed by the email outbox (enqueueEmail). */
export function outboxMailer(input: { orgName: string; roleTitle: string }): InvitationMailer {
  return {
    queueInviteEmail: async (mail) => {
      try {
        const result = await enqueueEmail({
          eventType: mail.kind === "initial" ? "candidate_invite_sent" : "candidate_invite_resent",
          templateKey: "candidate_work_trial_invite",
          recipientEmail: mail.toEmail,
          recipientName: mail.candidateName,
          payload: {
            name: mail.candidateName ?? "there",
            company: input.orgName,
            role: input.roleTitle,
            actionUrl: mail.inviteUrl,
          },
          relatedEntityType: "candidate_invitation",
          relatedEntityId: mail.invitationId,
          idempotencyKey: `candidate-invite:${mail.invitationId}:${mail.kind}`,
        });
        // enqueueEmail returns null when email is not configured: the
        // copyable secure invite link remains the delivery channel (EMP-05).
        return result
          ? { queued: true, deliveryStatus: "queued" as const }
          : { queued: false, deliveryStatus: "link_only" as const };
      } catch {
        // Never fail the invite when email is down.
        return { queued: false, deliveryStatus: "link_only" as const };
      }
    },
  };
}
