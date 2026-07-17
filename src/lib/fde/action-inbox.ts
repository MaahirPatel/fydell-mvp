import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ActionInboxItem = {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  mission_id: string | null;
  invitation_id: string | null;
  session_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type EnqueueActionInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  actionUrl?: string | null;
  organizationId?: string | null;
  missionId?: string | null;
  invitationId?: string | null;
  sessionId?: string | null;
};

export async function enqueueAction(input: EnqueueActionInput): Promise<ActionInboxItem> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("action_inbox")
    .insert({
      user_id: input.userId,
      organization_id: input.organizationId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      action_url: input.actionUrl ?? null,
      mission_id: input.missionId ?? null,
      invitation_id: input.invitationId ?? null,
      session_id: input.sessionId ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Could not enqueue action inbox item.");
  return data as ActionInboxItem;
}

export async function listInbox(userId: string): Promise<ActionInboxItem[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("action_inbox")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as ActionInboxItem[];
}

export async function markRead(id: string, userId: string): Promise<ActionInboxItem> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("action_inbox")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Action Inbox item not found.");
  return data as ActionInboxItem;
}
