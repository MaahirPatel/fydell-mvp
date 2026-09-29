import "server-only";
import type { Admin } from "./context";

export type EngActor = "candidate" | "employer" | "reviewer" | "system" | "teammate";

export async function recordEngEvent(
  db: Admin,
  attemptId: string,
  event: {
    type: string;
    actor: EngActor;
    actorUserId?: string | null;
    actorEmail?: string | null;
    payload?: Record<string, unknown>;
    clientEventId?: string | null;
  }
): Promise<{ duplicate: boolean }> {
  const { error } = await db.from("eng_attempt_events").insert({
    attempt_id: attemptId,
    event_type: event.type,
    actor: event.actor,
    actor_user_id: event.actorUserId ?? null,
    actor_email: event.actorEmail ?? null,
    payload: event.payload ?? {},
    client_event_id: event.clientEventId ?? null,
  });
  if (error) {
    if (error.code === "23505" && event.clientEventId) return { duplicate: true };
    throw new Error(`Could not record event: ${error.message}`);
  }
  return { duplicate: false };
}
