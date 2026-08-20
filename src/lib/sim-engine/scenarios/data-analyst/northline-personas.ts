import type { SimulationPersonDefinition } from "../../types";

/**
 * Northline Components operations-yield personas.
 *
 * SYNTHETIC. Northline Components is a fictional manufacturer invented for the
 * released Data Analyst evaluation. Knowledge is scoped; disclosure gates the
 * fact that HOLD_RECLASS is a reporting change rather than a production change.
 */
export const northlinePeople: SimulationPersonDefinition[] = [
  {
    id: "person_dana",
    name: "Operations Manager",
    title: "Operations Manager",
    channel: "manager",
    avatarInitials: "OM",
    objectives: [
      "Know whether production actually got worse this period",
      "Avoid halting a line on a reporting artifact",
    ],
    constraints: ["Needs an answer before the next shift plan is locked"],
    communicationStyle: "Direct, operational. Wants the number and the caveat.",
    knowledge: [
      {
        id: "headline_drop",
        statement:
          "Reported yield fell from 93.2 percent this period. Ops leadership wants to know if the plant is genuinely running worse or if the reporting changed under us.",
      },
      {
        id: "prefer_honest",
        statement:
          "I would rather hear 'mostly a reporting change, one line still needs a look' than a confident single cause with no evidence.",
        disclosure: {
          whenAskedAbout: ["ask_status", "request_clarification"],
        },
      },
    ],
  },
  {
    id: "person_marcus",
    name: "Quality Lead",
    title: "Quality Lead",
    channel: "internal",
    avatarInitials: "QL",
    objectives: ["Explain the new disposition code without downplaying real scrap"],
    constraints: ["Won't restate prior periods; the system does not support it"],
    communicationStyle: "Precise about definitions, careful about causation.",
    knowledge: [
      {
        id: "hold_reclass_new",
        statement:
          "HOLD_RECLASS is a new disposition. Units held for reclassification now leave the completed-good numerator even though they are not scrap. Prior periods were never restated.",
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_evidence", "ask_schema"],
        },
      },
      {
        id: "hold_reclass_timing",
        statement:
          "The code went live on day 9 of this 20-day period, not on day 1. Anything before day 9 was reported the old way.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_evidence", "request_clarification"],
          requiresWorldFlags: ["changed_info_released"],
        },
      },
      {
        id: "l2_day_real",
        statement:
          "Even after you back out the reclassified volume, L2 Day still shows more scrap than the prior period. That part looks real, but I can't tell you the cause from the data.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_evidence", "make_recommendation"],
          requiresWorldFlags: ["ran_residual_query"],
        },
      },
    ],
  },
  {
    id: "person_lena",
    name: "Finance Analyst",
    title: "Finance Analyst",
    channel: "internal",
    avatarInitials: "FA",
    objectives: ["Keep the yield metric defined consistently"],
    constraints: ["Definitions are owned by Finance and change slowly"],
    communicationStyle: "Exacting about the metric dictionary.",
    knowledge: [
      {
        id: "definition",
        statement:
          "Yield is completed_good over planned. completed_good excludes any unit that does not leave as good output, and that now includes HOLD_RECLASS. Prior periods are not restated.",
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_evidence", "other"],
        },
      },
    ],
  },
];
