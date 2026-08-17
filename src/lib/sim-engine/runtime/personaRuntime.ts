import type {
  KnowledgeFact,
  MessageIntent,
  SimulationPersonDefinition,
  SimulationPersonRuntime,
  WorldStateSnapshot,
} from "../types";

export function initPeople(
  definitions: SimulationPersonDefinition[]
): Record<string, SimulationPersonRuntime> {
  const out: Record<string, SimulationPersonRuntime> = {};
  for (const d of definitions) {
    out[d.id] = {
      id: d.id,
      contacted: false,
      unlockedFactIds: [],
      topicsDiscussed: [],
    };
  }
  return out;
}

/**
 * Classify candidate message into an intent.
 * Deterministic, multi-signal — not a single includes() for the whole reply.
 */
export function classifyIntent(message: string): MessageIntent {
  const m = message.toLowerCase();
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(m) && m.length < 40) {
    return "greeting";
  }
  if (/\b(promise|guarantee|definitely fix|ship tonight|go live tonight|no risk)\b/.test(m)) {
    return "unsupported_promise";
  }
  if (/\b(recommend|suggest|we should|propose|next step)\b/.test(m)) {
    return "make_recommendation";
  }
  if (/\b(escalat|urgent|asap|board|executive|critical)\b/.test(m)) {
    return "request_escalation";
  }
  if (/\b(deploy|release|shipped|change.?log|schema.?valid|yesterday|push|r-?\d+)\b/.test(m)) {
    return "ask_deployment";
  }
  if (/\b(auth|oauth|token|credential|401|unauthorized|saml|sso|clock.?skew|assertion)\b/.test(m)) {
    return "ask_auth";
  }
  if (/\b(schema|payload|field|uuid|customer_id|validation|422|invalid.?field|duplicate|rehire|manager.?email|import|mapping|policy|vendor.?status|rule r?\d)\b/.test(
      m
    )
  ) {
    return "ask_schema";
  }
  if (/\b(log|request.?id|trace|server.?log|correlation)\b/.test(m)) {
    return "ask_logs";
  }
  if (/\b(status|update|where are we|progress)\b/.test(m)) {
    return "ask_status";
  }
  if (/\b(evidence|proof|how do you know|confirm|verify)\b/.test(m)) {
    return "ask_evidence";
  }
  if (/\b(clarify|what do you mean|can you explain|confused)\b/.test(m)) {
    return "request_clarification";
  }
  if (/\b(thanks|got it|understood|acknowledged|will do)\b/.test(m)) {
    return "acknowledge";
  }
  if (/\b(weather|lunch|joke|sports)\b/.test(m)) {
    return "irrelevant";
  }
  return "other";
}

function disclosureAllows(
  fact: KnowledgeFact,
  intent: MessageIntent,
  world: WorldStateSnapshot,
  person: SimulationPersonRuntime
): boolean {
  const d = fact.disclosure;
  if (!d) {
    // Non-hidden facts without disclosure are always shareable once contacted.
    return !fact.hidden;
  }
  if (!d.whenAskedAbout.includes(intent)) return false;
  if (d.requiresWorldFlags) {
    for (const f of d.requiresWorldFlags) {
      const v = world.flags[f];
      if (!v) return false;
    }
  }
  if (d.forbidsWorldFlags) {
    for (const f of d.forbidsWorldFlags) {
      if (world.flags[f]) return false;
    }
  }
  if (d.requiresPriorTopics) {
    for (const t of d.requiresPriorTopics) {
      if (!person.topicsDiscussed.includes(t)) return false;
    }
  }
  return true;
}

export interface PersonaReply {
  body: string;
  unlockedFactIds: string[];
  topicsDiscussed: string[];
  worldFlagsToSet?: Record<string, import("../types").JsonValue>;
  intent: MessageIntent;
}

export interface PersonaRuntime {
  reply(args: {
    person: SimulationPersonDefinition;
    personRuntime: SimulationPersonRuntime;
    message: string;
    world: WorldStateSnapshot;
    conversationHistory: string[];
  }): PersonaReply;
}

/**
 * Deterministic persona runtime:
 * persona + intent + history + world state + disclosure rules.
 * Not omniscient ChatGPT. Not naive keyword-to-reply maps.
 */
export class DeterministicPersonaRuntime implements PersonaRuntime {
  reply(args: {
    person: SimulationPersonDefinition;
    personRuntime: SimulationPersonRuntime;
    message: string;
    world: WorldStateSnapshot;
    conversationHistory: string[];
  }): PersonaReply {
    const { person, personRuntime, message, world } = args;
    const intent = classifyIntent(message);
    const unlocked = [...personRuntime.unlockedFactIds];
    const topics = [...personRuntime.topicsDiscussed];
    if (!topics.includes(intent)) topics.push(intent);

    if (person.outOfScope?.some((t) => message.toLowerCase().includes(t.toLowerCase()))) {
      return {
        body: `I can't speak to that from my side — you'd need someone closer to that area. Happy to help on ${person.title.toLowerCase()} topics.`,
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
      };
    }

    if (intent === "greeting") {
      return {
        body: `Hey — ${person.name} here. What's going on?`,
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
      };
    }

    if (intent === "irrelevant") {
      return {
        body: "I need to stay focused on the integration issue right now. What do you need from me on that?",
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
      };
    }

    if (intent === "unsupported_promise") {
      return {
        body:
          person.channel === "customer"
            ? "I appreciate the urgency, but please don't commit to a timeline until we confirm a fix path with engineering."
            : "Careful — we shouldn't promise production timelines we can't back. Let's confirm the diagnosis first.",
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
        worldFlagsToSet: { candidate_made_unsupported_promise: true },
      };
    }

    const discloseable = person.knowledge.filter(
      (f) =>
        !unlocked.includes(f.id) &&
        disclosureAllows(f, intent, world, { ...personRuntime, topicsDiscussed: topics })
    );

    const alwaysKnown = person.knowledge.filter((f) => !f.hidden && !f.disclosure);

    if (discloseable.length > 0) {
      const fact = discloseable[0];
      unlocked.push(fact.id);
      const worldFlagsToSet: Record<string, import("../types").JsonValue> = {
        [`fact_unlocked_${fact.id}`]: true,
      };
      // Side effects for known scenario facts
      if (fact.id === "schema_validation_deployed") {
        worldFlagsToSet.candidate_knows_about_deployment = true;
      }
      if (fact.id === "request_id_available") {
        worldFlagsToSet.candidate_has_request_id = true;
      }
      if (fact.id === "auth_healthy") {
        worldFlagsToSet.candidate_cleared_auth = true;
      }

      return {
        body: buildDisclosureReply(person, fact, intent),
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
        worldFlagsToSet,
      };
    }

    // Already unlocked related facts — restate briefly
    const known = person.knowledge.filter((f) => unlocked.includes(f.id) || alwaysKnown.includes(f));
    if (known.length > 0 && intent !== "other") {
      const fact = known[0];
      return {
        body: `As I mentioned — ${fact.statement} Anything else you need to dig into?`,
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
      };
    }

    // Status / clarification fallbacks by style
    if (intent === "ask_status") {
      return {
        body: `${person.communicationStyle} From my side: I'm available if you need specifics on what I own.`,
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
      };
    }

    if (intent === "request_clarification") {
      return {
        body: "Happy to clarify — can you point me at the exact error, field, or timestamp you're looking at?",
        unlockedFactIds: unlocked,
        topicsDiscussed: topics,
        intent,
      };
    }

    // Partial knowledge: acknowledge without inventing
    return {
      body: partialKnowledgeReply(person, intent),
      unlockedFactIds: unlocked,
      topicsDiscussed: topics,
      intent,
    };
  }
}

function buildDisclosureReply(
  person: SimulationPersonDefinition,
  fact: KnowledgeFact,
  intent: MessageIntent
): string {
  const lead =
    intent === "ask_deployment"
      ? "On deployments —"
      : intent === "ask_auth"
        ? "On auth —"
        : intent === "ask_schema"
          ? "On the schema side —"
          : intent === "ask_logs"
            ? "On logging —"
            : `${person.name}:`;
  return `${lead} ${fact.statement}`;
}

function partialKnowledgeReply(person: SimulationPersonDefinition, intent: MessageIntent): string {
  switch (intent) {
    case "ask_deployment":
      return `I don't have a deployment detail I can share yet based on what you've asked. ${person.channel === "internal" ? "If you're seeing a specific error code, that might help me narrow it." : "I'd loop in engineering for release specifics."}`;
    case "ask_auth":
      return "Auth isn't something I can confirm without more context. Are you seeing 401s, or something else?";
    case "ask_schema":
      return "Which field is failing validation? If you have the exact error payload, send it over.";
    case "ask_logs":
      return "I need a request ID or approximate timestamp to pull a useful log line.";
    case "ask_evidence":
      return "I can share what I know once we're looking at the right artifact — error body, request ID, or the field that failed.";
    case "make_recommendation":
      return "That sounds reasonable as a working theory. Validate it against the error payload before we socialize it.";
    case "request_escalation":
      return person.channel === "customer"
        ? "Understood on the urgency. Let's keep the board update factual until we have a confirmed fix."
        : "If we escalate, we need a crisp diagnosis — error, impact, and what we've ruled out.";
    default:
      return `I'm not sure I follow. My focus is ${person.title.toLowerCase()}. Try asking about status, the error, deployments, auth, or logs.`;
  }
}

/** Future seam — do not implement now. */
export type LLMPersonaRuntime = PersonaRuntime;
