import type {
  SimulationConversation,
  SimulationMessage,
  SimulationPersonDefinition,
  SimulationPersonRuntime,
  WorldStateSnapshot,
} from "../types";
import { DeterministicPersonaRuntime, classifyIntent, type PersonaRuntime } from "./personaRuntime";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureConversation(
  conversations: Record<string, SimulationConversation>,
  person: SimulationPersonDefinition
): { conversations: Record<string, SimulationConversation>; conversationId: string } {
  const existing = Object.values(conversations).find((c) => c.personId === person.id);
  if (existing) return { conversations, conversationId: existing.id };
  const id = newId("conv");
  return {
    conversationId: id,
    conversations: {
      ...conversations,
      [id]: {
        id,
        personId: person.id,
        channel: person.channel,
        subject: `Thread with ${person.name}`,
        messageIds: [],
        unread: false,
      },
    },
  };
}

export function sendPersonMessage(args: {
  person: SimulationPersonDefinition;
  personRuntime: SimulationPersonRuntime;
  people: Record<string, SimulationPersonRuntime>;
  conversations: Record<string, SimulationConversation>;
  messages: Record<string, SimulationMessage>;
  world: WorldStateSnapshot;
  body: string;
  elapsedMs: number;
  persona?: PersonaRuntime;
}): {
  people: Record<string, SimulationPersonRuntime>;
  conversations: Record<string, SimulationConversation>;
  messages: Record<string, SimulationMessage>;
  outbound: SimulationMessage;
  inbound: SimulationMessage;
  intent: ReturnType<typeof classifyIntent>;
  worldFlagsToSet?: Record<string, import("../types").JsonValue>;
} {
  const persona = args.persona ?? new DeterministicPersonaRuntime();
  const { conversations, conversationId } = ensureConversation(args.conversations, args.person);
  const history = Object.values(args.messages)
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAtMs - b.createdAtMs)
    .map((m) => m.body);

  const outbound: SimulationMessage = {
    id: newId("msg"),
    conversationId,
    personId: args.person.id,
    direction: "outbound",
    kind: "person_message",
    body: args.body,
    intent: classifyIntent(args.body),
    createdAtMs: args.elapsedMs,
  };

  const reply = persona.reply({
    person: args.person,
    personRuntime: args.personRuntime,
    message: args.body,
    world: args.world,
    conversationHistory: history,
  });

  const inbound: SimulationMessage = {
    id: newId("msg"),
    conversationId,
    personId: args.person.id,
    direction: "inbound",
    kind: "person_message",
    body: reply.body,
    intent: reply.intent,
    createdAtMs: args.elapsedMs + 1,
  };

  const conv = conversations[conversationId];
  const nextConv: SimulationConversation = {
    ...conv,
    messageIds: [...conv.messageIds, outbound.id, inbound.id],
    unread: true,
  };

  const people = {
    ...args.people,
    [args.person.id]: {
      ...args.personRuntime,
      contacted: true,
      unlockedFactIds: reply.unlockedFactIds,
      topicsDiscussed: reply.topicsDiscussed,
      lastContactedAtMs: elapsedSafe(args.elapsedMs),
    },
  };

  return {
    people,
    conversations: { ...conversations, [conversationId]: nextConv },
    messages: {
      ...args.messages,
      [outbound.id]: outbound,
      [inbound.id]: inbound,
    },
    outbound,
    inbound,
    intent: reply.intent,
    worldFlagsToSet: reply.worldFlagsToSet,
  };
}

function elapsedSafe(n: number): number {
  return n;
}

export function markConversationRead(
  conversations: Record<string, SimulationConversation>,
  conversationId: string
): Record<string, SimulationConversation> {
  const c = conversations[conversationId];
  if (!c) return conversations;
  return { ...conversations, [conversationId]: { ...c, unread: false } };
}

export function injectInboundMessage(args: {
  person: SimulationPersonDefinition;
  conversations: Record<string, SimulationConversation>;
  messages: Record<string, SimulationMessage>;
  body: string;
  subject?: string;
  elapsedMs: number;
}): {
  conversations: Record<string, SimulationConversation>;
  messages: Record<string, SimulationMessage>;
  message: SimulationMessage;
} {
  const { conversations, conversationId } = ensureConversation(args.conversations, args.person);
  const msg: SimulationMessage = {
    id: newId("msg"),
    conversationId,
    personId: args.person.id,
    direction: "inbound",
    kind: "person_message",
    body: args.body,
    createdAtMs: args.elapsedMs,
  };
  const conv = conversations[conversationId];
  return {
    conversations: {
      ...conversations,
      [conversationId]: {
        ...conv,
        subject: args.subject ?? conv.subject,
        messageIds: [...conv.messageIds, msg.id],
        unread: true,
      },
    },
    messages: { ...args.messages, [msg.id]: msg },
    message: msg,
  };
}
