/**
 * Rebuild conversation state from persisted messages and events.
 *
 * Uses the model's stored memory updates (in message_received events) for
 * exact rebuild, falling back to inference only when updates are absent
 * (e.g., legacy messages or fallback-authored replies).
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

export interface PersistedEvent {
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

/**
 * Rebuild conversation state by replaying messages in order.
 * When a message_received event contains model memory updates, those are
 * used directly for exact fidelity. Otherwise, topics are inferred.
 */
export function buildStateFromMessages(
  sessionId: string,
  scenarioId: string,
  scenarioVersion: string,
  messages: PersistedMessage[],
  events: PersistedEvent[] = []
): ConversationState {
  let state = createInitialState(sessionId, scenarioId, scenarioVersion);

  // Index message_received events by their client event ID for lookup
  // (we match by stakeholder + approximate time since IDs differ)
  const receivedEvents = events.filter((e) => e.event_type === "message_received");

  // Sort oldest first
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const msg of sorted) {
    if (msg.sender === "candidate") {
      const classified = classifyMessage(msg.body);
      state = recordCandidateMessage(state, msg.id, msg.body, classified);
    } else if (msg.sender === "stakeholder" && msg.stakeholderId) {
      // Try to find the corresponding event with model memory updates
      const msgTime = new Date(msg.created_at).getTime();
      const event = receivedEvents.find((e) => {
        const payload = e.payload as { stakeholderId?: string };
        if (payload.stakeholderId !== msg.stakeholderId) return false;
        const eventTime = new Date(e.created_at).getTime();
        return Math.abs(eventTime - msgTime) < 60000; // Within 1 minute
      });

      const memUpdates = event?.payload?.memoryUpdates as
        | {
            topicsAddressed?: string[];
            planStated?: string;
            diagnosisShared?: string;
            questionsResolved?: string[];
            interpretation?: { summary?: string; topics?: string[] };
          }
        | undefined;

      if (memUpdates) {
        // Exact rebuild from stored model output
        state = recordCoworkerMessage(state, msg.id, msg.stakeholderId, msg.body, {
          topicId: memUpdates.topicsAddressed?.[0],
          revealsFacts: [], // Fact IDs are in the event; text is in scenario
        });
        // Mark topics as addressed
        for (const topicId of memUpdates.topicsAddressed || []) {
          const topic = state.topics.find((t) => t.id === topicId);
          if (topic && topic.status === "raised") {
            topic.status = "answered";
          }
        }
      } else {
        // Fallback: infer from text (legacy or authored fallback)
        const classified = classifyMessage(msg.body);
        state = recordCoworkerMessage(state, msg.id, msg.stakeholderId, msg.body, {
          topicId: classified.topicIds[0],
        });
      }
    }
    state.lastSequence++;
  }

  return state;
}
