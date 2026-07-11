import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type OpsMetrics = {
  newPilotRequests: number;
  unassignedPilotRequests: number;
  awaitingContact: number;
  approvedPilots: number;
  activeOrganizations: number;
  failedEmails: number;
  bouncedEmails: number;
  pendingEmails: number;
};

export async function getOpsMetrics(): Promise<OpsMetrics> {
  const empty: OpsMetrics = {
    newPilotRequests: 0,
    unassignedPilotRequests: 0,
    awaitingContact: 0,
    approvedPilots: 0,
    activeOrganizations: 0,
    failedEmails: 0,
    bouncedEmails: 0,
    pendingEmails: 0,
  };
  if (!isSupabaseConfigured()) return empty;
  const admin = getSupabaseAdmin();

  const [
    { count: newPilotRequests },
    { count: unassignedPilotRequests },
    { count: awaitingContact },
    { count: approvedPilots },
    { count: activeOrganizations },
    { count: failedEmails },
    { count: bouncedEmails },
    { count: pendingEmails },
  ] = await Promise.all([
    admin.from("pilot_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    admin
      .from("pilot_requests")
      .select("*", { count: "exact", head: true })
      .is("assigned_admin_id", null)
      .neq("status", "archived"),
    admin
      .from("pilot_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "reviewing"]),
    admin
      .from("pilot_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["approved", "workspace_created", "active_pilot"]),
    admin.from("organizations").select("*", { count: "exact", head: true }),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "bounced"),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    newPilotRequests: newPilotRequests || 0,
    unassignedPilotRequests: unassignedPilotRequests || 0,
    awaitingContact: awaitingContact || 0,
    approvedPilots: approvedPilots || 0,
    activeOrganizations: activeOrganizations || 0,
    failedEmails: failedEmails || 0,
    bouncedEmails: bouncedEmails || 0,
    pendingEmails: pendingEmails || 0,
  };
}
