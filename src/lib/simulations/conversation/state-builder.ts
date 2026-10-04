/**
 * Rebuild conversation state from persisted messages.
 *
 * Stateless design: we replay the message history to reconstruct what was
 * discussed, rather than requiring a separate state table. This keeps the
 * coordinator compatible with existing sessions.
 */
import type { ConversationState } from "./types";
import { classifyMessage } from "./intent";
import {
  createInitialState,
  recordCandidateMessage,
  recordCoworkerMessage,
} from "./memory";

export interface PersistedMessage {
  id: string;
  sender: "candidate" | "stakeholder";
  stakeholderId?: string | null;
  body: string;
  created_at: string;
}

/**
 * Rebuild conversation state by replaying messages in order.
 */
export function buildStateFromMessages(
  sessionId: string,
  scenarioId: string,
  scenarioVersion: string,
  messages: PersistedMessage[]
): ConversationState {
  let state = createInitialState(sessionId, scenarioId, scenarioVersion);

  // Sort oldest first
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const msg of sorted) {
    if (msg.sender === "candidate") {
      const classified = classifyMessage(msg.body);
      state = recordCandidateMessage(state, msg.id, msg.body, classified);
    } else if (msg.sender === "stakeholder" && msg.stakeholderId) {
      // Infer topics from the coworker message body so ownership is tracked
      // in rebuilt state.
      const classified = classifyMessage(msg.body);
      state = recordCoworkerMessage(state, msg.id, msg.stakeholderId, msg.body, {
        topicId: classified.topicIds[0],
      });
    }
    state.lastSequence++;
  }

  return state;
}
