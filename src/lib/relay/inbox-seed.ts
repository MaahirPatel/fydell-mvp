/**
 * Client Inbox seed content for Project Relay — a single Slack-style channel.
 * Prefer the session's overlaid `data/inbox_thread.json` so employer blueprints
 * change the candidate-visible thread. Fall back to the known-good scenario file.
 */

import inboxThreadRaw from "../../../scenarios/project-relay/data/inbox_thread.json";

export type ChatMessage = {
  id: string;
  actor: string;
  authorName: string;
  authorRole: string;
  text: string;
  at: string;
};

export type InboxParticipant = { id: string; name: string; role: string };

type InboxThreadJson = {
  channel: string;
  participants: InboxParticipant[];
  messages: {
    id: string;
    author: string;
    authorName?: string;
    timestamp: string;
    text: string;
  }[];
};

const FALLBACK = inboxThreadRaw as InboxThreadJson;

export const CHANNEL_NAME = FALLBACK.channel;
export const CHANNEL_PARTICIPANTS = FALLBACK.participants;

export function parseInboxThread(raw: string | null | undefined): InboxThreadJson {
  if (!raw?.trim()) return FALLBACK;
  try {
    const parsed = JSON.parse(raw) as InboxThreadJson;
    if (!parsed?.channel || !Array.isArray(parsed.messages) || !Array.isArray(parsed.participants)) {
      return FALLBACK;
    }
    return parsed;
  } catch {
    return FALLBACK;
  }
}

function speakerFor(
  authorId: string,
  participants: InboxParticipant[]
): { actor: string; name: string; role: string } {
  if (authorId === "you") {
    return { actor: "candidate", name: "You", role: "Forward-Deployed Engineer" };
  }
  const participant = participants.find((p) => p.id === authorId);
  return {
    actor: "customer_simulator",
    name: participant?.name || authorId,
    role: participant?.role || "",
  };
}

/** Build channel seed from session files (preferred) or the known-good fallback. */
export function buildChannelSeed(inboxJson?: string | null): ChatMessage[] {
  const thread = parseInboxThread(inboxJson);
  return thread.messages.map((m) => {
    const speaker = speakerFor(m.author, thread.participants);
    return {
      id: `seed-${m.id}`,
      actor: speaker.actor,
      authorName: m.authorName || speaker.name,
      authorRole: speaker.role,
      text: m.text,
      at: m.timestamp,
    };
  });
}

export function inboxMeta(inboxJson?: string | null): {
  channel: string;
  participants: InboxParticipant[];
} {
  const thread = parseInboxThread(inboxJson);
  return { channel: thread.channel, participants: thread.participants };
}

const CURVEBALL_SPEAKER: Record<string, { name: string; role: string }> = {
  board_meeting_thursday: { name: "Priya Anand", role: "VP of Operations" },
  vp_wants_root_cause: { name: "Priya Anand", role: "VP of Operations" },
  carrier_data_unreliable: { name: "Dana Whitfield", role: "Ops Manager" },
};

/** Drops the mid-session curveball into the same channel, at the moment it actually fired. */
export function buildCurveballSeed(
  curveballKey: string | null,
  curveballText: string | null,
  revealedAt: string | null,
  inboxJson?: string | null
): ChatMessage[] {
  if (!curveballKey || !curveballText || !revealedAt) return [];
  const thread = parseInboxThread(inboxJson);
  const vp = thread.participants.find((p) => /vp|director|head/i.test(p.role));
  const ops = thread.participants.find((p) => /ops|manager/i.test(p.role));
  const speaker =
    CURVEBALL_SPEAKER[curveballKey] ||
    (vp ? { name: vp.name, role: vp.role } : null) ||
    (ops ? { name: ops.name, role: ops.role } : null) ||
    { name: "Client stakeholder", role: "Stakeholder" };
  return [
    {
      id: "seed-curveball",
      actor: "customer_simulator",
      authorName: speaker.name,
      authorRole: speaker.role,
      text: curveballText,
      at: revealedAt,
    },
  ];
}

/** Display metadata for a live (non-seed) event actor — candidate or the bounded reply simulator. */
export function speakerForActor(
  actor: string,
  inboxJson?: string | null
): { name: string; role: string } {
  if (actor === "candidate") return { name: "You", role: "Forward-Deployed Engineer" };
  if (actor === "system") return { name: "System", role: "" };
  const thread = parseInboxThread(inboxJson);
  const ops =
    thread.participants.find((p) => /ops|manager/i.test(p.role)) ||
    thread.participants.find((p) => p.id !== "you");
  return {
    name: ops?.name || "Client contact",
    role: ops?.role || "Stakeholder",
  };
}
