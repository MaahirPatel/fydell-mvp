import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type NotificationKind = "invitation_received" | "question_received" | "question_answered" | "application_received";

export type UserNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

const COLUMNS = "id,kind,title,body,href,read_at,created_at";

function toNotification(row: Row): UserNotification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** Best effort: a failed notification never blocks the action that caused it. */
export async function notifyUser(
  userId: string,
  input: { kind: NotificationKind; title: string; body?: string; href?: string },
): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("user_notifications").insert({
    user_id: userId,
    kind: input.kind,
    title: input.title.slice(0, 160),
    body: (input.body ?? "").slice(0, 500),
    href: input.href ?? "",
  });
  if (error) console.error(`[notifications] could not notify (${input.kind})`);
  return !error;
}

export async function listNotifications(userId: string, limit = 20): Promise<{ items: UserNotification[]; unread: number }> {
  const admin = createAdminSupabaseClient();
  const [list, unread] = await Promise.all([
    admin.from("user_notifications").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
    admin.from("user_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  return {
    items: ((list.data ?? []) as Row[]).map(toNotification),
    unread: unread.count ?? 0,
  };
}

export async function markAllRead(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
