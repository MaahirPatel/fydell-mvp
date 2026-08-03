/**
 * Five-minute micro simulations, second Solutions Delivery set.
 * Four Solutions Engineer sims and four Implementation Consultant sims.
 * Same format and rigor as the existing micro sims.
 */
import type { MicroSimContent } from "../micro-types";

// ---------------------------------------------------------------------------
// 1. Solutions Engineer: SSO Is Not Provisioning
//    SAML SSO, just-in-time creation and CSV import are supported.
//    SCIM automatic provisioning and deprovisioning is not.
// ---------------------------------------------------------------------------
export const MICRO_SE_SSO_PROVISIONING: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "sso-not-provisioning",
  roleKey: "solutions_engineer",
  title: "SSO Is Not Provisioning",
  tagline: "The customer wants SSO to do a job SSO does not do.",
  mission:
    "Ridgemont Financial asked for single sign-on with automatic account provisioning. The product supports SAML SSO but not SCIM. Work out what is really supported, name the gap honestly and write the explanation the customer will read.",
  companyName: "Ridgemont Financial (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "requirements",
      title: "Customer requirements",
      kind: "markdown",
      content:
        "## What Ridgemont Financial asked for\n\n- Single sign-on through their identity provider\n- New employees get an account automatically, with no ticket\n- Departed employees lose access automatically\n- Go live within one month",
    },
    {
      id: "capabilities",
      title: "Product capability doc",
      kind: "table",
      content:
        "| Capability | Status |\n| --- | --- |\n| SAML single sign-on | Supported |\n| Just-in-time account creation at first login | Supported |\n| SCIM automatic provisioning and deprovisioning | Not supported |\n| CSV user import | Supported |",
    },
  ],
  stakeholders: [
    {
      id: "jordan",
      name: "Jordan Pike",
      role: "Account Executive",
      blurb: "Ran the discovery call with Ridgemont. Needs a clear answer to send back.",
      knowledge: [
        "The customer's IT team creates every account by hand today and wants that to stop.",
        "On the call the customer used SSO to mean both login and account creation.",
        "The customer runs a standard identity provider and HR can export a user list as CSV.",
      ],
      withholds: ["Will not say what the product supports. That is your job."],
      responseRules: [
        {
          id: "rel_goal",
          priority: 3,
          anyKeywords: ["goal", "want", "achieve", "why", "manual", "onboard", "pain", "problem"],
          reply:
            "Their IT team creates every account by hand today. They want new employees to get access without a ticket, and departed employees removed quickly.",
        },
        {
          id: "rel_definition",
          priority: 2,
          anyKeywords: ["mean", "sso", "conflat", "same thing", "account creation", "difference", "login"],
          reply:
            "When they say SSO they seem to mean both login and account creation. Nobody on the call separated the two.",
        },
        {
          id: "rel_constraint",
          priority: 2,
          anyKeywords: ["directory", "export", "csv", "hr", "identity provider", "user list"],
          reply:
            "They run a standard identity provider, and their HR team can export a user list as CSV whenever needed.",
        },
      ],
      fallbackReply:
        "I can tell you what the customer said on the call. What the product actually does is your side of the desk.",
    },
  ],
  questions: [
    {
      id: "conflation",
      kind: "single_select",
      prompt: "What is the customer conflating in their request?",
      options: [
        "Authentication and provisioning are different capabilities",
        "SAML and CSV import are the same feature",
        "Single sign-on requires SCIM to work at all",
        "Account creation is only possible manually",
      ],
      points: 30,
      answer: ["Authentication and provisioning are different capabilities"],
      competencyKey: "requirement_analysis",
      expectedEvidence:
        "The customer bundles login (authentication) with account creation and removal (provisioning). The product supports the first through SAML but handles the second differently.",
    },
    {
      id: "supported_today",
      kind: "multi_select",
      prompt: "Which capabilities are supported today?",
      options: [
        "SAML single sign-on",
        "Just-in-time account creation at first login",
        "CSV user import",
        "SCIM automatic provisioning",
      ],
      points: 25,
      answer: [
        "SAML single sign-on",
        "Just-in-time account creation at first login",
        "CSV user import",
      ],
      competencyKey: "product_knowledge",
      expectedEvidence:
        "The capability doc lists SAML SSO, just-in-time account creation and CSV user import as supported. SCIM provisioning is not supported.",
    },
    {
      id: "honest_gap",
      kind: "single_select",
      prompt: "What is the honest gap to tell the customer?",
      options: [
        "SCIM automatic provisioning and deprovisioning",
        "SAML single sign-on",
        "Creating accounts at first login",
        "Importing users from a CSV file",
      ],
      points: 15,
      answer: ["SCIM automatic provisioning and deprovisioning"],
      competencyKey: "gap_identification",
      expectedEvidence:
        "SCIM is the only capability marked not supported. It covers automatic provisioning and, critically for this customer, automatic deprovisioning of departed employees.",
    },
    {
      id: "customer_explanation",
      kind: "text",
      prompt: "Write the customer-facing explanation.",
      helpText:
        "Max 400 characters. Separate what works from what does not, and offer the supported path.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "separate_capabilities",
          label: "Separates authentication from provisioning",
          keywords: ["two different", "separate", "different capabilit", "authentication and provisioning", "not the same"],
        },
        {
          id: "confirm_saml",
          label: "Confirms SAML SSO works today",
          keywords: ["saml", "single sign-on is supported", "sso is supported", "sso works", "sign-on works"],
        },
        {
          id: "name_scim_gap",
          label: "Names the SCIM gap plainly",
          keywords: ["scim", "automatic provisioning is not", "deprovisioning", "no automatic provisioning"],
        },
        {
          id: "offer_path",
          label: "Offers the supported onboarding path",
          keywords: ["csv", "just-in-time", "first login", "import", "created at login"],
        },
      ],
      competencyKey: "customer_transparency",
      expectedEvidence:
        "Login and provisioning are two different capabilities. SAML SSO is fully supported. SCIM automatic provisioning and deprovisioning is not supported today. Accounts can be created just-in-time at first login, and HR can load or remove users with a CSV import.",
    },
  ],
  competencies: [
    { key: "requirement_analysis", label: "Requirement analysis" },
    { key: "product_knowledge", label: "Product knowledge" },
    { key: "gap_identification", label: "Gap identification" },
    { key: "customer_transparency", label: "Customer transparency" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    conflation: "Spotted that the customer bundled authentication and provisioning into one request.",
    supported_today: "Classified the supported capabilities exactly as the capability doc states.",
    honest_gap: "Named SCIM provisioning and deprovisioning as the real gap.",
    customer_explanation:
      "The explanation separates the two capabilities, states the gap plainly and offers a workable path.",
  },
  improvementTemplates: {
    conflation:
      "The customer is conflating authentication with provisioning. SAML handles login. Creating and removing accounts is a separate capability.",
    supported_today:
      "Three capabilities are supported today: SAML SSO, just-in-time account creation and CSV user import. SCIM is not.",
    honest_gap:
      "The honest gap is SCIM automatic provisioning and deprovisioning. Everything else the customer asked for has a supported path.",
    customer_explanation:
      "A stronger explanation confirms SAML works, names the SCIM gap without hedging, and offers just-in-time creation plus CSV import as the onboarding path.",
  },
};

// ---------------------------------------------------------------------------
// 2. Solutions Engineer: The Rate Limit
//    100,000 records. 1,000 requests per hour. 1 record per request means
//    100,000 requests, so 100 hours. Batch endpoint takes 100 records per
//    request, so 1,000 requests, so 1 hour.
// ---------------------------------------------------------------------------
export const MICRO_SE_RATE_LIMIT: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "rate-limit",
  roleKey: "solutions_engineer",
  title: "The Rate Limit",
  tagline: "The customer wants 100,000 records now. The API has other plans.",
  mission:
    "Harlow Freight wants all 100,000 shipment records loaded immediately. The API allows 1,000 requests per hour. Work out what is actually possible, do the math and set an expectation the customer can trust.",
  companyName: "Harlow Freight (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "sync_request",
      title: "Sync requirement note",
      kind: "markdown",
      content:
        "## Customer request\n\nHarlow Freight wants all 100,000 shipment records loaded into the platform immediately. Their team starts using the product next Monday.",
    },
    {
      id: "api_limits",
      title: "API limits doc",
      kind: "table",
      content:
        "| Limit | Value |\n| --- | --- |\n| Requests per hour, per customer | 1,000 |\n| Records per request (standard endpoint) | 1 |\n| Records per request (batch endpoint) | 100 |\n| Rate limit exceptions | Not available |",
    },
  ],
  stakeholders: [
    {
      id: "mira",
      name: "Mira Solis",
      role: "Integration Lead, Harlow Freight",
      blurb: "Owns the customer's side of the integration. Practical, wants a real date.",
      knowledge: [
        "The 100,000 records are a one-time historical load. After that, roughly 2,000 records change per day.",
        "Immediate would be nice, but loaded before Monday is what actually matters.",
      ],
      withholds: ["Does not know the platform's API limits and will not do the math."],
      responseRules: [
        {
          id: "rel_goal",
          priority: 3,
          anyKeywords: ["immediate", "real-time", "real time", "deadline", "monday", "when", "urgent", "why"],
          reply:
            "Immediate would be nice, but honestly what matters is that the records are in place before our team starts on Monday.",
        },
        {
          id: "rel_scope",
          priority: 2,
          anyKeywords: ["one-time", "one time", "initial", "ongoing", "daily", "incremental", "after that", "changes"],
          reply:
            "The 100,000 records are a one-time historical load. After that we expect around 2,000 changed records per day.",
        },
        {
          id: "rel_limit",
          priority: 2,
          anyKeywords: ["limit", "rate", "quota", "increase", "exception", "faster"],
          reply:
            "The rate limit is on your platform, not ours. Our side can send requests as fast as you allow.",
        },
      ],
      fallbackReply:
        "I can answer anything about our data and our timing. The API limits are on your side of the fence.",
    },
  ],
  questions: [
    {
      id: "core_constraint",
      kind: "single_select",
      prompt: "What is the core constraint on this sync?",
      options: [
        "The API request rate limit",
        "The size of each shipment record",
        "The customer's network bandwidth",
        "The number of user licenses",
      ],
      points: 30,
      answer: ["The API request rate limit"],
      competencyKey: "constraint_identification",
      expectedEvidence:
        "The API allows 1,000 requests per hour with no exceptions. Everything else about the sync is flexible. The request budget is what bounds the timeline.",
    },
    {
      id: "batch_hours",
      kind: "number",
      prompt: "Using the batch endpoint, what is the minimum number of hours for the initial load?",
      helpText: "Enter hours as a number, e.g. 4",
      points: 25,
      answer: [1, 0.1],
      competencyKey: "capacity_estimation",
      expectedEvidence:
        "100,000 records at 100 records per request is 1,000 requests. At 1,000 requests per hour that is 1 hour.",
    },
    {
      id: "unbatched_hours",
      kind: "number",
      prompt: "Without batching, how many hours would the initial load take?",
      helpText: "Enter hours as a number.",
      points: 15,
      answer: [100, 1],
      competencyKey: "impact_quantification",
      expectedEvidence:
        "100,000 records at 1 record per request is 100,000 requests. At 1,000 requests per hour that is 100 hours.",
    },
    {
      id: "customer_message",
      kind: "text",
      prompt: "Write what you would tell the customer.",
      helpText: "Max 400 characters. A realistic plan with a timeline they can rely on.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "recommend_batch",
          label: "Recommends the batch endpoint",
          keywords: ["batch", "100 records per request", "batched"],
        },
        {
          id: "time_estimate",
          label: "Gives the realistic time estimate",
          keywords: ["one hour", "1 hour", "an hour", "within the hour"],
        },
        {
          id: "no_realtime_promise",
          label: "Does not promise real-time",
          keywords: ["not real-time", "not real time", "not instant", "not immediate", "cannot be instant"],
        },
        {
          id: "sync_plan",
          label: "Initial sync first, then incremental updates",
          keywords: ["initial", "incremental", "daily updates", "then sync changes", "ongoing updates", "schedule"],
        },
      ],
      competencyKey: "expectation_setting",
      expectedEvidence:
        "Use the batch endpoint at 100 records per request. The initial load of 100,000 records takes about 1 hour, well before Monday. The sync is scheduled, not real-time. After the initial load, run incremental updates for the roughly 2,000 daily changes.",
    },
  ],
  competencies: [
    { key: "constraint_identification", label: "Constraint identification" },
    { key: "capacity_estimation", label: "Capacity estimation" },
    { key: "impact_quantification", label: "Impact quantification" },
    { key: "expectation_setting", label: "Expectation setting" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    core_constraint: "Identified the request rate limit as the constraint that bounds the timeline.",
    batch_hours: "Calculated the batched load time correctly: 1,000 requests, 1 hour.",
    unbatched_hours: "Quantified the unbatched cost correctly: 100,000 requests, 100 hours.",
    customer_message:
      "The message recommends the batch endpoint, gives a real timeline and avoids promising real-time.",
  },
  improvementTemplates: {
    core_constraint:
      "The core constraint is the API rate limit of 1,000 requests per hour, with no exceptions available.",
    batch_hours:
      "With the batch endpoint, 100,000 records is 1,000 requests of 100 records each. At 1,000 requests per hour, the load takes about 1 hour.",
    unbatched_hours:
      "Without batching, 100,000 records means 100,000 requests. At 1,000 requests per hour, that is 100 hours.",
    customer_message:
      "A stronger message recommends the batch endpoint, states the 1 hour estimate, avoids promising real-time and schedules incremental updates after the initial load.",
  },
};

// ---------------------------------------------------------------------------
// 3. Solutions Engineer: The Security Review
//    Customer requires deletion within 30 days. Audit data retention is 90
//    days and fixed. Activity data retention is configurable 30 to 365 days.
// ---------------------------------------------------------------------------
export const MICRO_SE_SECURITY_REVIEW: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "security-review",
  roleKey: "solutions_engineer",
  title: "The Security Review",
  tagline: "One line in a security questionnaire could sink the deal or your credibility.",
  mission:
    "Veyra Bank requires deletion of all customer data within 30 days. The product keeps audit data for 90 days and that is fixed. Identify the mismatch, decide who needs to be involved and draft a careful response.",
  companyName: "Veyra Bank (prospect)",
  durationMinutes: 5,
  resources: [
    {
      id: "customer_requirement",
      title: "Security questionnaire, item 14",
      kind: "markdown",
      content:
        "## Veyra Bank security questionnaire, item 14\n\nAll customer data must be deleted within 30 days of a deletion request or contract end. Please confirm compliance.",
    },
    {
      id: "retention_policy",
      title: "Data retention policy",
      kind: "table",
      content:
        "| Data type | Retention | Configurable |\n| --- | --- | --- |\n| Activity data | 30 to 365 days, customer sets the value | Yes |\n| Audit data | 90 days | No, fixed for all customers |\n| Backup copies | 35 days | No, fixed for all customers |",
    },
  ],
  stakeholders: [
    {
      id: "priya",
      name: "Priya Nair",
      role: "Security Program Manager",
      blurb: "Owns the retention policy and the security review process.",
      knowledge: [
        "Audit retention is fixed at 90 days for fraud investigation reasons. No exception has ever been granted.",
        "Anything touching a contractual deletion commitment must go through security and legal review first.",
        "Activity data retention can be set to 30 days today.",
      ],
      withholds: ["Will not tell you what to promise the customer."],
      responseRules: [
        {
          id: "rel_audit",
          priority: 3,
          anyKeywords: ["audit", "90", "fixed", "exception", "change the retention", "shorten"],
          reply:
            "Audit retention is fixed at 90 days for fraud investigation reasons. No customer exception has ever been granted.",
        },
        {
          id: "rel_process",
          priority: 2,
          anyKeywords: ["escalate", "legal", "who decide", "approve", "process", "review", "sign off"],
          reply:
            "Anything touching a contractual deletion commitment goes through security and legal review before we respond. Please do not answer the customer alone.",
        },
        {
          id: "rel_scope",
          priority: 2,
          anyKeywords: ["activity", "configur", "30 day", "which data", "what can we", "meet today"],
          reply:
            "Activity data retention is configurable per customer, anywhere from 30 to 365 days. That part we can meet today.",
        },
      ],
      fallbackReply:
        "Ask me about the retention policy or the review process. What to promise the customer is not my call to make for you.",
    },
  ],
  questions: [
    {
      id: "mismatch",
      kind: "single_select",
      prompt: "Where is the mismatch between the requirement and the product?",
      options: [
        "The fixed 90 day audit retention conflicts with the 30 day deletion requirement",
        "Activity data cannot be deleted at all",
        "The product has no retention settings",
        "The customer wants data kept longer than the product allows",
      ],
      points: 30,
      answer: ["The fixed 90 day audit retention conflicts with the 30 day deletion requirement"],
      competencyKey: "risk_identification",
      expectedEvidence:
        "Item 14 requires deletion within 30 days. Audit data is retained for 90 days and that value is fixed for all customers, so the requirement cannot be met as written.",
    },
    {
      id: "configurable_today",
      kind: "multi_select",
      prompt: "Which retention settings are configurable today?",
      options: ["Activity data retention", "Audit data retention", "Backup retention"],
      points: 25,
      answer: ["Activity data retention"],
      competencyKey: "product_knowledge",
      expectedEvidence:
        "Only activity data retention is configurable, from 30 to 365 days. Audit data and backup copies are fixed for all customers.",
    },
    {
      id: "next_step",
      kind: "single_select",
      prompt: "What is the right next step?",
      options: [
        "Escalate to the security and legal teams before answering the customer",
        "Confirm compliance now and adjust the product later",
        "Tell the customer the requirement is impossible",
        "Skip item 14 and answer the rest of the questionnaire",
      ],
      points: 15,
      answer: ["Escalate to the security and legal teams before answering the customer"],
      competencyKey: "escalation_judgment",
      expectedEvidence:
        "The requirement touches a contractual deletion commitment, which must go through security and legal review. Confirming compliance now would be false; refusing outright is premature.",
    },
    {
      id: "customer_response",
      kind: "text",
      prompt: "Draft the response to the customer.",
      helpText:
        "Max 400 characters. Be accurate about what is fixed, what is configurable and what happens next.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "distinguish_fixed",
          label: "Distinguishes configurable from fixed retention",
          keywords: ["configurable", "fixed", "cannot be changed", "is set per customer"],
        },
        {
          id: "no_false_claim",
          label: "Does not claim compliance without confirmation",
          keywords: ["cannot confirm", "not yet confirm", "before confirming", "without confirmation", "not claim"],
        },
        {
          id: "escalate_internally",
          label: "Escalates to the security team",
          keywords: ["security team", "legal", "escalat", "internal review", "reviewing with"],
        },
        {
          id: "state_today",
          label: "States what can be met today",
          keywords: ["activity data", "30 days", "can be set", "meet today", "supported today"],
        },
      ],
      competencyKey: "customer_transparency",
      expectedEvidence:
        "Activity data retention is configurable and can be set to 30 days today. Audit data retention is fixed at 90 days. I cannot confirm full compliance with item 14 yet. Our security team and legal are reviewing it, and I will come back with a definitive answer.",
    },
  ],
  competencies: [
    { key: "risk_identification", label: "Risk identification" },
    { key: "product_knowledge", label: "Product knowledge" },
    { key: "escalation_judgment", label: "Escalation judgment" },
    { key: "customer_transparency", label: "Customer transparency" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    mismatch: "Found the exact conflict: fixed 90 day audit retention against a 30 day deletion requirement.",
    configurable_today: "Correctly identified activity data retention as the only configurable setting.",
    next_step: "Escalated to security and legal instead of answering the customer alone.",
    customer_response:
      "The response is accurate about what is fixed, does not overclaim and sets up a definitive follow-up.",
  },
  improvementTemplates: {
    mismatch:
      "The mismatch is audit data: it is retained for 90 days, that value is fixed, and the customer requires deletion within 30 days.",
    configurable_today:
      "Only activity data retention is configurable today, from 30 to 365 days. Audit and backup retention are fixed.",
    next_step:
      "The right next step is escalating to security and legal before responding. A deletion commitment is contractual, not a support question.",
    customer_response:
      "A stronger response separates configurable from fixed retention, avoids claiming compliance before review, and states what can be met today.",
  },
};

// ---------------------------------------------------------------------------
// 4. Solutions Engineer: Data Residency
//    Core product, reporting and SSO all run in the EU. One optional
//    enrichment integration processes data in the United States.
// ---------------------------------------------------------------------------
export const MICRO_SE_DATA_RESIDENCY: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "data-residency",
  roleKey: "solutions_engineer",
  title: "Data Residency",
  tagline: "Everything runs in the EU except one thing.",
  mission:
    "Nordkapp Insurance requires all data to stay in the EU. The core product is EU hosted, but one optional integration processes data in the United States. Find the risk, make a recommendation and explain the trade-off.",
  companyName: "Nordkapp Insurance (prospect)",
  durationMinutes: 5,
  resources: [
    {
      id: "residency_requirement",
      title: "Customer requirement",
      kind: "markdown",
      content:
        "## Nordkapp Insurance requirement\n\nAll customer data must be stored and processed inside the EU. No customer data may leave the EU at any time.",
    },
    {
      id: "architecture_note",
      title: "Architecture note",
      kind: "table",
      content:
        "| Component | Where it runs | Required or optional |\n| --- | --- | --- |\n| Core product and database | EU (Frankfurt) | Required |\n| Reporting | EU (Frankfurt) | Required |\n| SSO service | EU (Dublin) | Required |\n| Data enrichment integration | United States (third party) | Optional |",
    },
  ],
  stakeholders: [
    {
      id: "tomas",
      name: "Tomas Ekberg",
      role: "Product Manager",
      blurb: "Owns the enrichment integration and knows where every component runs.",
      knowledge: [
        "The enrichment integration calls a third party service hosted in the United States. No EU option exists today.",
        "Enrichment can be disabled per customer with a single setting. The core product works fine without it.",
        "An EU processing region for enrichment is under consideration with no committed date.",
      ],
      withholds: ["Will not commit to a roadmap date and will not decide the deal."],
      responseRules: [
        {
          id: "rel_enrichment",
          priority: 3,
          anyKeywords: ["enrichment", "united states", "third party", "where", "process", "outside the eu"],
          reply:
            "The enrichment integration calls a third party service hosted in the United States. There is no EU option for it today.",
        },
        {
          id: "rel_disable",
          priority: 2,
          anyKeywords: ["disable", "turn off", "optional", "without", "toggle", "per customer"],
          reply:
            "Enrichment can be disabled per customer with a single setting. The core product works fine without it. The customer loses the extra company details it adds to records.",
        },
        {
          id: "rel_roadmap",
          priority: 2,
          anyKeywords: ["roadmap", "eu region", "ship", "when", "future", "timeline", "plan"],
          reply:
            "An EU processing region for enrichment is under consideration, but there is no committed date. Please do not promise a quarter.",
        },
      ],
      fallbackReply:
        "I can confirm where each component runs and what enrichment does. What to offer this customer is your call.",
    },
  ],
  questions: [
    {
      id: "residency_risk",
      kind: "single_select",
      prompt: "What is the data residency risk for this customer?",
      options: [
        "The optional enrichment integration processes data in the United States",
        "The core database is hosted outside the EU",
        "Reporting sends data to the United States",
        "SSO requires a US based identity provider",
      ],
      points: 30,
      answer: ["The optional enrichment integration processes data in the United States"],
      competencyKey: "risk_identification",
      expectedEvidence:
        "The architecture note shows the core product, reporting and SSO all run in the EU. The only component that processes data in the United States is the optional enrichment integration.",
    },
    {
      id: "recommendation",
      kind: "single_select",
      prompt: "What do you recommend?",
      options: [
        "Disable the enrichment integration for this customer",
        "Promise an EU enrichment region by next quarter",
        "Keep enrichment on and hope the customer does not ask",
        "Decline the deal entirely",
      ],
      points: 25,
      answer: ["Disable the enrichment integration for this customer"],
      competencyKey: "solution_judgment",
      expectedEvidence:
        "Enrichment is optional and can be disabled per customer. Disabling it makes the deployment fully EU resident. Promising a roadmap date would be false, and declining the deal is unnecessary.",
    },
    {
      id: "eu_supported",
      kind: "multi_select",
      prompt: "Which components stay fully supported in the EU?",
      options: ["Core product and database", "Reporting", "SSO", "Data enrichment"],
      points: 15,
      answer: ["Core product and database", "Reporting", "SSO"],
      competencyKey: "product_knowledge",
      expectedEvidence:
        "The core product and database, reporting and SSO all run in EU regions (Frankfurt and Dublin). Enrichment is the only component that does not.",
    },
    {
      id: "tradeoff_explanation",
      kind: "text",
      prompt: "Explain the trade-off to the customer.",
      helpText:
        "Max 400 characters. Be clear about what they keep, what they lose and what happens next.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "name_loss",
          label: "Names what is lost without enrichment",
          keywords: ["without enrichment", "lose", "no enrichment", "enrichment will be off", "not be enriched"],
        },
        {
          id: "confirm_core",
          label: "Confirms EU hosting for the core",
          keywords: ["core product", "frankfurt", "stays in the eu", "hosted in the eu", "remains in the eu"],
        },
        {
          id: "revisit_later",
          label: "Offers to revisit when an EU region ships",
          keywords: ["revisit", "eu region", "re-enable", "when available", "if it becomes available"],
        },
        {
          id: "in_writing",
          label: "Puts the decision in writing",
          keywords: ["in writing", "document", "written", "confirm by email", "record the decision"],
        },
      ],
      competencyKey: "tradeoff_communication",
      expectedEvidence:
        "The core product, reporting and SSO all run in the EU and stay fully supported. We will disable the enrichment integration, so records will not carry the extra company details it adds. We can revisit if an EU region ships for it. I will confirm this configuration in writing.",
    },
  ],
  competencies: [
    { key: "risk_identification", label: "Risk identification" },
    { key: "solution_judgment", label: "Solution judgment" },
    { key: "product_knowledge", label: "Product knowledge" },
    { key: "tradeoff_communication", label: "Trade-off communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    residency_risk: "Isolated the enrichment integration as the only component outside the EU.",
    recommendation: "Recommended disabling enrichment, which fully satisfies the requirement today.",
    eu_supported: "Correctly identified everything that stays supported in the EU.",
    tradeoff_explanation:
      "The explanation names the loss, confirms EU hosting for the core and puts the decision in writing.",
  },
  improvementTemplates: {
    residency_risk:
      "The risk is the optional enrichment integration, which processes data through a third party in the United States. Everything else runs in the EU.",
    recommendation:
      "The strongest recommendation is disabling enrichment for this customer. It is optional, the core works without it, and there is no committed EU date to promise.",
    eu_supported:
      "The core product and database, reporting and SSO all stay fully supported in the EU. Only enrichment does not.",
    tradeoff_explanation:
      "A stronger explanation names what the customer loses without enrichment, confirms the core stays in the EU, offers to revisit when an EU region ships, and confirms the decision in writing.",
  },
};

// ---------------------------------------------------------------------------
// 5. Implementation Consultant: Duplicate Accounts
//    Matching used company_name instead of external_id. Two pairs share an
//    external_id: EXT-100 (Acme Corp / ACME Corporation) and EXT-104
//    (Bluepine / Bluepine Ltd). Two duplicate pairs need review.
// ---------------------------------------------------------------------------
export const MICRO_IC_DUPLICATE_ACCOUNTS: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "duplicate-accounts",
  roleKey: "implementation_consultant",
  title: "Duplicate Accounts",
  tagline: "The migration created two of everything it should not have.",
  mission:
    "After a migration, Crestwick Supply is seeing duplicate accounts. Matching used company names instead of the stable external ID. Find the root cause, count the damage and propose a plan that does not destroy data.",
  companyName: "Crestwick Supply (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "accounts",
      title: "accounts table",
      kind: "table",
      content:
        "| record | company_name | external_id |\n| --- | --- | --- |\n| R-1 | Acme Corp | EXT-100 |\n| R-2 | ACME Corporation | EXT-100 |\n| R-3 | Delta Freight | EXT-101 |\n| R-4 | Bluepine | EXT-104 |\n| R-5 | Bluepine Ltd | EXT-104 |\n| R-6 | Harrow Media | EXT-102 |",
    },
    {
      id: "matching_rule",
      title: "Matching rule note",
      kind: "markdown",
      content:
        "## How the migration matched records\n\nThe import matched existing accounts by company_name, exact text match. The external_id field comes from the customer's billing system and is unique per company. It was not used for matching.",
    },
  ],
  stakeholders: [
    {
      id: "elena",
      name: "Elena Voss",
      role: "Operations Manager, Crestwick Supply",
      blurb: "Owns the account data. Nervous about anything being deleted.",
      knowledge: [
        "The external_id comes from the billing system, is unique per company and is never reused.",
        "Some duplicate records have open orders attached, so nothing can be deleted automatically.",
        "Wants one record per real company and to see anything questionable before it merges.",
      ],
      withholds: ["Does not know the matching logic and will not design the fix."],
      responseRules: [
        {
          id: "rel_source",
          priority: 3,
          anyKeywords: ["external", "ext-", "billing", "stable", "unique", "identifier", "reuse"],
          reply:
            "The external_id comes from our billing system. It is unique per company and never reused. Company names get typed by hand.",
        },
        {
          id: "rel_delete",
          priority: 2,
          anyKeywords: ["delete", "remove", "merge", "destroy", "lose", "safe", "open orders"],
          reply:
            "Please do not delete anything automatically. Some of those records have open orders attached.",
        },
        {
          id: "rel_goal",
          priority: 2,
          anyKeywords: ["goal", "want", "expect", "clean", "outcome", "success", "end state"],
          reply:
            "One record per real company, nothing lost, and I want to see anything questionable before it gets merged.",
        },
      ],
      fallbackReply:
        "I know our companies, not your matching logic. Show me a specific pair and I can tell you if they are the same business.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "What is the root cause of the duplicates?",
      options: [
        "Matching used the company name instead of the stable external ID",
        "The billing system exported the same company twice",
        "The import ran twice by mistake",
        "External IDs were reused across companies",
      ],
      points: 30,
      answer: ["Matching used the company name instead of the stable external ID"],
      competencyKey: "root_cause_analysis",
      expectedEvidence:
        "The import matched on exact company_name text. Acme Corp and ACME Corporation are the same company (EXT-100) spelled differently, so name matching created a second record. The unique external_id was never used.",
    },
    {
      id: "duplicate_pairs",
      kind: "number",
      prompt: "How many pairs of records share the same external_id?",
      helpText: "Count pairs, not individual rows.",
      points: 25,
      answer: [2, 0],
      competencyKey: "data_accuracy",
      expectedEvidence:
        "EXT-100 appears on R-1 and R-2 (Acme Corp / ACME Corporation), and EXT-104 appears on R-4 and R-5 (Bluepine / Bluepine Ltd). That is 2 duplicate pairs to review.",
    },
    {
      id: "safe_approach",
      kind: "single_select",
      prompt: "What is the safe approach to fixing the duplicates?",
      options: [
        "Merge by external ID and send uncertain matches to a review queue",
        "Auto-delete every record with a repeated external ID",
        "Keep all records and rename the duplicates",
        "Re-run the same import and hope it matches better",
      ],
      points: 15,
      answer: ["Merge by external ID and send uncertain matches to a review queue"],
      competencyKey: "migration_judgment",
      expectedEvidence:
        "The external_id is unique and stable, so it is the correct merge key. Records may have open orders attached, so automatic deletion is unsafe and human review is required for anything uncertain.",
    },
    {
      id: "migration_plan",
      kind: "text",
      prompt: "Write the migration fix plan.",
      helpText:
        "Max 400 characters. How you will merge, what a human reviews and how you prove nothing was lost.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "match_external_id",
          label: "Matches on the external ID",
          keywords: ["external id", "external_id", "stable id", "billing id"],
        },
        {
          id: "review_queue",
          label: "Queues ambiguous matches for human review",
          keywords: ["review", "human", "queue", "manually check", "approve each"],
        },
        {
          id: "no_auto_delete",
          label: "Avoids destructive automatic merging",
          keywords: ["not delete", "no automatic delet", "never auto", "avoid delet", "non-destructive"],
        },
        {
          id: "verify_counts",
          label: "Verifies record counts after",
          keywords: ["count", "verify", "reconcil", "after the merge", "confirm totals"],
        },
      ],
      competencyKey: "plan_quality",
      expectedEvidence:
        "Re-match every account on external_id, the unique billing key. Merge exact external_id pairs, and queue any ambiguous match for Elena to review. Do not delete records automatically since some carry open orders. After merging, verify counts: 6 records should become 4 unique companies.",
    },
  ],
  competencies: [
    { key: "root_cause_analysis", label: "Root-cause analysis" },
    { key: "data_accuracy", label: "Data accuracy" },
    { key: "migration_judgment", label: "Migration judgment" },
    { key: "plan_quality", label: "Plan quality" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Traced the duplicates to name matching instead of the stable external ID.",
    duplicate_pairs: "Counted the duplicate pairs correctly from the account data.",
    safe_approach: "Chose a merge strategy keyed on external ID with human review, not deletion.",
    migration_plan: "The plan merges on the right key, protects data and verifies the outcome.",
  },
  improvementTemplates: {
    root_cause:
      "The root cause is the matching rule: it used exact company name text, while the unique external_id from the billing system was ignored.",
    duplicate_pairs:
      "There are 2 duplicate pairs: EXT-100 (Acme Corp and ACME Corporation) and EXT-104 (Bluepine and Bluepine Ltd).",
    safe_approach:
      "The safe approach is merging by external ID with a review queue for anything uncertain. Automatic deletion is unsafe because records carry open orders.",
    migration_plan:
      "A stronger plan matches on external_id, queues ambiguous pairs for human review, avoids automatic deletion and verifies record counts after the merge.",
  },
};

// ---------------------------------------------------------------------------
// 6. Implementation Consultant: Approval Rules
//    Finance says the controller approves above $10,000. Operations says the
//    department head. The requirement is unresolved, not a system bug.
// ---------------------------------------------------------------------------
export const MICRO_IC_APPROVAL_RULES: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "approval-rules",
  roleKey: "implementation_consultant",
  title: "Approval Rules",
  tagline: "Two departments, one threshold, zero agreement.",
  mission:
    "Finance and Operations gave conflicting answers about who approves purchases above $10,000. The configuration is blocked until someone decides. Diagnose the real problem and write the message that unblocks it.",
  companyName: "Meridale Foods (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "finance_email",
      title: "Email from Finance",
      kind: "markdown",
      content:
        "## Email from Finance\n\nFrom: R. Calloway, Finance Controller\n\nAny purchase above $10,000 must be approved by the controller. This was agreed at kickoff and it matches our audit requirements.",
    },
    {
      id: "operations_email",
      title: "Email from Operations",
      kind: "markdown",
      content:
        "## Email from Operations\n\nFrom: D. Munro, Operations Director\n\nPurchases above $10,000 should go to the department head. Routing them to Finance adds two days to every order. This is what we asked for in discovery.",
    },
    {
      id: "workflow_config",
      title: "Current workflow configuration",
      kind: "table",
      content:
        "| Purchase amount | Approver |\n| --- | --- |\n| Up to $10,000 | Department head |\n| Above $10,000 | Not configured, decision pending |",
    },
  ],
  stakeholders: [
    {
      id: "marcus",
      name: "Marcus Hale",
      role: "Project Sponsor, Meridale Foods",
      blurb: "Sponsors the rollout. Wants the dispute settled without taking sides.",
      knowledge: [
        "The steering committee formally owns process decisions, but nobody has put this one in front of them.",
        "In the old system the controller approved everything over $10,000, and Operations found it slow.",
        "Configuration freeze is in two weeks. An undecided rule becomes a launch risk.",
      ],
      withholds: ["Will not pick a side himself."],
      responseRules: [
        {
          id: "rel_owner",
          priority: 3,
          anyKeywords: ["who decide", "owner", "authority", "final say", "steering", "sign off", "who owns"],
          reply:
            "Good question. Formally the steering committee owns process decisions, but nobody has put this one in front of them yet.",
        },
        {
          id: "rel_history",
          priority: 2,
          anyKeywords: ["before", "previous", "old system", "used to", "legacy", "today", "current process"],
          reply:
            "In the old system the controller approved everything over ten thousand dollars, but Operations always felt that slowed them down.",
        },
        {
          id: "rel_deadline",
          priority: 2,
          anyKeywords: ["deadline", "when", "launch", "timeline", "block", "freeze", "how long"],
          reply:
            "Configuration freeze is in two weeks. If this is not decided by then it becomes a launch risk.",
        },
      ],
      fallbackReply:
        "I want this settled quickly. Tell me what you need from me to move it forward.",
    },
  ],
  questions: [
    {
      id: "real_problem",
      kind: "single_select",
      prompt: "What is the real problem here?",
      options: [
        "An unresolved requirement conflict, not a configuration bug",
        "The workflow engine cannot route purchases above $10,000",
        "Finance entered the wrong threshold",
        "Operations misread the configuration screen",
      ],
      points: 30,
      answer: ["An unresolved requirement conflict, not a configuration bug"],
      competencyKey: "problem_framing",
      expectedEvidence:
        "The system works and the threshold is agreed. The two departments gave contradictory answers about the approver, so the requirement itself is unresolved.",
    },
    {
      id: "next_step",
      kind: "single_select",
      prompt: "What is the right next step?",
      options: [
        "Ask who owns this decision and get the answer in writing",
        "Configure the controller as approver since Finance sounded more certain",
        "Configure both approvers and let the system pick",
        "Wait for the two directors to work it out themselves",
      ],
      points: 25,
      answer: ["Ask who owns this decision and get the answer in writing"],
      competencyKey: "decision_process",
      expectedEvidence:
        "A consultant should not arbitrate between departments. The path forward is identifying the decision owner (the steering committee) and getting a written decision before the configuration freeze.",
    },
    {
      id: "document_items",
      kind: "multi_select",
      prompt: "Once decided, what should be documented?",
      options: [
        "The chosen approval rule",
        "The name of the decision owner",
        "Acceptance test cases for the rule",
        "The full email history of the disagreement",
        "A list of every purchase from last year",
      ],
      points: 15,
      answer: [
        "The chosen approval rule",
        "The name of the decision owner",
        "Acceptance test cases for the rule",
      ],
      competencyKey: "requirements_documentation",
      expectedEvidence:
        "Documenting the chosen rule, who decided it and the acceptance tests that prove it works prevents the same dispute from reopening. Email archaeology and old purchase lists add nothing.",
    },
    {
      id: "clarification_message",
      kind: "text",
      prompt: "Write the clarification message to the customer.",
      helpText:
        "Max 400 characters. Neutral, specific and designed to produce one decision.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "neutral_framing",
          label: "Names the conflict neutrally",
          keywords: ["two different", "conflicting", "disagree", "both teams", "received different"],
        },
        {
          id: "single_owner",
          label: "Asks for a single decision owner",
          keywords: ["decision owner", "one owner", "who owns", "single decision", "final say"],
        },
        {
          id: "propose_deadline",
          label: "Proposes a deadline",
          keywords: ["by ", "deadline", "freeze", "within a week", "before the"],
        },
        {
          id: "either_outcome",
          label: "Offers to configure either outcome",
          keywords: ["either", "both options", "whichever", "configure it either way", "ready to configure"],
        },
      ],
      competencyKey: "clarification_writing",
      expectedEvidence:
        "We received two different answers on who approves purchases above $10,000: Finance named the controller, Operations named the department head. Could you confirm a single decision owner for this rule? A decision by next Friday keeps us ahead of the configuration freeze. We can configure either outcome the same day.",
    },
  ],
  competencies: [
    { key: "problem_framing", label: "Problem framing" },
    { key: "decision_process", label: "Decision process" },
    { key: "requirements_documentation", label: "Requirements documentation" },
    { key: "clarification_writing", label: "Clarification writing" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    real_problem: "Framed the issue as an unresolved requirement rather than a system defect.",
    next_step: "Routed the decision to its owner instead of arbitrating between departments.",
    document_items: "Chose exactly the documentation that prevents the dispute from reopening.",
    clarification_message: "The message is neutral, names one owner and drives a dated decision.",
  },
  improvementTemplates: {
    real_problem:
      "The real problem is an unresolved requirement conflict. The system and threshold are fine; the two departments disagree on the approver.",
    next_step:
      "The right next step is asking who owns the decision and getting the answer in writing. The steering committee owns process decisions and has not been asked.",
    document_items:
      "Document the chosen rule, the decision owner and acceptance test cases. That combination stops the dispute from reopening after launch.",
    clarification_message:
      "A stronger message names the conflict neutrally, asks for a single decision owner, proposes a deadline before the freeze and offers to configure either outcome.",
  },
};

// ---------------------------------------------------------------------------
// 7. Implementation Consultant: Migration Cutover
//    Friday cutover requested with no rollback plan. Every launch checklist
//    item is currently not done. No-go until they exist.
// ---------------------------------------------------------------------------
export const MICRO_IC_MIGRATION_CUTOVER: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "migration-cutover",
  roleKey: "implementation_consultant",
  title: "Migration Cutover",
  tagline: "The customer wants to launch Friday with no way back.",
  mission:
    "Aldergate Clinics wants to migrate on Friday and sees no need for a rollback plan. The launch checklist is empty. Assess the risk, decide what must exist before go-live and set the conditions without losing the customer.",
  companyName: "Aldergate Clinics (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "cutover_request",
      title: "Cutover request note",
      kind: "markdown",
      content:
        "## Cutover request from Aldergate Clinics\n\nWe want to migrate on Friday evening. Our data is clean, so we do not need a rollback plan. Staff arrive Monday morning and must use the new system.",
    },
    {
      id: "launch_checklist",
      title: "Launch checklist",
      kind: "table",
      content:
        "| Item | Status |\n| --- | --- |\n| Verified backup of the current system | Not done |\n| Rollback procedure | Not done |\n| Post-migration validation checks | Not done |\n| Weekend support coverage | Not done |",
    },
  ],
  stakeholders: [
    {
      id: "sofia",
      name: "Sofia Brandt",
      role: "IT Manager, Aldergate Clinics",
      blurb: "Owns the cutover on the customer side. Confident, but open to reason.",
      knowledge: [
        "Friday gives the weekend as a buffer before staff arrive Monday. The date came from the clinic directors.",
        "The old system can produce a full export, but nobody has run and verified one yet.",
        "Has not thought through what happens if the migration fails.",
      ],
      withholds: ["Will not volunteer that the rollback assumption is untested."],
      responseRules: [
        {
          id: "rel_date",
          priority: 3,
          anyKeywords: ["friday", "why", "date", "weekend", "deadline", "move", "monday"],
          reply:
            "Friday gives us the weekend as a buffer before staff arrive Monday. The date came from our clinic directors and is hard to move.",
        },
        {
          id: "rel_backup",
          priority: 2,
          anyKeywords: ["backup", "copy", "snapshot", "export", "old system", "keep"],
          reply:
            "The old system can produce a full export. To be honest, nobody has actually run and verified one yet.",
        },
        {
          id: "rel_rollback",
          priority: 2,
          anyKeywords: ["rollback", "fail", "revert", "go wrong", "plan b", "fallback", "way back"],
          reply:
            "Honestly, we assumed the migration would just work. If you think we need a way back, tell me what that involves.",
        },
      ],
      fallbackReply:
        "I can get you access or people on our side. Tell me exactly what you need before Friday.",
    },
  ],
  questions: [
    {
      id: "biggest_risk",
      kind: "single_select",
      prompt: "What is the biggest risk in this cutover plan?",
      options: [
        "There is no way back if the migration fails",
        "Friday is a bad day of the week to migrate",
        "The staff might not like the new system",
        "The data volume is too large to move in one weekend",
      ],
      points: 30,
      answer: ["There is no way back if the migration fails"],
      competencyKey: "risk_identification",
      expectedEvidence:
        "The customer explicitly declined a rollback plan and no verified backup exists. If the migration fails, clinics open Monday with no working system and no way to restore the old one.",
    },
    {
      id: "required_items",
      kind: "multi_select",
      prompt: "What must exist before go-live?",
      options: [
        "A verified backup of the current system",
        "A rollback procedure",
        "Post-migration validation checks",
        "A new training video for staff",
        "A larger project budget",
      ],
      points: 25,
      answer: [
        "A verified backup of the current system",
        "A rollback procedure",
        "Post-migration validation checks",
      ],
      competencyKey: "launch_readiness",
      expectedEvidence:
        "A verified backup, a rollback procedure and post-migration validation checks are the safety items on the launch checklist, and all are currently not done. Training videos and budget are not launch blockers.",
    },
    {
      id: "go_no_go",
      kind: "single_select",
      prompt: "As of right now, what is the go/no-go call?",
      options: [
        "No-go until the checklist items are done",
        "Go, the customer says the data is clean",
        "Go, and write the rollback plan after launch",
        "Cancel the migration entirely",
      ],
      points: 15,
      answer: ["No-go until the checklist items are done"],
      competencyKey: "go_no_go_judgment",
      expectedEvidence:
        "Every checklist item is not done, so launching now is unsafe. The call is conditional: no-go until the items exist, which can still happen before Friday.",
    },
    {
      id: "launch_conditions",
      kind: "text",
      prompt: "Write the message that sets the launch conditions.",
      helpText:
        "Max 400 characters. Conditions, not refusal. Keep Friday alive if the work gets done.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "conditions_not_refusal",
          label: "States conditions, not refusal",
          keywords: ["condition", "if we complete", "provided", "as long as", "requires"],
        },
        {
          id: "rollback_trigger",
          label: "Defines the rollback trigger",
          keywords: ["rollback", "restore the old", "revert if", "trigger", "way back"],
        },
        {
          id: "validation_window",
          label: "Proposes a validation window",
          keywords: ["validation", "verify", "check the data", "spot check", "over the weekend"],
        },
        {
          id: "keep_date",
          label: "Keeps the date if the checklist completes",
          keywords: ["friday", "keep the date", "on schedule", "still go live", "stay on track"],
        },
      ],
      competencyKey: "expectation_setting",
      expectedEvidence:
        "We can keep Friday on one condition: the checklist is done first. That means a verified backup, a rollback procedure and validation checks. If validation fails Saturday, we restore the old system, which is the rollback trigger. Complete these by Thursday and Friday still works.",
    },
  ],
  competencies: [
    { key: "risk_identification", label: "Risk identification" },
    { key: "launch_readiness", label: "Launch readiness" },
    { key: "go_no_go_judgment", label: "Go/no-go judgment" },
    { key: "expectation_setting", label: "Expectation setting" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    biggest_risk: "Identified the missing rollback path as the risk that dwarfs all others.",
    required_items: "Selected exactly the safety items that must exist before go-live.",
    go_no_go: "Made a conditional no-go call instead of rubber-stamping or cancelling.",
    launch_conditions: "The message sets clear conditions while keeping the Friday date achievable.",
  },
  improvementTemplates: {
    biggest_risk:
      "The biggest risk is having no way back. There is no verified backup and no rollback procedure, so a failed migration leaves the clinics with nothing on Monday.",
    required_items:
      "Before go-live: a verified backup, a rollback procedure and post-migration validation checks. All three are on the checklist and all are currently not done.",
    go_no_go:
      "The call is no-go until the checklist items exist. That is a condition, not a cancellation; the work can still finish before Friday.",
    launch_conditions:
      "A stronger message frames conditions rather than refusal, defines when a rollback triggers, proposes a validation window and keeps Friday if the checklist completes.",
  },
};

// ---------------------------------------------------------------------------
// 8. Implementation Consultant: The Scope Trade-off
//    Launch date fixed. Core import and approval workflow are done and
//    contractual. Custom notifications (60%) and branded portal (40%) are
//    optional and must be deferred.
// ---------------------------------------------------------------------------
export const MICRO_IC_SCOPE_TRADEOFF: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "scope-tradeoff",
  roleKey: "implementation_consultant",
  title: "The Scope Trade-off",
  tagline: "The date will not move. The scope has to.",
  mission:
    "Penrose Retail's launch date is fixed and two optional features are unfinished. The contract only requires the core workflow at launch. Decide what to protect, what to defer and how to tell the customer.",
  companyName: "Penrose Retail (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "scope_table",
      title: "Scope status",
      kind: "table",
      content:
        "| Work item | Contract status | Progress |\n| --- | --- | --- |\n| Core data import | Required at launch | Done |\n| Approval workflow | Required at launch | Done |\n| Custom notifications | Optional add-on | 60% complete |\n| Branded portal | Optional add-on | 40% complete |",
    },
    {
      id: "contract_note",
      title: "Contract note",
      kind: "markdown",
      content:
        "## Contract note\n\nThe launch date is fixed and tied to Penrose Retail's fiscal year start. The contract requires the core data import and the approval workflow at launch. Custom notifications and the branded portal are optional add-ons with no committed launch date.",
    },
  ],
  stakeholders: [
    {
      id: "ivan",
      name: "Ivan Petrov",
      role: "Program Lead, Penrose Retail",
      blurb: "Runs the program on the customer side. Prefers honest plans over big promises.",
      knowledge: [
        "The launch date is tied to the fiscal year start and cannot move.",
        "The contract commits the data import and the approval workflow at launch. The rest is optional.",
        "His team cares more about notifications than the branded portal.",
      ],
      withholds: ["Will not decide the delivery plan for you."],
      responseRules: [
        {
          id: "rel_contract",
          priority: 3,
          anyKeywords: ["contract", "required", "committed", "obligat", "must ship", "scope"],
          reply:
            "The contract commits the data import and the approval workflow at launch. Notifications and the portal are listed as optional add-ons.",
        },
        {
          id: "rel_date",
          priority: 2,
          anyKeywords: ["date", "launch", "move", "delay", "push", "fixed", "fiscal"],
          reply: "The launch date is tied to our fiscal year start. It cannot move.",
        },
        {
          id: "rel_priority",
          priority: 2,
          anyKeywords: ["notification", "portal", "prefer", "which", "matter", "important", "care"],
          reply:
            "If I had to pick, my team cares more about notifications than the branded portal. But do not cut the core to save either.",
        },
      ],
      fallbackReply:
        "I would rather hear a smaller honest plan than a big one that slips. What are you proposing?",
    },
  ],
  questions: [
    {
      id: "protect",
      kind: "single_select",
      prompt: "What must be protected for launch?",
      options: [
        "The core data import and the approval workflow",
        "The custom notifications, since they are 60% done",
        "The branded portal, since it is furthest behind",
        "All four items equally",
      ],
      points: 30,
      answer: ["The core data import and the approval workflow"],
      competencyKey: "prioritization",
      expectedEvidence:
        "The contract requires the core data import and the approval workflow at launch, and both are done. The other two items are optional add-ons with no committed date.",
    },
    {
      id: "defer_items",
      kind: "multi_select",
      prompt: "Which items should be deferred past launch?",
      options: ["Custom notifications", "Branded portal", "Core data import", "Approval workflow"],
      points: 25,
      answer: ["Custom notifications", "Branded portal"],
      competencyKey: "scope_judgment",
      expectedEvidence:
        "Custom notifications (60%) and the branded portal (40%) are unfinished optional add-ons. Deferring them protects the fixed date without touching contractual scope.",
    },
    {
      id: "deferral_handling",
      kind: "single_select",
      prompt: "How should the deferral be handled with the customer?",
      options: [
        "State plainly what ships after launch and when",
        "Avoid mentioning the unfinished items unless the customer asks",
        "Promise everything will be ready and work weekends",
        "Remove the optional items from the project permanently",
      ],
      points: 15,
      answer: ["State plainly what ships after launch and when"],
      competencyKey: "deferral_handling",
      expectedEvidence:
        "Deferral only works when it is stated openly with a date. Hiding it erodes trust, overpromising risks the launch, and cancelling the items throws away paid scope.",
    },
    {
      id: "scope_message",
      kind: "text",
      prompt: "Write the revised-scope message to the customer.",
      helpText:
        "Max 400 characters. Confirm the date, name what ships, name what follows and anchor it to the contract.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "confirm_date",
          label: "Confirms the launch date",
          keywords: ["launch date", "on schedule", "date stands", "as planned", "fiscal year"],
        },
        {
          id: "ships_at_launch",
          label: "Names exactly what ships at launch",
          keywords: ["at launch", "data import", "approval workflow", "will be live", "ships on day one"],
        },
        {
          id: "later_with_date",
          label: "Names what comes later, with a date",
          keywords: ["after launch", "notifications", "portal", "weeks after", "follow-up release"],
        },
        {
          id: "tie_to_contract",
          label: "Ties the scope to the contract",
          keywords: ["contract", "committed", "required at launch", "optional add-on", "as agreed"],
        },
      ],
      competencyKey: "customer_communication",
      expectedEvidence:
        "The launch date stands. At launch you get the core data import and the approval workflow, both done and both required by the contract. Custom notifications follow three weeks after launch, then the branded portal. Both are optional add-ons under the contract, and we will confirm the dates in writing.",
    },
  ],
  competencies: [
    { key: "prioritization", label: "Prioritization" },
    { key: "scope_judgment", label: "Scope judgment" },
    { key: "deferral_handling", label: "Deferral handling" },
    { key: "customer_communication", label: "Customer communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    protect: "Protected exactly what the contract requires at launch.",
    defer_items: "Deferred the two unfinished optional items without touching contractual scope.",
    deferral_handling: "Handled the deferral openly with a stated date instead of hiding or overpromising.",
    scope_message: "The message confirms the date, names both phases and anchors the plan to the contract.",
  },
  improvementTemplates: {
    protect:
      "The items to protect are the core data import and the approval workflow. They are contractual and already done.",
    defer_items:
      "Custom notifications and the branded portal should be deferred. Both are optional add-ons and neither is finished.",
    deferral_handling:
      "The deferral should be stated plainly: say what ships after launch and when. Silence or overpromising damages trust more than the deferral itself.",
    scope_message:
      "A stronger message confirms the fixed date, names exactly what ships at launch, gives a date for what follows and ties the split to the contract terms.",
  },
};
