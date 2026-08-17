import type { SimulationPersonDefinition } from "../../types";

export const ridgelinePeople: SimulationPersonDefinition[] = [
  {
    id: "person_farah",
    name: "Farah Idris",
    title: "Compliance Officer",
    channel: "internal",
    avatarInitials: "FI",
    objectives: [
      "Preserve audit trail for genuinely new vendor relationships",
      "Stop p-card bypasses caused by broken routing",
    ],
    constraints: ["Will not design the system fix; rejects blanket auto-approval"],
    communicationStyle: "Precise about policy intent; compliance-first.",
    knowledge: [
      {
        id: "policy_intent",
        statement:
          "The policy meant genuinely new vendor relationships: companies we've never bought from. Vendors that came over in the migration are not new; they're just waiting on a status backfill.",
        disclosure: {
          whenAskedAbout: ["ask_schema", "ask_evidence", "request_clarification"],
          requiresWorldFlags: ["opened_rules"],
        },
      },
      {
        id: "audit_constraint",
        statement:
          "Whatever you propose must keep the audit trail intact. Teams bypassing with p-cards is exactly what the auditors flagged last year, so blanket auto-approval is off the table.",
        disclosure: {
          whenAskedAbout: ["make_recommendation", "ask_evidence", "ask_status"],
          requiresWorldFlags: ["opened_systems_note"],
        },
      },
    ],
  },
  {
    id: "person_lee",
    name: "Lee Okonkwo",
    title: "Procurement Ops Lead",
    channel: "manager",
    avatarInitials: "LO",
    objectives: ["Stop routine $80 POs hitting the CFO", "Keep teams from bypassing the system"],
    constraints: ["Needs a quantified impact before escalating to Finance"],
    communicationStyle: "Practical, impatient with vague root causes.",
    knowledge: [
      {
        id: "bypass_pressure",
        statement:
          "Teams are starting to use p-cards for small buys because executive approvals take days. If we don't fix routing, compliance will find worse workarounds.",
        disclosure: {
          whenAskedAbout: ["ask_status", "request_escalation", "ask_evidence"],
        },
      },
    ],
  },
];
