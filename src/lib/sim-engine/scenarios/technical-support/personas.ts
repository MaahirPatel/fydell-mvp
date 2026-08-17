import type { SimulationPersonDefinition } from "../../types";

export const skedraSupportPeople: SimulationPersonDefinition[] = [
  {
    id: "person_sam",
    name: "Sam Okafor",
    title: "On-call Platform Engineer",
    channel: "internal",
    avatarInitials: "SO",
    objectives: ["Confirm what changed in R-2214", "Revert config quickly if called"],
    constraints: ["Busy on the incident bridge — needs specific questions"],
    communicationStyle: "Terse, factual, fast when asked about release/auth path.",
    knowledge: [
      {
        id: "r2214_skew",
        statement:
          "R-2214 tightened the SAML assertion clock-skew window from 300 seconds to 30. Identity providers drifting more than 30s fail validation intermittently. I can revert the config flag in about 10 minutes if you call it.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_deployment", "ask_auth", "ask_logs"],
          requiresWorldFlags: ["opened_auth_log"],
        },
      },
      {
        id: "password_untouched",
        statement:
          "Password logins are untouched. That's why the status page is green — its checks use a password test account. Only SSO customers with drifting IdPs are hitting this.",
        hidden: true,
        disclosure: {
          whenAskedAbout: ["ask_status", "ask_evidence", "ask_auth"],
          requiresWorldFlags: ["opened_release_notes"],
        },
      },
    ],
  },
  {
    id: "person_jordan",
    name: "Jordan Hale",
    title: "Customer Success Manager",
    channel: "manager",
    avatarInitials: "JH",
    objectives: ["Need a customer-safe update ASAP", "Avoid promising a full platform outage"],
    constraints: ["Won't invent root cause for customers"],
    communicationStyle: "Urgent but careful about wording.",
    knowledge: [
      {
        id: "needs_update",
        statement:
          "Three SSO customers are escalating. Give me something we can stand behind — likely cause, who is affected, and what we're doing next. Don't tell them to reset passwords if this is SAML.",
        disclosure: {
          whenAskedAbout: ["ask_status", "request_escalation", "make_recommendation"],
        },
      },
    ],
  },
];
