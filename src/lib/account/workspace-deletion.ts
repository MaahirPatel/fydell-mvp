import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { escapeHtml, fydellEmailShell, sendTrackedEmail } from "@/lib/email";
import { writeAudit } from "@/lib/ops/platform-roles";

const OPEN_STATUSES = ["received", "identity_verified", "tracing", "fulfilling"] as const;

export type WorkspaceDeletionRequest = { id: string; receivedAt: string; status: string };

/**
 * Deleting a workspace erases every candidate record it holds, and the
 * organization may be required to keep hiring records for years. So it is a
 * recorded request that Fydell confirms with the owner before acting, never an
 * instant button.
 */
export async function openWorkspaceDeletion(organizationId: string): Promise<WorkspaceDeletionRequest | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("data_subject_requests")
    .select("id, status, received_at")
    .eq("request_type", "deletion")
    .eq("details->>scope", "workspace")
    .eq("details->>organization_id", organizationId)
    .in("status", [...OPEN_STATUSES])
    .order("received_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, receivedAt: data.received_at as string, status: data.status as string };
}

export type WorkspaceDeletionResult =
  | { ok: true; request: WorkspaceDeletionRequest; alreadyOpen: boolean }
  | { ok: false; status: number; error: string };

export async function requestWorkspaceDeletion(
  user: { id: string; email: string },
  org: { organizationId: string; organizationName: string; role: string },
): Promise<WorkspaceDeletionResult> {
  if (org.role !== "owner") return { ok: false, status: 403, error: "Only a workspace owner can ask for the workspace to be deleted." };

  const existing = await openWorkspaceDeletion(org.organizationId);
  if (existing) return { ok: true, request: existing, alreadyOpen: true };

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("data_subject_requests")
    .insert({
      requester_user_id: user.id,
      request_type: "deletion",
      contact_email: user.email,
      details: { scope: "workspace", organization_id: org.organizationId, organization_name: org.organizationName, source: "employer_settings" },
    })
    .select("id, status, received_at")
    .single();
  if (error || !data) return { ok: false, status: 500, error: "The request was not recorded. Try again." };
  const request = { id: data.id as string, receivedAt: data.received_at as string, status: data.status as string };

  await writeAudit({
    actorEmail: user.email,
    actorUserId: user.id,
    action: "workspace_deletion_requested",
    entityType: "data_subject_requests",
    entityId: request.id,
    organizationId: org.organizationId,
  });

  const ops = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (ops) {
    const sent = await sendTrackedEmail({
      to: ops,
      subject: `Workspace deletion requested: ${org.organizationName}`,
      html: fydellEmailShell(
        `<h1 style="color:#08090C;font-size:20px;margin:0 0 12px">Workspace deletion requested</h1>
        <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0">${escapeHtml(user.email)} asked to delete <strong>${escapeHtml(org.organizationName)}</strong>. Confirm with them, check retention obligations, then fulfil request ${escapeHtml(request.id)}.</p>`,
      ),
      template: "workspace_deletion_requested",
      eventType: "workspace_deletion_requested",
      idempotencyKey: `workspace_deletion:${request.id}`,
      relatedEntityType: "data_subject_request",
      relatedEntityId: request.id,
    });
    if (sent.delivery === "failed") console.error(`[account] workspace deletion ${request.id} notification failed`);
  }
  return { ok: true, request, alreadyOpen: false };
}
