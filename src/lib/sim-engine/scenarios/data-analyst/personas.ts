import type { SimulationPersonDefinition } from "../../types";

/**
 * Meridian / Q3 churn investigation personas.
 * Knowledge is scoped; disclosure gates hidden facts.
 */
export const churnPeople: SimulationPersonDefinition[] = [
  {
    id: "person_amina",
    name: "Amina Okonkwo",
    title: "VP Customer Success",
    channel: "manager",
    avatarInitials: "AO",
    objectives: [
      "Understand whether Q3 churn spike is real and what drove it",
      "Avoid blaming a team without evidence",
    ],
    constraints: ["Needs a number with caveats before the Monday exec sync"],
    communicationStyle: "Calm, exacting about definitions. Hates vague dashboards.",
    knowledge: [
      {
        id: "exec_wants_driver",
        statement:
          "The exec team saw churn up ~18% QoQ on the board pack. They want the primary driver — mix, usage, or billing — not three equally weighted theories.",
      },
      {
        id: "definition_caution",
        statement:
          "Confirm you're using the same churn definition as Finance: paid subscriptions that moved to churned in the quarter, excluding trials.",
        disclosure: {
          whenAskedAbout: ["ask_status", "request_clarification", "ask_evidence"],
        },
      },
    ],
  },
  {
    id: "person_noah",
    name: "Noah Berg",
    title: "Billing Ops Lead",
    channel: "internal",
    avatarInitials: "NB",
    objectives: ["Protect billing integrity", "Share failure rates only with request context"],
    constraints: ["Won't dump raw processor logs without a date window"],
    communicationStyle: "Precise, slightly defensive about billing.",
    knowledge: [
      {
        id: "billing_had_spike",
        statement:
          "We did see an elevated payment-failure rate in August — mostly expired cards on the Growth plan — but I don't know if that explains the board churn number.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_evidence", "ask_schema"],
          requiresWorldFlags: ["opened_billing_resource"],
        },
      },
      {
        id: "billing_not_whole_story",
        statement:
          "Even if we recover most failed charges within 7 days, some Growth accounts still cancel. Billing alone may not be the full story.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_evidence", "make_recommendation"],
          requiresWorldFlags: ["ran_billing_query"],
        },
      },
    ],
  },
  {
    id: "person_priya_pm",
    name: "Priya Mehta",
    title: "Product Manager, Engagement",
    channel: "internal",
    avatarInitials: "PM",
    objectives: ["Understand whether usage decline precedes cancel"],
    constraints: ["Product analytics definitions differ from Finance churn"],
    communicationStyle: "Curious, hypothesis-driven.",
    knowledge: [
      {
        id: "usage_decline_hypothesis",
        statement:
          "We hypothesized Growth-plan accounts with <3 active days in the last 30 cancel more often — but that may be correlation with plan mix, not causation.",
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_evidence", "other"],
        },
      },
      {
        id: "mix_shift",
        statement:
          "Sales pushed Growth hard in Q2. If Growth has structurally higher churn, mix shift alone can move the headline rate without any process break.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_evidence", "make_recommendation"],
          requiresWorldFlags: ["ran_plan_mix_query"],
        },
      },
    ],
  },
  {
    id: "person_sam",
    name: "Sam Torres",
    title: "Support Lead",
    channel: "internal",
    avatarInitials: "ST",
    objectives: ["Reduce ticket volume narratives that aren't causal"],
    constraints: ["Support volume is a lagging indicator"],
    communicationStyle: "Blunt. Warns against using ticket counts as churn proof.",
    knowledge: [
      {
        id: "tickets_red_herring",
        statement:
          "Ticket volume was up, but most were password resets after an SSO change — not cancel intent. Don't treat ticket count as the churn driver.",
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_evidence", "other"],
        },
      },
    ],
  },
];
