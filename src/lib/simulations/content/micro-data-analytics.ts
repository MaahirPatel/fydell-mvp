/**
 * Five-minute micro simulations: Data & Analytics + Solutions pathway.
 * Content follows the Fractal demo spec verbatim for DA, BI and SE.
 */
import type { MicroSimContent } from "../micro-types";

// ---------------------------------------------------------------------------
// 1. Data Analyst: The Missing Delays
//    Answer key: A-102 (800) + A-103 (500) = $1,300 delayed revenue.
// ---------------------------------------------------------------------------
export const MICRO_DATA_ANALYST: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "missing-delays",
  roleKey: "data_analyst",
  title: "The Missing Delays",
  tagline: "A dashboard says zero delayed revenue. The service team says that's wrong.",
  mission:
    "The operations dashboard says there is no delayed revenue today, but the customer service team says two delayed orders are missing. Identify the problem, calculate the correct delayed revenue and explain the fix.",
  companyName: "Harborline Retail",
  durationMinutes: 5,
  resources: [
    {
      id: "orders",
      title: "orders.csv",
      kind: "table",
      content:
        "| Order ID | Revenue | Status |\n| --- | ---: | --- |\n| A-101 | 1200 | Shipped |\n| A-102 | 800 | Processing |\n| A-103 | 500 | Processing |\n| A-104 | 1000 | Shipped |",
    },
    {
      id: "manual_delays",
      title: "manual_delays.csv",
      kind: "table",
      content:
        "| Order ID | Delay reason |\n| --- | --- |\n| A102 | Carrier capacity |\n| A103 | Weather |",
    },
    {
      id: "metric_definition",
      title: "Metric definition",
      kind: "markdown",
      content:
        "## Delayed revenue\n\nDelayed revenue is the total revenue for orders appearing in the manual delay file.\n\nThe dashboard joins `orders.csv` to `manual_delays.csv` on **Order ID** and sums Revenue for matched rows.",
    },
  ],
  stakeholders: [
    {
      id: "dana",
      name: "Dana Whitfield",
      role: "Operations Manager",
      blurb: "Owns the operations dashboard. Needs a number leadership can trust.",
      knowledge: [
        "Some teams enter order IDs with hyphens and some do not.",
        "Leadership needs the corrected delayed-revenue number and a prevention recommendation.",
      ],
      withholds: ["Will not state the root cause or the corrected number."],
      responseRules: [
        {
          id: "rel_hyphens",
          priority: 3,
          anyKeywords: ["hyphen", "dash", "format", "id format", "a-102", "a102", "spelling", "match", "join"],
          reply:
            "They should not be. Some teams enter order IDs with hyphens and some do not.",
        },
        {
          id: "rel_leadership",
          priority: 2,
          anyKeywords: ["leadership", "need", "expect", "deliver", "report", "want"],
          reply:
            "The corrected delayed-revenue number and a recommendation that prevents this tomorrow.",
        },
      ],
      fallbackReply:
        "I only know that the service team can see two delayed orders that the dashboard is missing.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "What is the most likely cause of the missing delayed orders?",
      options: [
        "Revenue values are incorrect",
        "Order statuses are incorrect",
        "Order IDs use inconsistent formatting",
        "The dashboard refresh is too slow",
      ],
      points: 30,
      answer: ["Order IDs use inconsistent formatting"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "orders.csv uses A-102 / A-103 while manual_delays.csv uses A102 / A103, so the join on Order ID finds no matches.",
    },
    {
      id: "corrected_value",
      kind: "number",
      prompt: "What is the corrected delayed revenue in dollars?",
      helpText: "Enter the number only, e.g. 1500",
      points: 25,
      answer: [1300, 0.5],
      competencyKey: "analytical_correctness",
      expectedEvidence: "A-102 ($800) + A-103 ($500) = $1,300.",
    },
    {
      id: "supporting_orders",
      kind: "multi_select",
      prompt: "Which orders support the corrected number?",
      options: ["A-101", "A-102", "A-103", "A-104"],
      points: 15,
      answer: ["A-102", "A-103"],
      competencyKey: "evidence_selection",
      expectedEvidence: "A-102 and A-103 appear in the manual delay file (as A102 and A103).",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Write a recommendation that prevents this tomorrow.",
      helpText: "Max 400 characters. What should change in the pipeline?",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "normalize_ids",
          label: "Normalize IDs before joining",
          keywords: ["normaliz", "standardiz", "clean", "strip", "consistent format", "same format"],
        },
        {
          id: "remove_hyphens",
          label: "Remove or standardize hyphens",
          keywords: ["hyphen", "dash", "remove -", "strip -"],
        },
        {
          id: "validate_match",
          label: "Validate the match rate",
          keywords: ["match rate", "validate", "check match", "unmatched", "reconcil", "verify"],
        },
        {
          id: "alert_unmatched",
          label: "Alert or test for unmatched records",
          keywords: ["alert", "test", "monitor", "flag", "warn", "fail the job"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Normalize order IDs (strip hyphens) in both sources before joining, validate the match rate, and alert on unmatched delay records so silent drops can't recur.",
    },
  ],
  competencies: [
    { key: "problem_diagnosis", label: "Problem diagnosis" },
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "evidence_selection", label: "Evidence selection" },
    { key: "recommendation_quality", label: "Recommendation quality" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause:
      "Correctly identified inconsistent ID formatting as the cause of the missing records.",
    corrected_value: "Calculated the corrected delayed revenue of $1,300 from the source data.",
    supporting_orders: "Selected exactly the two orders that support the corrected number.",
    recommendation:
      "The recommendation addresses the join defect rather than just the symptom.",
  },
  improvementTemplates: {
    root_cause:
      "The root cause was inconsistent order ID formatting between the two files: the dashboard's join found no matches.",
    corrected_value:
      "The corrected delayed revenue is $1,300 (A-102 at $800 plus A-103 at $500).",
    supporting_orders: "The supporting records are A-102 and A-103, listed without hyphens in the delay file.",
    recommendation:
      "A stronger recommendation would normalize IDs before joining and add a check for unmatched delay records so this cannot silently recur.",
  },
};

// ---------------------------------------------------------------------------
// 2. Business Intelligence Analyst: One Renewal Rate
//    Finance: 40/50 = 80%. CS: 40/45 = 88.9%. Finalized rate: 88.9%.
// ---------------------------------------------------------------------------
export const MICRO_BI_ANALYST: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "one-renewal-rate",
  roleKey: "bi_analyst",
  title: "One Renewal Rate",
  tagline: "Two dashboards, two renewal rates, one quarter. Leadership wants one number.",
  mission:
    "Finance and Customer Success are reporting different renewal rates for the same quarter. Determine why, select the appropriate metric and write a definition leadership can use consistently.",
  companyName: "Corvid Software",
  durationMinutes: 5,
  resources: [
    {
      id: "cohort",
      title: "Renewal cohort",
      kind: "table",
      content:
        "| Status | Accounts |\n| --- | ---: |\n| Renewed | 40 |\n| Churned | 5 |\n| Pending | 5 |",
    },
    {
      id: "definitions",
      title: "Dashboard definitions",
      kind: "markdown",
      content:
        "## Finance dashboard\n\n`Renewed / All accounts due`\n\nResult: **40 / 50 = 80%**\n\n## Customer Success dashboard\n\n`Renewed / Accounts with a final decision`\n\nResult: **40 / 45 = 88.9%**",
    },
    {
      id: "leadership",
      title: "Leadership request",
      kind: "markdown",
      content:
        "## From the CFO\n\nWe need the finalized renewal performance for the quarter. Pending contracts should remain visible but should not count as renewed or churned until a final decision is made.",
    },
  ],
  stakeholders: [
    {
      id: "maya",
      name: "Maya Chen",
      role: "VP of Customer Success",
      blurb: "Owns the renewal motion. Wants a definition both teams will accept.",
      knowledge: [
        "Leadership wants to compare finalized outcomes across quarters.",
        "Pending accounts should be excluded from the finalized rate but displayed alongside it.",
      ],
      withholds: ["Will not dictate the final definition."],
      responseRules: [
        {
          id: "rel_usage",
          priority: 3,
          anyKeywords: ["used for", "use the metric", "purpose", "decision", "compare", "why", "leadership want"],
          reply:
            "Leadership wants to compare finalized outcomes across quarters. We should report pending accounts separately.",
        },
        {
          id: "rel_pending",
          priority: 2,
          anyKeywords: ["pending", "ignore", "exclude", "open", "undecided", "denominator"],
          reply: "They should be excluded from the finalized rate but displayed alongside it.",
        },
      ],
      fallbackReply:
        "Good question. What I can tell you is the two dashboards pull from the same cohort. The difference is in how each team defines the calculation.",
    },
  ],
  questions: [
    {
      id: "why_disagree",
      kind: "single_select",
      prompt: "Why do the two dashboards disagree?",
      options: [
        "They use different denominators: one includes pending accounts, one doesn't",
        "They pull from different databases",
        "Customer Success is counting renewals twice",
        "Finance's data is one month stale",
      ],
      points: 25,
      answer: ["They use different denominators: one includes pending accounts, one doesn't"],
      competencyKey: "metric_reasoning",
      expectedEvidence:
        "Finance divides by all 50 accounts due; Customer Success divides by the 45 accounts with a final decision. Same numerator, different denominator.",
    },
    {
      id: "finalized_rate",
      kind: "single_select",
      prompt: "Which finalized renewal rate matches the leadership request?",
      options: ["80%", "84.4%", "88.9%", "95%"],
      points: 25,
      answer: ["88.9%"],
      competencyKey: "analytical_correctness",
      expectedEvidence:
        "Finalized rate = 40 renewed / (40 renewed + 5 churned) = 88.9%. Pending accounts have no final decision yet.",
    },
    {
      id: "pending_treatment",
      kind: "single_select",
      prompt: "How should the 5 pending accounts be represented?",
      options: [
        "Excluded from the finalized rate and reported separately",
        "Counted as churned until they renew",
        "Counted as renewed since most will renew",
        "Removed from all reporting",
      ],
      points: 20,
      answer: ["Excluded from the finalized rate and reported separately"],
      competencyKey: "business_interpretation",
      expectedEvidence:
        "The leadership request says pending contracts should remain visible but not count as renewed or churned until decided.",
    },
    {
      id: "definition",
      kind: "text",
      prompt: "Write a reusable metric definition leadership can standardize on.",
      helpText: "Max 400 characters. Be precise about the numerator, denominator and pending accounts.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "numerator_denominator",
          label: "Precise numerator and denominator",
          keywords: ["renewed / ", "renewed divided", "renewed plus churned", "renewed + churned", "denominator", "numerator"],
        },
        {
          id: "exclude_pending",
          label: "Pending excluded from the rate",
          keywords: ["exclud", "not count", "no final decision", "until decided", "left out"],
        },
        {
          id: "report_separately",
          label: "Pending reported separately",
          keywords: ["separately", "alongside", "visible", "report pending", "shown"],
        },
      ],
      competencyKey: "definition_clarity",
      expectedEvidence:
        "Finalized renewal rate equals renewed accounts divided by renewed plus churned accounts. Pending accounts are excluded from the denominator and reported separately.",
    },
  ],
  competencies: [
    { key: "metric_reasoning", label: "Metric reasoning" },
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "definition_clarity", label: "Definition clarity" },
    { key: "business_interpretation", label: "Business interpretation" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    why_disagree: "Identified the denominator difference as the source of the disagreement.",
    finalized_rate: "Selected the correct finalized rate of 88.9%.",
    pending_treatment: "Treated pending accounts exactly as the leadership request specified.",
    definition: "The definition is precise enough that the disagreement cannot recur.",
  },
  improvementTemplates: {
    why_disagree:
      "The dashboards disagree on the denominator: Finance divides by all 50 accounts due; Customer Success divides by the 45 with a final decision.",
    finalized_rate: "The finalized rate is 88.9%: 40 renewed over 45 decided accounts.",
    pending_treatment:
      "Pending accounts should be excluded from the finalized rate but reported alongside it, per the leadership request.",
    definition:
      "A stronger definition names the exact numerator and denominator and states how pending accounts are handled.",
  },
};

// ---------------------------------------------------------------------------
// 3. Solutions Engineer: Promise or Product Fit
// ---------------------------------------------------------------------------
export const MICRO_SOLUTIONS_ENGINEER: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "promise-or-product-fit",
  roleKey: "solutions_engineer",
  title: "Promise or Product Fit",
  tagline: "Sales wants an answer before tomorrow's demo. The product has one real gap.",
  mission:
    "A prospective customer wants SSO, a read-only CRM import and real-time bidirectional CRM updates. Sales wants an answer before tomorrow's product demonstration. Determine what is supported and propose an honest solution.",
  companyName: "Meridian Assurance (prospect)",
  durationMinutes: 5,
  resources: [
    {
      id: "requirements",
      title: "Customer requirements",
      kind: "markdown",
      content:
        "## What the customer asked for\n\n- SAML single sign-on\n- Import CRM account data\n- Send completed assessment results back to the CRM\n- Reflect CRM changes inside the product immediately\n- No custom software installed inside the customer network",
    },
    {
      id: "capabilities",
      title: "Product capabilities",
      kind: "table",
      content:
        "| Capability | Status |\n| --- | --- |\n| SAML SSO | Supported |\n| Scheduled read-only CRM API import | Supported |\n| Outbound completion webhooks | Supported |\n| Real-time CRM write-back | Not supported |\n| Customer-installed connector | Optional, unavailable to this customer |",
    },
  ],
  stakeholders: [
    {
      id: "alex",
      name: "Alex Morgan",
      role: "Account Executive",
      blurb: "Owns the deal. Wants a confident answer for tomorrow's demo.",
      knowledge: [
        "SSO and getting candidate results into the CRM are mandatory; real-time updates are nice-to-have.",
        "Sales said 'we support CRM integration' but promised no specific synchronization method.",
      ],
      withholds: ["Will not decide the architecture."],
      responseRules: [
        {
          id: "rel_essential",
          priority: 3,
          anyKeywords: ["essential", "mandatory", "must have", "required", "priorit", "deal breaker", "need most"],
          reply:
            "SSO and getting candidate results into the CRM are mandatory. Real-time updates would be helpful, but the customer has not said they are mandatory.",
        },
        {
          id: "rel_promised",
          priority: 2,
          anyKeywords: ["promise", "commit", "told them", "said we", "real-time", "real time", "sync"],
          reply:
            "I said we support CRM integration, but I did not promise a specific synchronization method.",
        },
      ],
      fallbackReply:
        "I need something I can say to the customer tomorrow. What's actually possible with what we have today?",
    },
  ],
  questions: [
    {
      id: "capability_classification",
      kind: "multi_select",
      prompt: "Which customer requirements are fully supported today, without the connector?",
      options: [
        "SAML single sign-on",
        "Import CRM account data",
        "Send completed assessment results back to the CRM",
        "Reflect CRM changes inside the product immediately",
      ],
      points: 30,
      answer: [
        "SAML single sign-on",
        "Import CRM account data",
        "Send completed assessment results back to the CRM",
      ],
      competencyKey: "requirement_analysis",
      expectedEvidence:
        "SAML SSO, scheduled read-only CRM import and outbound completion webhooks are supported. Immediate reflection of CRM changes requires real-time write-back, which is not supported.",
    },
    {
      id: "architecture",
      kind: "single_select",
      prompt: "Which architecture do you recommend?",
      options: [
        "SAML SSO + scheduled CRM import + outbound completion webhook",
        "Customer-installed connector",
        "Promise real-time bidirectional synchronization",
        "Manual CSV export only",
      ],
      points: 25,
      answer: ["SAML SSO + scheduled CRM import + outbound completion webhook"],
      competencyKey: "solution_judgment",
      expectedEvidence:
        "The supported stack covers every mandatory requirement. The connector is unavailable to this customer, and promising real-time sync would be false.",
    },
    {
      id: "main_gap",
      kind: "single_select",
      prompt: "What is the main product gap for this customer?",
      options: [
        "Real-time bidirectional CRM synchronization",
        "SAML single sign-on",
        "CRM data import",
        "Sending results to the CRM",
      ],
      points: 15,
      answer: ["Real-time bidirectional CRM synchronization"],
      competencyKey: "product_understanding",
      expectedEvidence: "Real-time CRM write-back is the only requirement the product cannot meet today.",
    },
    {
      id: "customer_explanation",
      kind: "text",
      prompt: "Write a short customer-facing explanation of your proposed solution.",
      helpText: "Max 400 characters. Communicate the solution without hiding the limitation.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "state_supported",
          label: "States what is supported",
          keywords: ["sso", "single sign", "import", "webhook", "results", "scheduled"],
        },
        {
          id: "honest_limitation",
          label: "Acknowledges the real-time limitation honestly",
          keywords: ["not real-time", "not real time", "not immediate", "not currently support", "limitation", "gap", "scheduled rather", "near real"],
        },
        {
          id: "workable_alternative",
          label: "Offers the workable alternative",
          keywords: ["scheduled", "webhook", "sync interval", "hourly", "daily", "refresh", "on completion"],
        },
      ],
      competencyKey: "transparency",
      expectedEvidence:
        "We support SAML SSO, a scheduled read-only import of your CRM accounts, and instant delivery of completed results to your CRM via webhooks. Changes made in your CRM appear at the next scheduled sync rather than in real time. We're happy to tune the interval to your workflow.",
    },
  ],
  competencies: [
    { key: "requirement_analysis", label: "Requirement analysis" },
    { key: "product_understanding", label: "Product understanding" },
    { key: "solution_judgment", label: "Solution judgment" },
    { key: "transparency", label: "Transparency" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    capability_classification: "Classified every requirement correctly against real product capabilities.",
    architecture: "Recommended the architecture that meets all mandatory requirements without overpromising.",
    main_gap: "Identified real-time bidirectional synchronization as the true gap.",
    customer_explanation: "The customer explanation is honest about the limitation while presenting a workable solution.",
  },
  improvementTemplates: {
    capability_classification:
      "Three requirements are fully supported: SAML SSO, scheduled CRM import, and outbound completion webhooks. Immediate CRM reflection is not.",
    architecture:
      "The strongest recommendation is SAML SSO + scheduled CRM import + outbound completion webhook. It covers every mandatory requirement with what exists today.",
    main_gap: "The main gap is real-time bidirectional CRM synchronization, which the product does not support.",
    customer_explanation:
      "A stronger explanation names what works, states plainly that updates are scheduled rather than real-time, and offers to tune the sync interval.",
  },
};
