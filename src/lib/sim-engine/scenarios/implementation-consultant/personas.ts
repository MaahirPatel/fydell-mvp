import type { SimulationPersonDefinition } from "../../types";

export const brightpathPeople: SimulationPersonDefinition[] = [
  {
    id: "person_priya",
    name: "Priya Raman",
    title: "HR Director, Brightpath",
    channel: "customer",
    avatarInitials: "PR",
    objectives: [
      "Launch Monday without silently losing employees",
      "Understand exactly who will and will not be in the system",
    ],
    constraints: ["Monday is contractual; delay is not an option"],
    communicationStyle: "Direct, under launch pressure, trusts technical judgment if concrete.",
    knowledge: [
      {
        id: "partial_ok",
        statement:
          "Monday is contractual. A partial, safe launch is acceptable if nothing is silently lost and I know exactly who's missing.",
        disclosure: {
          whenAskedAbout: ["ask_status", "request_clarification", "make_recommendation"],
        },
      },
      {
        id: "duplicate_rehire",
        statement:
          "E-104 is a rehire. The newer row with the August 10 start date is the correct one, keep that and drop the older duplicate.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_schema", "ask_evidence", "request_clarification"],
          requiresWorldFlags: ["opened_import_file"],
        },
      },
      {
        id: "manager_email_tomorrow",
        statement:
          "Tom Aiello's manager just changed teams. I can get you the new manager email by tomorrow morning.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_schema", "ask_status"],
          requiresWorldFlags: ["opened_import_rules"],
        },
      },
    ],
  },
  {
    id: "person_marcus",
    name: "Marcus Chen",
    title: "Implementation Lead (your manager)",
    channel: "manager",
    avatarInitials: "MC",
    objectives: ["Protect customer trust", "Avoid silent data loss at go-live"],
    constraints: ["Won't approve importing as-is when the importer skips rows silently"],
    communicationStyle: "Calm, checklist-oriented.",
    knowledge: [
      {
        id: "silent_skip_risk",
        statement:
          "Remember: invalid rows are skipped with no error report unless you run pre-import validation. Never tell the customer 'everything imported' without counts.",
        disclosure: {
          whenAskedAbout: ["ask_evidence", "make_recommendation", "ask_status"],
        },
      },
      {
        id: "phased_guidance",
        statement:
          "If four rows are clean today, import those now, fix the rest before Monday, and reconcile unique employee counts.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["make_recommendation", "ask_evidence"],
          requiresWorldFlags: ["opened_import_rules"],
        },
      },
    ],
  },
];
