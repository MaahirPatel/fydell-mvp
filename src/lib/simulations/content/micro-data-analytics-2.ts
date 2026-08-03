/**
 * Five-minute micro simulations, batch 2.
 * Four Data Analyst sims and four Business Intelligence Analyst sims.
 */
import type { MicroSimContent } from "../micro-types";

// ---------------------------------------------------------------------------
// 1. Data Analyst - Duplicate Revenue
//    Invoices: 1200 + 800 + 500 = 2500. Naive join double counts INV-2 (800),
//    so the dashboard shows 3300. Corrected total = 2500.
// ---------------------------------------------------------------------------
export const MICRO_DA_DUPLICATE_REVENUE: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "duplicate-revenue",
  roleKey: "data_analyst",
  title: "Duplicate Revenue",
  tagline: "The revenue dashboard says $3,300. The invoice team says that is too high.",
  mission:
    "The revenue dashboard shows $3,300 for the week, but the invoice team insists their invoices only add up to $2,500. Find out why the dashboard is overstating revenue, compute the correct total and recommend a fix.",
  companyName: "Brightwell Supply",
  durationMinutes: 5,
  resources: [
    {
      id: "invoices",
      title: "invoices.csv",
      kind: "table",
      content:
        "| Invoice ID | Amount | Customer |\n| --- | ---: | --- |\n| INV-1 | 1200 | Acme Tools |\n| INV-2 | 800 | Bolt Ltd |\n| INV-3 | 500 | Corvus Co |",
    },
    {
      id: "payment_events",
      title: "payment_events.csv",
      kind: "table",
      content:
        "| Event ID | Invoice ID | Event type |\n| --- | --- | --- |\n| PE-1 | INV-1 | card_charge |\n| PE-2 | INV-2 | card_charge |\n| PE-3 | INV-2 | card_retry |\n| PE-4 | INV-3 | card_charge |",
    },
    {
      id: "dashboard_query",
      title: "How the dashboard computes revenue",
      kind: "markdown",
      content:
        "## Dashboard query\n\nThe dashboard joins `invoices.csv` to `payment_events.csv` on **Invoice ID** and sums invoice Amount for every matched row.\n\nDisplayed total this week: **$3,300**.",
    },
  ],
  stakeholders: [
    {
      id: "priya",
      name: "Priya Raman",
      role: "Finance Manager",
      blurb: "Owns weekly revenue reporting. Needs a number she can defend.",
      knowledge: [
        "INV-2's first card charge failed and the system retried it, so INV-2 has two payment events.",
        "The invoice table is the source of truth: one row per invoice, one amount per row.",
        "Leadership needs the corrected total and a prevention step today.",
      ],
      withholds: ["Will not state the corrected total or name the join defect."],
      responseRules: [
        {
          id: "rel_retry",
          priority: 3,
          anyKeywords: ["retry", "twice", "two events", "duplicate", "failed", "second charge", "multiple payment", "inv-2", "inv2"],
          reply:
            "INV-2's first card charge failed and the system retried it. Both attempts were logged as separate payment events.",
        },
        {
          id: "rel_source",
          priority: 2,
          anyKeywords: ["source of truth", "invoice table", "which table", "trust", "true revenue", "correct amount"],
          reply: "The invoice table is our source of truth. One row per invoice, one amount per row.",
        },
        {
          id: "rel_need",
          priority: 1,
          anyKeywords: ["need", "deliver", "leadership", "report", "expect", "want"],
          reply:
            "A corrected revenue number and a change that keeps this from happening again next month.",
        },
      ],
      fallbackReply:
        "All I can tell you is the invoice team swears their totals are right, and the dashboard number is higher than theirs.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why is the dashboard overstating revenue?",
      options: [
        "A one-to-many join duplicates invoice revenue",
        "Invoice amounts were entered twice in the invoice table",
        "A currency conversion doubled INV-2",
        "The dashboard cache is stale",
      ],
      points: 30,
      answer: ["A one-to-many join duplicates invoice revenue"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "INV-2 has two payment events (PE-2 and PE-3). Joining invoices to payment events produces two rows for INV-2, so its $800 is counted twice.",
    },
    {
      id: "corrected_total",
      kind: "number",
      prompt: "What is the corrected total revenue in dollars?",
      helpText: "Enter the number only, e.g. 1500",
      points: 25,
      answer: [2500, 0.5],
      competencyKey: "analytical_correctness",
      expectedEvidence: "INV-1 ($1,200) + INV-2 ($800) + INV-3 ($500) = $2,500.",
    },
    {
      id: "duplicated_invoice",
      kind: "multi_select",
      prompt: "Which invoice is being double counted?",
      options: ["INV-1", "INV-2", "INV-3"],
      points: 15,
      answer: ["INV-2"],
      competencyKey: "evidence_selection",
      expectedEvidence: "INV-2 appears twice in payment_events.csv (a charge and a retry), so it is the only duplicated invoice.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Recommend a fix so payment retries never inflate revenue again.",
      helpText: "Max 400 characters. What should change in the query or pipeline?",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "aggregate_before_join",
          label: "Aggregate payment events before joining",
          keywords: ["aggregate", "group by", "one row per invoice", "sum payments first", "collapse"],
        },
        {
          id: "dedupe_by_invoice",
          label: "Deduplicate by invoice id",
          keywords: ["dedup", "distinct", "unique invoice", "one event per invoice"],
        },
        {
          id: "row_count_check",
          label: "Add a row-count check",
          keywords: ["row count", "count check", "same number of rows", "row-count", "count of invoices"],
        },
        {
          id: "reconcile_source",
          label: "Reconcile totals against the source",
          keywords: ["reconcil", "compare to source", "tie out", "match the invoice total", "invoice table total"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Aggregate payment events to one row per invoice before joining, or select distinct invoice ids. Add a row-count check on the joined output and reconcile the dashboard total against the invoice table.",
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
    root_cause: "Correctly identified the one-to-many join as the source of the inflated total.",
    corrected_total: "Calculated the corrected revenue of $2,500 from the invoice table.",
    duplicated_invoice: "Pinpointed INV-2 as the only invoice counted twice.",
    recommendation: "The recommendation fixes the join itself and adds a check so the defect cannot return silently.",
  },
  improvementTemplates: {
    root_cause:
      "The root cause is a one-to-many join. INV-2 has two payment events, so its revenue is summed twice.",
    corrected_total: "The corrected total is $2,500: INV-1 at $1,200 plus INV-2 at $800 plus INV-3 at $500.",
    duplicated_invoice: "INV-2 is the duplicated invoice. It appears twice in the payment events file.",
    recommendation:
      "A stronger fix aggregates payment events to one row per invoice before joining and adds a row-count check against the invoice table.",
  },
};

// ---------------------------------------------------------------------------
// 2. Data Analyst - The Broken Funnel
//    1000 visitors, 200 signups, 80 activated.
//    Marketing: 80 / 1000 = 8%. Product: 80 / 200 = 40%.
// ---------------------------------------------------------------------------
export const MICRO_DA_BROKEN_FUNNEL: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "broken-funnel",
  roleKey: "data_analyst",
  title: "The Broken Funnel",
  tagline: "Marketing says activation is 8%. Product says 40%. Both pull the same data.",
  mission:
    "Marketing reported 8% activation in the monthly review. Product reported 40% for the same month. Both teams pulled from the same funnel data. Explain why the numbers differ and propose naming that keeps both metrics useful.",
  companyName: "Fernwood Labs",
  durationMinutes: 5,
  resources: [
    {
      id: "funnel",
      title: "Monthly funnel",
      kind: "table",
      content:
        "| Stage | Count |\n| --- | ---: |\n| Visitors | 1000 |\n| Signups | 200 |\n| Activated | 80 |",
    },
    {
      id: "definitions",
      title: "How each team defines activation rate",
      kind: "markdown",
      content:
        "## Marketing\n\n`Activated / Visitors`\n\nReported: **80 / 1000 = 8%**\n\n## Product\n\n`Activated / Signups`\n\nReported: **80 / 200 = 40%**",
    },
  ],
  stakeholders: [
    {
      id: "talia",
      name: "Talia Brooks",
      role: "Head of Growth",
      blurb: "Runs the monthly review. Wants the argument between teams to end.",
      knowledge: [
        "Marketing measures from first visit because they own the whole funnel starting at the ad click.",
        "Product measures from signup because they own onboarding.",
        "Both numbers come from the same event stream.",
      ],
      withholds: ["Will not say which number is correct."],
      responseRules: [
        {
          id: "rel_marketing",
          priority: 3,
          anyKeywords: ["marketing", "8%", "8 percent", "visitor", "whole funnel", "ad click", "top of funnel"],
          reply:
            "Marketing measures from first visit. They care about the whole funnel starting at the ad click.",
        },
        {
          id: "rel_product",
          priority: 2,
          anyKeywords: ["product", "40", "signup", "after sign", "onboarding", "account created"],
          reply:
            "Product measures from signup. They own onboarding, so they start counting once someone creates an account.",
        },
        {
          id: "rel_data",
          priority: 1,
          anyKeywords: ["same data", "source", "event", "pull from", "pipeline", "broken data"],
          reply: "Both numbers come from the same event stream. Nobody's data is broken.",
        },
      ],
      fallbackReply:
        "Both teams are sure their number is right. Figure out how that can be true at the same time.",
    },
  ],
  questions: [
    {
      id: "why_disagree",
      kind: "single_select",
      prompt: "Why do the two activation rates disagree?",
      options: [
        "The two metrics use different denominators",
        "Marketing's data is a month behind",
        "Product is excluding mobile users",
        "The activation event fires twice for some users",
      ],
      points: 30,
      answer: ["The two metrics use different denominators"],
      competencyKey: "metric_reasoning",
      expectedEvidence:
        "Both teams count 80 activated users. Marketing divides by 1,000 visitors while Product divides by 200 signups. Same numerator, different denominator.",
    },
    {
      id: "signup_rate",
      kind: "number",
      prompt: "What percent of signups activated?",
      helpText: "Enter the percent as a number only, e.g. 25",
      points: 25,
      answer: [40, 0.5],
      competencyKey: "analytical_correctness",
      expectedEvidence: "80 activated / 200 signups = 40%.",
    },
    {
      id: "which_correct",
      kind: "single_select",
      prompt: 'Which number answers "of the people who signed up, how many activated?"',
      options: ["8%", "20%", "40%", "80%"],
      points: 15,
      answer: ["40%"],
      competencyKey: "business_interpretation",
      expectedEvidence:
        "That question starts the count at signup, so the denominator is 200 signups and the answer is 40%.",
    },
    {
      id: "labeling",
      kind: "text",
      prompt: "Propose how to label the two metrics so both stay useful.",
      helpText: "Max 400 characters. Both teams should keep a metric they can use.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "name_denominator",
          label: "Put the denominator in the metric name",
          keywords: ["denominator", "in the name", "rename", "name the metric", "name says"],
        },
        {
          id: "keep_both",
          label: "Keep both metrics",
          keywords: ["keep both", "both metrics", "both are useful", "both stay", "not replace"],
        },
        {
          id: "distinct_names",
          label: "Visitor-to-activation vs signup-to-activation",
          keywords: ["visitor-to-activation", "signup-to-activation", "visitor to activation", "signup to activation"],
        },
        {
          id: "document_definitions",
          label: "Document the definitions",
          keywords: ["document", "definition", "glossary", "data dictionary", "write down"],
        },
      ],
      competencyKey: "definition_clarity",
      expectedEvidence:
        "Keep both metrics but rename them so the denominator is in the name: visitor-to-activation rate (8%) and signup-to-activation rate (40%). Document both definitions so the review never repeats this argument.",
    },
  ],
  competencies: [
    { key: "metric_reasoning", label: "Metric reasoning" },
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "business_interpretation", label: "Business interpretation" },
    { key: "definition_clarity", label: "Definition clarity" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    why_disagree: "Identified the denominator difference as the source of the disagreement.",
    signup_rate: "Calculated the signup-to-activation rate of 40% correctly.",
    which_correct: "Matched the right metric to the business question being asked.",
    labeling: "The proposed names make the denominator explicit so the two numbers can no longer be confused.",
  },
  improvementTemplates: {
    why_disagree:
      "Both teams count the same 80 activated users. Marketing divides by 1,000 visitors and Product divides by 200 signups.",
    signup_rate: "The signup-to-activation rate is 40%: 80 activated out of 200 signups.",
    which_correct:
      'The question "of the people who signed up, how many activated?" starts at signup, so the answer is 40%.',
    labeling:
      "A stronger proposal keeps both metrics, puts the denominator in each name (visitor-to-activation vs signup-to-activation) and documents the definitions.",
  },
};

// ---------------------------------------------------------------------------
// 3. Data Analyst - The Refund Spike
//    Refunds: 500 + 650 + 400 + 850 + 350 + 400 = 3150.
//    Test accounts A-3 (R-3, 400) and A-5 (R-5, 350) = 750.
//    Production total = 3150 - 750 = 2400.
// ---------------------------------------------------------------------------
export const MICRO_DA_REFUND_SPIKE: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "refund-spike",
  roleKey: "data_analyst",
  title: "The Refund Spike",
  tagline: "Refunds jumped this week. Customers may have nothing to do with it.",
  mission:
    "The weekly refund dashboard shows $3,150, well above the usual range. Finance is worried about a customer problem. Find out what is actually inflating the number, compute the real refund total and recommend a durable fix.",
  companyName: "Kestrel Goods",
  durationMinutes: 5,
  resources: [
    {
      id: "refunds",
      title: "refunds.csv (this week)",
      kind: "table",
      content:
        "| Refund ID | Account ID | Amount |\n| --- | --- | ---: |\n| R-1 | A-1 | 500 |\n| R-2 | A-2 | 650 |\n| R-3 | A-3 | 400 |\n| R-4 | A-4 | 850 |\n| R-5 | A-5 | 350 |\n| R-6 | A-6 | 400 |",
    },
    {
      id: "accounts",
      title: "accounts.csv",
      kind: "table",
      content:
        "| Account ID | is_test |\n| --- | --- |\n| A-1 | false |\n| A-2 | false |\n| A-3 | true |\n| A-4 | false |\n| A-5 | true |\n| A-6 | false |",
    },
    {
      id: "context",
      title: "Reporting context",
      kind: "markdown",
      content:
        "## Weekly refund review\n\nFinance reviews refunds every week and reports the total to the CFO. A normal week lands between $2,300 and $2,500.\n\nThe refund dashboard sums every row in `refunds.csv`. Displayed total this week: **$3,150**.",
    },
  ],
  stakeholders: [
    {
      id: "marcus",
      name: "Marcus Hale",
      role: "Finance Controller",
      blurb: "Reports the weekly refund total to the CFO. Hates surprises.",
      knowledge: [
        "QA created internal accounts last month to test the refund flow. They are flagged in the accounts table.",
        "A normal week lands between $2,300 and $2,500.",
        "He needs the real total and a fix so the question never comes back.",
      ],
      withholds: ["Will not compute the production total or point at specific rows."],
      responseRules: [
        {
          id: "rel_test_accounts",
          priority: 3,
          anyKeywords: ["test account", "internal", "qa", "fake", "flag", "is_test", "test data"],
          reply:
            "QA set up a few internal accounts last month to test the refund flow. They are flagged in the accounts table.",
        },
        {
          id: "rel_baseline",
          priority: 2,
          anyKeywords: ["normal", "typical", "usual", "baseline", "last week", "spike", "range"],
          reply: "A normal week lands between $2,300 and $2,500. This week's number is well above that.",
        },
        {
          id: "rel_need",
          priority: 1,
          anyKeywords: ["need", "report", "cfo", "deliver", "want", "expect"],
          reply: "The real refund total for the week, and a fix so I never have to ask this question again.",
        },
      ],
      fallbackReply:
        "The dashboard total looks too high to me, but I cannot tell you which rows are wrong.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "What is inflating the weekly refund total?",
      options: [
        "Internal test accounts are included in the refund total",
        "Customers are abusing the refund policy",
        "A refund was recorded twice",
        "The weekly date range includes an extra day",
      ],
      points: 30,
      answer: ["Internal test accounts are included in the refund total"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "Accounts A-3 and A-5 are flagged is_test = true in accounts.csv, and their refunds are included in the dashboard sum.",
    },
    {
      id: "production_total",
      kind: "number",
      prompt: "What is the production-only refund total in dollars?",
      helpText: "Enter the number only, e.g. 2000",
      points: 25,
      answer: [2400, 0.5],
      competencyKey: "analytical_correctness",
      expectedEvidence: "R-1 ($500) + R-2 ($650) + R-4 ($850) + R-6 ($400) = $2,400, back inside the normal range.",
    },
    {
      id: "test_rows",
      kind: "multi_select",
      prompt: "Which refund rows belong to test accounts?",
      options: ["R-1", "R-2", "R-3", "R-4", "R-5", "R-6"],
      points: 15,
      answer: ["R-3", "R-5"],
      competencyKey: "evidence_selection",
      expectedEvidence: "R-3 (account A-3) and R-5 (account A-5). Both accounts are flagged is_test = true.",
    },
    {
      id: "durable_fix",
      kind: "text",
      prompt: "Recommend a durable fix so test accounts never leak into finance reporting.",
      helpText: "Max 400 characters. Think beyond this week's number.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "exclude_in_source",
          label: "Exclude flagged test accounts in the source query",
          keywords: ["exclude", "filter out", "where is_test", "source query", "is_test = false"],
        },
        {
          id: "classification_field",
          label: "Add an account classification field",
          keywords: ["classification", "account type", "flag every account", "classify accounts", "label accounts"],
        },
        {
          id: "backfill_reports",
          label: "Backfill historical reports",
          keywords: ["backfill", "historical", "restate", "past reports", "prior weeks"],
        },
        {
          id: "leakage_test",
          label: "Add a data test for test-account leakage",
          keywords: ["data test", "automated test", "alert", "leak", "monitor", "check for test accounts"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Exclude is_test accounts in the source query that feeds the dashboard, maintain an account classification field, backfill historical reports and add an automated data test that fails when a test account appears in finance data.",
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
    root_cause: "Correctly identified test-account contamination instead of assuming a customer problem.",
    production_total: "Calculated the production-only total of $2,400, which falls back inside the normal range.",
    test_rows: "Selected exactly the two refund rows tied to flagged test accounts.",
    durable_fix: "The fix removes test data at the source and adds a test so leakage cannot recur silently.",
  },
  improvementTemplates: {
    root_cause:
      "The spike comes from internal test accounts. A-3 and A-5 are flagged is_test = true and their refunds are in the total.",
    production_total: "The production-only total is $2,400: R-1, R-2, R-4 and R-6.",
    test_rows: "The test rows are R-3 (account A-3) and R-5 (account A-5).",
    durable_fix:
      "A stronger fix excludes flagged accounts in the source query, backfills history and adds an automated test for test-account leakage.",
  },
};

// ---------------------------------------------------------------------------
// 4. Data Analyst - Cohort Drift
//    Six customers; C-2 (Jan -> Feb) and C-6 (Feb -> Mar) move cohorts
//    between the signup-month and first-purchase-month definitions.
// ---------------------------------------------------------------------------
export const MICRO_DA_COHORT_DRIFT: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "cohort-drift",
  roleKey: "data_analyst",
  title: "Cohort Drift",
  tagline: "Retention looks different on two dashboards. The customers did not change.",
  mission:
    "Two retention dashboards disagree for the same months. The old one groups customers by signup month and the new one groups by first-purchase month. Explain the disagreement, quantify how many customers move and recommend how the team should handle the two definitions.",
  companyName: "Alder & Vine",
  durationMinutes: 5,
  resources: [
    {
      id: "customers",
      title: "customers.csv",
      kind: "table",
      content:
        "| Customer | Signup month | First purchase month |\n| --- | --- | --- |\n| C-1 | Jan | Jan |\n| C-2 | Jan | Feb |\n| C-3 | Feb | Feb |\n| C-4 | Feb | Feb |\n| C-5 | Mar | Mar |\n| C-6 | Feb | Mar |",
    },
    {
      id: "definitions",
      title: "Dashboard definitions",
      kind: "markdown",
      content:
        "## Dashboard A (old)\n\nCohort = **signup month**. Retention = share of the cohort with a repeat purchase in a later month.\n\n## Dashboard B (new)\n\nCohort = **first-purchase month**. Same retention formula.\n\n## Leadership question\n\n\"Do customers keep buying after their first purchase?\"",
    },
  ],
  stakeholders: [
    {
      id: "nora",
      name: "Nora Okafor",
      role: "Retention Lead",
      blurb: "Presents retention monthly. Two dashboards are undermining her numbers.",
      knowledge: [
        "The new dashboard was built for the merchandising team and groups by first-purchase month.",
        "The old dashboard groups by signup month. Nothing else changed between them.",
        "Leadership wants to know whether customers keep buying after their first purchase.",
      ],
      withholds: ["Will not say which definition is right or count the moving customers."],
      responseRules: [
        {
          id: "rel_question",
          priority: 3,
          anyKeywords: ["leadership", "question", "trying to answer", "goal", "repeat", "keep buying", "care about"],
          reply:
            "Leadership wants to know whether customers keep buying after their first purchase. That is the question the number needs to answer.",
        },
        {
          id: "rel_dashboards",
          priority: 2,
          anyKeywords: ["two dashboard", "which dashboard", "new dashboard", "old dashboard", "definition", "group", "difference"],
          reply:
            "The old dashboard groups customers by signup month. The new one groups by first-purchase month. Nothing else changed.",
        },
      ],
      fallbackReply:
        "Retention did not really move that much in the business. Something about how we count must have changed.",
    },
  ],
  questions: [
    {
      id: "why_changed",
      kind: "single_select",
      prompt: "Why do the two dashboards report different retention?",
      options: [
        "The cohort definition changed, so customers moved between cohorts",
        "Customers actually churned faster this quarter",
        "A pipeline bug dropped some customers",
        "Seasonality shifted purchases between months",
      ],
      points: 30,
      answer: ["The cohort definition changed, so customers moved between cohorts"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "The dashboards use different cohort bases. Customers whose first purchase came after their signup month land in different cohorts on each dashboard.",
    },
    {
      id: "which_definition",
      kind: "single_select",
      prompt: 'Which cohort definition answers "do customers keep buying after their first purchase?"',
      options: ["Signup month", "First-purchase month", "Calendar quarter", "Last-purchase month"],
      points: 25,
      answer: ["First-purchase month"],
      competencyKey: "metric_reasoning",
      expectedEvidence:
        "The question starts the clock at the first purchase, so cohorts should be grouped by first-purchase month.",
    },
    {
      id: "movers",
      kind: "number",
      prompt: "How many customers move to a different cohort between the two definitions?",
      helpText: "Enter a whole number",
      points: 15,
      answer: [2, 0],
      competencyKey: "analytical_correctness",
      expectedEvidence: "C-2 (signup Jan, first purchase Feb) and C-6 (signup Feb, first purchase Mar). 2 customers.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Recommend how the team should handle the two cohort definitions going forward.",
      helpText: "Max 400 characters. Prevent this confusion from repeating.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "version_definitions",
          label: "Version metric definitions",
          keywords: ["version", "changelog", "metric definition", "definition change", "track changes"],
        },
        {
          id: "state_basis",
          label: "State the cohort basis on the dashboard",
          keywords: ["state the cohort", "label", "on the dashboard", "cohort basis", "show the definition"],
        },
        {
          id: "per_question",
          label: "Pick the definition per business question",
          keywords: ["business question", "per question", "depends on the question", "match the question"],
        },
        {
          id: "communicate_change",
          label: "Communicate the change historically",
          keywords: ["communicate", "announce", "historical", "restate", "notify", "tell stakeholders"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Version metric definitions, state the cohort basis on each dashboard, pick the definition that matches the business question being asked, and communicate the change so historical comparisons are read correctly.",
    },
  ],
  competencies: [
    { key: "problem_diagnosis", label: "Problem diagnosis" },
    { key: "metric_reasoning", label: "Metric reasoning" },
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "recommendation_quality", label: "Recommendation quality" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    why_changed: "Recognized cohort definition drift instead of assuming a real behavior change.",
    which_definition: "Matched the first-purchase cohort definition to the leadership question.",
    movers: "Counted exactly the two customers who move between cohorts.",
    recommendation: "The recommendation makes the cohort basis visible so the two dashboards can coexist without confusion.",
  },
  improvementTemplates: {
    why_changed:
      "Nothing changed in customer behavior. The dashboards group cohorts differently, so customers moved between cohorts.",
    which_definition:
      "First-purchase month answers the leadership question because it starts the clock at the first purchase.",
    movers: "Two customers move: C-2 (signup Jan, first purchase Feb) and C-6 (signup Feb, first purchase Mar).",
    recommendation:
      "A stronger recommendation versions the definitions, labels the cohort basis on each dashboard and communicates the change for historical reads.",
  },
};

// ---------------------------------------------------------------------------
// 5. BI Analyst - The Filtered Forecast
//    Americas 410 + EMEA 220 + APAC 170 = 800 (thousands).
//    Displayed 580 = Americas + APAC with EMEA filtered out.
// ---------------------------------------------------------------------------
export const MICRO_BI_FILTERED_FORECAST: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "filtered-forecast",
  roleKey: "bi_analyst",
  title: "The Filtered Forecast",
  tagline: "The executive forecast dropped overnight. No region actually changed.",
  mission:
    "The executive dashboard shows a $580k forecast and leadership is alarmed because they planned for more. The regional numbers all look fine to the regional teams. Find out why the displayed total is low, compute the correct total and recommend how to prevent this.",
  companyName: "Statler Instruments",
  durationMinutes: 5,
  resources: [
    {
      id: "forecast",
      title: "Forecast by region",
      kind: "table",
      content:
        "| Region | Forecast ($ thousands) |\n| --- | ---: |\n| Americas | 410 |\n| EMEA | 220 |\n| APAC | 170 |",
    },
    {
      id: "dashboard_state",
      title: "Dashboard state",
      kind: "markdown",
      content:
        "## Executive forecast view\n\nDisplayed total: **$580k**\n\nActive filter: **region is Americas, APAC**\n\nThe view was saved last quarter and is the one executives open by default. The total feeds Monday's board deck.",
    },
  ],
  stakeholders: [
    {
      id: "sam",
      name: "Sam Porter",
      role: "Revenue Operations Lead",
      blurb: "Owns the executive dashboard. Needs the board number to be right by Monday.",
      knowledge: [
        "A regional manager saved the filtered view last quarter for a team review, and executives have opened it ever since.",
        "EMEA has not missed a forecast in two years.",
        "The displayed total goes straight into Monday's board deck.",
      ],
      withholds: ["Will not state the corrected total or name the filter as the cause."],
      responseRules: [
        {
          id: "rel_saved_view",
          priority: 3,
          anyKeywords: ["filter", "saved", "view", "who built", "changed", "setting", "default"],
          reply:
            "A regional manager saved that view last quarter for their own team review. Executives have been opening it ever since.",
        },
        {
          id: "rel_emea",
          priority: 2,
          anyKeywords: ["emea", "europe", "missing region", "region missing", "which region", "dropped"],
          reply:
            "EMEA has not missed a forecast in two years. If the total looks low, I would not assume EMEA collapsed.",
        },
        {
          id: "rel_audience",
          priority: 1,
          anyKeywords: ["board", "exec", "who sees", "deck", "meeting", "monday"],
          reply:
            "The number goes straight into Monday's board deck. It has to be right and it has to be explainable.",
        },
      ],
      fallbackReply:
        "The regional teams say their individual numbers look right. It is only the total that looks off.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why is the displayed forecast low?",
      options: [
        "A saved region filter excludes EMEA from the total",
        "EMEA missed its forecast this quarter",
        "The forecast model dropped a region's data",
        "Currency conversion shrank the EMEA number",
      ],
      points: 30,
      answer: ["A saved region filter excludes EMEA from the total"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "The dashboard state shows an active filter of region is Americas, APAC. EMEA's $220k is excluded, which explains the $580k display.",
    },
    {
      id: "corrected_total",
      kind: "number",
      prompt: "What is the corrected total forecast in $ thousands?",
      helpText: "Enter the number only, e.g. 750",
      points: 25,
      answer: [800, 1],
      competencyKey: "analytical_correctness",
      expectedEvidence: "Americas 410 + EMEA 220 + APAC 170 = 800 ($ thousands).",
    },
    {
      id: "included_regions",
      kind: "multi_select",
      prompt: "Which regions does the displayed $580k include?",
      options: ["Americas", "EMEA", "APAC"],
      points: 15,
      answer: ["Americas", "APAC"],
      competencyKey: "evidence_selection",
      expectedEvidence: "Americas (410) + APAC (170) = 580, matching the displayed total. EMEA is filtered out.",
    },
    {
      id: "prevention",
      kind: "text",
      prompt: "Recommend how to prevent a saved filter from distorting an executive number again.",
      helpText: "Max 400 characters. Focus on process and dashboard design.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "show_filter_state",
          label: "Show active filter state on the dashboard",
          keywords: ["show the filter", "display active filter", "filter banner", "visible filter", "active filter"],
        },
        {
          id: "default_unfiltered",
          label: "Default executive views to unfiltered",
          keywords: ["default", "unfiltered", "no filter", "reset", "open clean"],
        },
        {
          id: "review_saved_views",
          label: "Review saved views",
          keywords: ["saved view", "review view", "audit", "shared view", "clean up views"],
        },
        {
          id: "reconciliation_check",
          label: "Add a total reconciliation check",
          keywords: ["reconcil", "total check", "sum of regions", "control total", "compare the total"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Show the active filter state prominently on the dashboard, default executive views to unfiltered, review saved views regularly and add a reconciliation check that compares the displayed total to the sum of all regions.",
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
    root_cause: "Traced the low total to the saved region filter instead of a business decline.",
    corrected_total: "Calculated the corrected forecast of $800k across all three regions.",
    included_regions: "Verified that the displayed $580k is exactly Americas plus APAC.",
    prevention: "The prevention plan makes filter state visible and adds a check on the total itself.",
  },
  improvementTemplates: {
    root_cause:
      "The cause is a saved filter: the view only includes Americas and APAC, so EMEA's $220k is missing from the total.",
    corrected_total: "The corrected total is $800k: Americas 410 + EMEA 220 + APAC 170.",
    included_regions: "The displayed $580k includes only Americas ($410k) and APAC ($170k).",
    prevention:
      "A stronger plan shows the active filter on the dashboard, defaults executive views to unfiltered and reconciles the total against the sum of regions.",
  },
};

// ---------------------------------------------------------------------------
// 6. BI Analyst - Choose the North Star
//    No arithmetic. Completed workflows matches value creation.
// ---------------------------------------------------------------------------
export const MICRO_BI_NORTH_STAR: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "north-star",
  roleKey: "bi_analyst",
  title: "Choose the North Star",
  tagline: "Three teams, three favorite metrics, one company. Pick the number that matters.",
  mission:
    "Three teams each proposed a different primary metric for the company. The CEO wants one number that tells her the company is working, with honest caveats. Evaluate the candidates, pick the best primary metric and write the recommendation.",
  companyName: "Waypoint",
  durationMinutes: 5,
  resources: [
    {
      id: "candidates",
      title: "Metric candidates",
      kind: "markdown",
      content:
        "## Proposed primary metrics\n\n**Weekly active users** (proposed by Marketing)\n\n- Pro: easy to measure and compare\n- Con: counts logins that create no value\n\n**Active accounts** (proposed by Sales)\n\n- Pro: shows breadth across paying customers\n- Con: an account can be active while barely using the product\n\n**Completed workflows** (proposed by Product)\n\n- Pro: counts the moment a customer gets value\n- Con: can hide how many distinct accounts are healthy, since one big account can drive the number",
    },
    {
      id: "context",
      title: "Company context",
      kind: "markdown",
      content:
        "## What the product does\n\nWaypoint automates operational workflows for mid-size companies. The product creates value when a customer completes a workflow. Customers renew when workflows complete reliably.",
    },
  ],
  stakeholders: [
    {
      id: "iris",
      name: "Iris Kane",
      role: "CEO",
      blurb: "Wants one primary metric she can hold the company to.",
      knowledge: [
        "Customers renew when workflows complete reliably. Churn notes almost always cite failing workflows.",
        "Each team proposed the metric closest to what it owns.",
      ],
      withholds: ["Will not pick the metric herself."],
      responseRules: [
        {
          id: "rel_value",
          priority: 3,
          anyKeywords: ["value", "renew", "why customers", "pay for", "churn", "care about", "goal"],
          reply:
            "Customers renew when workflows complete reliably. When they churn, the exit note almost always says workflows kept failing.",
        },
        {
          id: "rel_teams",
          priority: 2,
          anyKeywords: ["team", "propose", "why three", "marketing", "sales", "product", "bias"],
          reply:
            "Each team proposed the metric closest to what it owns. That is exactly why we need one number above all of them.",
        },
      ],
      fallbackReply:
        "I do not want the easiest metric to move. I want the one that tells me the company is actually working.",
    },
  ],
  questions: [
    {
      id: "best_metric",
      kind: "single_select",
      prompt: "Which metric best matches how the company creates value?",
      options: ["Weekly active users", "Active accounts", "Completed workflows", "Total page views"],
      points: 30,
      answer: ["Completed workflows"],
      competencyKey: "metric_reasoning",
      expectedEvidence:
        "The context states the product creates value when a customer completes a workflow, and renewals track workflow reliability. Completed workflows counts that moment directly.",
    },
    {
      id: "limitation",
      kind: "single_select",
      prompt: "What is the biggest limitation of completed workflows as a primary metric?",
      options: [
        "It can hide how many distinct accounts are healthy",
        "It is impossible to measure",
        "It counts logins that create no value",
        "It ignores paying customers entirely",
      ],
      points: 25,
      answer: ["It can hide how many distinct accounts are healthy"],
      competencyKey: "critical_evaluation",
      expectedEvidence:
        "One large account can drive the workflow count while the broader customer base weakens, so the metric can mask account-level health.",
    },
    {
      id: "supporting_metrics",
      kind: "multi_select",
      prompt: "Which metrics from the proposals make good supporting metrics?",
      options: ["Active accounts", "Weekly active users", "Total page views", "Employee headcount"],
      points: 15,
      answer: ["Active accounts", "Weekly active users"],
      competencyKey: "evidence_selection",
      expectedEvidence:
        "Active accounts covers the breadth blind spot of completed workflows, and weekly active users tracks engagement. Both were proposed and both complement the primary metric.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Write the recommendation to the CEO.",
      helpText: "Max 400 characters. Make the case and be honest about the weakness.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "tie_to_value",
          label: "Tie the metric to value creation",
          keywords: ["value", "value creation", "when a customer completes", "matches how the product", "renew"],
        },
        {
          id: "name_limitation",
          label: "Name the limitation honestly",
          keywords: ["limitation", "weakness", "can hide", "caveat", "one big account", "blind spot"],
        },
        {
          id: "pair_supporting",
          label: "Pair with supporting metrics",
          keywords: ["supporting metric", "pair", "alongside", "guardrail", "secondary", "active accounts"],
        },
        {
          id: "revisit",
          label: "Revisit as the product changes",
          keywords: ["revisit", "review", "revise", "as the product changes", "re-evaluate"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Recommend completed workflows because it counts the moment customers get value and renewals track it. Name the limitation: one big account can hide weak breadth. Pair it with active accounts and weekly active users, and revisit the choice as the product changes.",
    },
  ],
  competencies: [
    { key: "metric_reasoning", label: "Metric reasoning" },
    { key: "critical_evaluation", label: "Critical evaluation" },
    { key: "evidence_selection", label: "Evidence selection" },
    { key: "recommendation_quality", label: "Recommendation quality" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    best_metric: "Chose the metric that counts the moment customers get value.",
    limitation: "Named the real weakness of the chosen metric instead of defending it blindly.",
    supporting_metrics: "Selected supporting metrics that cover the primary metric's blind spot.",
    recommendation: "The recommendation makes an honest case: value linkage, stated limitation and supporting metrics.",
  },
  improvementTemplates: {
    best_metric:
      "Completed workflows best matches value creation. The context says the product creates value when a customer completes a workflow.",
    limitation:
      "The biggest limitation is that one large account can drive the count, hiding how many distinct accounts are healthy.",
    supporting_metrics:
      "Active accounts and weekly active users are the strong supporting picks. They cover breadth and engagement.",
    recommendation:
      "A stronger recommendation ties the metric to value creation, names its limitation, pairs it with supporting metrics and commits to revisiting it.",
  },
};

// ---------------------------------------------------------------------------
// 7. BI Analyst - Currency Confusion
//    300 USD + 200 EUR * 1.10 (= 220) + 100 GBP * 1.25 (= 125) = 645 thousand USD.
//    Naive sum of raw numbers = 600.
// ---------------------------------------------------------------------------
export const MICRO_BI_CURRENCY_CONFUSION: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "currency-confusion",
  roleKey: "bi_analyst",
  title: "Currency Confusion",
  tagline: "The regional dashboard adds dollars, euros and pounds like they are the same thing.",
  mission:
    "The regional revenue dashboard shows a 600 total by adding the raw regional numbers, but the regions report in three different currencies. Diagnose the problem, compute the correct USD total and recommend how currency should be handled in reporting.",
  companyName: "Ostara Goods",
  durationMinutes: 5,
  resources: [
    {
      id: "revenue",
      title: "Quarterly revenue by region",
      kind: "table",
      content:
        "| Region | Revenue (thousands) | Currency |\n| --- | ---: | --- |\n| US | 300 | USD |\n| Germany | 200 | EUR |\n| UK | 100 | GBP |",
    },
    {
      id: "rates",
      title: "Exchange rates",
      kind: "markdown",
      content:
        "## Treasury rates\n\n- 1 EUR = 1.10 USD\n- 1 GBP = 1.25 USD\n\nRates as of the last business day of the quarter, from the company treasury feed.\n\n## Dashboard note\n\nThe dashboard sums the Revenue column directly and displays **600**.",
    },
  ],
  stakeholders: [
    {
      id: "lena",
      name: "Lena Fischer",
      role: "International Finance Lead",
      blurb: "Signs off on the combined revenue number. Does not trust the current one.",
      knowledge: [
        "Regional teams book revenue in their local currency by policy.",
        "Treasury publishes an official rate every business day; quarter reporting uses the last business day's rate.",
      ],
      withholds: ["Will not compute the converted total."],
      responseRules: [
        {
          id: "rel_rates",
          priority: 3,
          anyKeywords: ["rate", "exchange", "convert", "which rate", "treasury", "fx"],
          reply:
            "Treasury publishes an official rate every business day. For quarter reporting we use the rate on the last business day of the quarter.",
        },
        {
          id: "rel_local",
          priority: 2,
          anyKeywords: ["local currency", "eur", "gbp", "euro", "pound", "germany", "uk", "currency"],
          reply:
            "Regional teams book revenue in their local currency. That is policy. The dashboard was supposed to handle the conversion.",
        },
      ],
      fallbackReply:
        "Each regional number looks right to its regional team. It is the combined number nobody trusts.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "What is wrong with the displayed 600 total?",
      options: [
        "Amounts in different currencies were summed without conversion",
        "The UK number was double counted",
        "Germany's revenue is missing from the table",
        "The dashboard rounds each region down",
      ],
      points: 30,
      answer: ["Amounts in different currencies were summed without conversion"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "The table mixes USD, EUR and GBP. Adding 300 + 200 + 100 treats a euro and a pound as a dollar, which understates the USD total.",
    },
    {
      id: "corrected_total",
      kind: "number",
      prompt: "What is the corrected total in USD thousands?",
      helpText: "Enter the number only, e.g. 700",
      points: 25,
      answer: [645, 1],
      competencyKey: "analytical_correctness",
      expectedEvidence: "300 USD + (200 EUR x 1.10 = 220) + (100 GBP x 1.25 = 125) = 645 thousand USD.",
    },
    {
      id: "documentation",
      kind: "single_select",
      prompt: "What must be documented alongside the converted number?",
      options: [
        "The exchange-rate date and source",
        "The dashboard color scheme",
        "The names of the regional managers",
        "The number of rows in the table",
      ],
      points: 15,
      answer: ["The exchange-rate date and source"],
      competencyKey: "reporting_rigor",
      expectedEvidence:
        "A converted total is only reproducible if the rate date and source are stated. The treasury feed and the last-business-day date must travel with the number.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Recommend how currency should be handled in reporting from now on.",
      helpText: "Max 400 characters. Cover data, conversion and documentation.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "convert_stated_rate",
          label: "Convert at a stated rate",
          keywords: ["convert", "conversion", "stated rate", "exchange rate", "official rate"],
        },
        {
          id: "store_currency",
          label: "Store currency with every amount",
          keywords: ["currency column", "currency with every", "currency field", "store the currency", "tag the currency"],
        },
        {
          id: "single_reporting_currency",
          label: "Report in a single currency",
          keywords: ["reporting currency", "single currency", "one currency", "usd for reporting", "common currency"],
        },
        {
          id: "document_rate",
          label: "Document the rate source and date",
          keywords: ["document", "rate source", "rate date", "dated", "source and date"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Store the currency with every amount, convert everything to a single reporting currency at a stated official rate, and document the rate source and date with every combined number.",
    },
  ],
  competencies: [
    { key: "problem_diagnosis", label: "Problem diagnosis" },
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "reporting_rigor", label: "Reporting rigor" },
    { key: "recommendation_quality", label: "Recommendation quality" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Spotted that the dashboard adds three currencies as if they were one.",
    corrected_total: "Converted each region correctly and reached the 645 thousand USD total.",
    documentation: "Knew that the rate date and source must travel with the converted number.",
    recommendation: "The recommendation fixes the data model, the conversion and the documentation together.",
  },
  improvementTemplates: {
    root_cause:
      "The 600 total sums USD, EUR and GBP without conversion. The three currencies are not interchangeable.",
    corrected_total:
      "The corrected total is 645 thousand USD: 300 + (200 EUR at 1.10 = 220) + (100 GBP at 1.25 = 125).",
    documentation:
      "The exchange-rate date and source must be documented so the converted number can be reproduced and audited.",
    recommendation:
      "A stronger recommendation stores currency with every amount, converts to one reporting currency at a stated rate and documents the rate source and date.",
  },
};

// ---------------------------------------------------------------------------
// 8. BI Analyst - Fiscal Cutoff
//    Fiscal month ends on the 27th. T-3 (Jun 28) and T-4 (Jun 30) fall in
//    calendar June but fiscal July, so 2 transactions change month.
// ---------------------------------------------------------------------------
export const MICRO_BI_FISCAL_CUTOFF: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "fiscal-cutoff",
  roleKey: "bi_analyst",
  title: "Fiscal Cutoff",
  tagline: "Two monthly dashboards, two different Junes. The transactions are identical.",
  mission:
    "The sales dashboard and the finance dashboard report different totals for June even though they read the same transactions. One uses calendar months and one uses the fiscal calendar, which ends each month on the 27th. Explain the gap, quantify the affected transactions and recommend a standard.",
  companyName: "Redbrick Manufacturing",
  durationMinutes: 5,
  resources: [
    {
      id: "transactions",
      title: "transactions.csv (late June / early July)",
      kind: "table",
      content:
        "| Txn ID | Date | Amount |\n| --- | --- | ---: |\n| T-1 | Jun 24 | 900 |\n| T-2 | Jun 26 | 1200 |\n| T-3 | Jun 28 | 700 |\n| T-4 | Jun 30 | 1100 |\n| T-5 | Jul 2 | 800 |\n| T-6 | Jul 5 | 600 |",
    },
    {
      id: "calendars",
      title: "Calendar definitions",
      kind: "markdown",
      content:
        "## Calendar month (sales dashboard)\n\nJune = Jun 1 through Jun 30.\n\n## Fiscal month (finance dashboard)\n\nEach fiscal month ends on the 27th. Fiscal June ends Jun 27. Fiscal July runs Jun 28 through Jul 27.\n\n## Leadership note\n\nBoard reporting follows the fiscal calendar. Please align dashboards to what the board sees.",
    },
  ],
  stakeholders: [
    {
      id: "omar",
      name: "Omar Haddad",
      role: "FP&A Manager",
      blurb: "Reconciles the two dashboards every month by hand. Wants it to stop.",
      knowledge: [
        "The fiscal month closes on the 27th. Anything after the 27th belongs to the next fiscal month.",
        "The board reads fiscal months, and leadership asked every dashboard to match the board view.",
        "The sales dashboard predates the fiscal reporting policy.",
      ],
      withholds: ["Will not count the affected transactions."],
      responseRules: [
        {
          id: "rel_fiscal",
          priority: 3,
          anyKeywords: ["fiscal", "27", "cutoff", "month end", "boundary", "close", "calendar"],
          reply:
            "Our fiscal month closes on the 27th. Anything after the 27th belongs to the next fiscal month.",
        },
        {
          id: "rel_leadership",
          priority: 2,
          anyKeywords: ["leadership", "board", "which one", "prefer", "standard", "request", "align"],
          reply:
            "The board reads fiscal months. Leadership asked every dashboard to match what the board sees.",
        },
      ],
      fallbackReply: "Both dashboards pull the same transactions. Neither one is missing data.",
    },
  ],
  questions: [
    {
      id: "why_disagree",
      kind: "single_select",
      prompt: "Why do the two dashboards report different June totals?",
      options: [
        "They use different month boundaries",
        "The finance dashboard drops weekend transactions",
        "The sales dashboard double counts returns",
        "The two dashboards read different databases",
      ],
      points: 30,
      answer: ["They use different month boundaries"],
      competencyKey: "problem_diagnosis",
      expectedEvidence:
        "The sales dashboard uses calendar June (Jun 1-30) while the finance dashboard uses fiscal June (ending Jun 27). Transactions dated Jun 28-30 land in different months on each.",
    },
    {
      id: "movers",
      kind: "number",
      prompt: "How many transactions change month between the two definitions?",
      helpText: "Enter a whole number",
      points: 25,
      answer: [2, 0],
      competencyKey: "analytical_correctness",
      expectedEvidence:
        "T-3 (Jun 28) and T-4 (Jun 30) are in calendar June but fiscal July. 2 transactions.",
    },
    {
      id: "which_calendar",
      kind: "single_select",
      prompt: "Which calendar should the dashboards standardize on?",
      options: [
        "The fiscal calendar, because leadership requested it",
        "Calendar months, because they are simpler",
        "Whichever calendar shows higher revenue",
        "Alternate between the two each month",
      ],
      points: 15,
      answer: ["The fiscal calendar, because leadership requested it"],
      competencyKey: "business_interpretation",
      expectedEvidence:
        "The leadership note says board reporting follows the fiscal calendar and asks dashboards to align with what the board sees.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Recommend how to align monthly reporting across the company.",
      helpText: "Max 400 characters. Make the standard stick.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "document_cutoff",
          label: "Document the cutoff rule",
          keywords: ["document", "cutoff rule", "write down", "define the cutoff", "27th"],
        },
        {
          id: "one_calendar",
          label: "Apply one calendar across dashboards",
          keywords: ["one calendar", "same calendar", "single calendar", "across dashboards", "consistent"],
        },
        {
          id: "reconcile_records",
          label: "Reconcile the affected records",
          keywords: ["reconcil", "affected", "moved", "recheck", "verify the transactions"],
        },
        {
          id: "label_reports",
          label: "Label reports with the calendar used",
          keywords: ["label", "state which calendar", "note the calendar", "mark the report", "calendar used"],
        },
      ],
      competencyKey: "recommendation_quality",
      expectedEvidence:
        "Document the fiscal cutoff rule, apply the fiscal calendar across every dashboard, reconcile the transactions that move months during the switch and label each report with the calendar it uses.",
    },
  ],
  competencies: [
    { key: "problem_diagnosis", label: "Problem diagnosis" },
    { key: "analytical_correctness", label: "Analytical correctness" },
    { key: "business_interpretation", label: "Business interpretation" },
    { key: "recommendation_quality", label: "Recommendation quality" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    why_disagree: "Identified the month-boundary mismatch instead of blaming the data.",
    movers: "Counted exactly the two transactions that move between fiscal and calendar months.",
    which_calendar: "Standardized on the fiscal calendar for the right reason: leadership asked for it.",
    recommendation: "The recommendation documents the rule and makes the standard visible on every report.",
  },
  improvementTemplates: {
    why_disagree:
      "The dashboards use different month boundaries. Calendar June runs through Jun 30 while fiscal June ends Jun 27.",
    movers: "Two transactions move: T-3 (Jun 28) and T-4 (Jun 30) are in calendar June but fiscal July.",
    which_calendar:
      "The fiscal calendar is the right standard because leadership asked dashboards to match board reporting.",
    recommendation:
      "A stronger recommendation documents the cutoff rule, applies one calendar everywhere, reconciles the moved transactions and labels each report with its calendar.",
  },
};
