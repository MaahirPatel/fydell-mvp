import type { SimulationPersonDefinition } from "../../types";

/**
 * Northstar Health, Solutions Engineer personas.
 * Knowledge is scoped. Disclosure rules gate hidden facts.
 */
export const northstarPeople: SimulationPersonDefinition[] = [
  {
    id: "person_priya",
    name: "Priya Shah",
    title: "Customer Technical Lead",
    channel: "customer",
    avatarInitials: "PS",
    objectives: [
      "Get CRM → Acme Cloud sync working before tomorrow's board demo",
      "Avoid being blamed for a production workaround that breaks later",
    ],
    constraints: [
      "Cannot approve unsupported custom fields in production",
      "Board demo is fixed tomorrow 10:00 local",
    ],
    communicationStyle: "Direct, time-pressured, technical enough to smell hand-waving.",
    outOfScope: ["acme internal roadmap", "pricing"],
    knowledge: [
      {
        id: "postman_auth_works",
        statement:
          "Authentication succeeds in Postman with the same Bearer token we're using in production jobs.",
      },
      {
        id: "intermittent_validation",
        statement:
          "Production sync jobs intermittently return validation failures, not every record, but enough to break the demo dataset.",
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_schema", "ask_evidence", "other"],
        },
      },
      {
        id: "suspects_ownership",
        statement:
          "Our solutions architect thinks contact ownership mapping is wrong; engineering suspects the request schema changed.",
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_schema", "request_clarification"],
        },
      },
      {
        id: "wants_workaround",
        statement:
          "If you can give us a production workaround tonight, we'll take it, but it has to survive the board demo.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["request_escalation", "ask_status"],
          requiresWorldFlags: ["candidate_has_seen_422"],
        },
      },
    ],
  },
  {
    id: "person_marcus",
    name: "Marcus Chen",
    title: "Account Executive",
    channel: "customer",
    avatarInitials: "MC",
    objectives: [
      "Protect the relationship",
      "Keep board demo on track",
      "Avoid unsupported scope expansion",
    ],
    constraints: ["Cannot approve engineering work without SE + Eng concurrence"],
    communicationStyle: "Polished, commercially sensitive, intervenes when promises get loose.",
    knowledge: [
      {
        id: "demo_tomorrow",
        statement: "The customer board demo is tomorrow morning. This is a relationship-critical moment.",
      },
      {
        id: "scope_guard",
        statement:
          "We cannot invent a one-off custom sync path that isn't in the contract. Diagnose and fix within supported APIs.",
        disclosure: {
          whenAskedAbout: ["unsupported_promise", "request_escalation", "make_recommendation"],
        },
      },
    ],
  },
  {
    id: "person_devon",
    name: "Devon Alvarez",
    title: "Backend Engineer",
    channel: "internal",
    avatarInitials: "DA",
    objectives: [
      "Protect production integrity",
      "Help SE find root cause with facts, not speculation",
    ],
    constraints: ["Will not dump entire DB logs without a request ID", "Auth service is not his primary on-call"],
    communicationStyle: "Terse, precise, slightly impatient with vague questions.",
    knowledge: [
      {
        id: "auth_healthy",
        statement:
          "Auth systems look healthy on our side, token issuance and validation metrics are normal for the last 24 hours.",
        disclosure: {
          whenAskedAbout: ["ask_auth", "ask_status"],
        },
      },
      {
        id: "schema_validation_deployed",
        statement:
          "We deployed stricter schema validation yesterday afternoon. customer_id must now be a UUID string, numeric IDs that used to coerce will 422 with INVALID_FIELD.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_deployment", "ask_schema"],
          requiresWorldFlags: ["candidate_has_seen_422"],
        },
      },
      {
        id: "request_id_available",
        statement:
          "If you have a request_id from the 422 body, I can point you at the matching server log line. Check the validation service logs under that ID.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_logs", "ask_evidence"],
          requiresWorldFlags: ["candidate_has_seen_422"],
        },
      },
      {
        id: "ownership_unlikely",
        statement:
          "Contact ownership mismatches produce a different error code (OWNER_MISMATCH). What you're describing sounds like schema validation, not ownership.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_schema", "ask_evidence"],
          requiresWorldFlags: ["candidate_has_seen_422"],
        },
      },
    ],
  },
  {
    id: "person_jordan",
    name: "Jordan Lee",
    title: "Solutions Engineering Manager",
    channel: "manager",
    avatarInitials: "JL",
    objectives: [
      "Coach for crisp customer communication",
      "Ensure diagnosis before promises",
    ],
    constraints: ["Will escalate commercially only with a written update"],
    communicationStyle: "Calm coach. Asks for structure: impact, diagnosis, next step, risk.",
    knowledge: [
      {
        id: "expect_written_update",
        statement:
          "Before you go back to the customer with a timeline, send me a short technical recommendation and a customer-safe update draft.",
        disclosure: {
          whenAskedAbout: ["ask_status", "make_recommendation", "request_escalation"],
        },
      },
      {
        id: "repri_on_escalation",
        statement:
          "If the customer escalates, prioritize diagnosis and a bounded update over polishing the integration script.",
        disclosure: {
          whenAskedAbout: ["request_escalation", "ask_status"],
          requiresWorldFlags: ["customer_escalated"],
        },
      },
    ],
  },
];
