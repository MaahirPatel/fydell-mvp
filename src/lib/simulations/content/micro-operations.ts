/**
 * Five-minute micro simulations: Implementation Consultant, Technical
 * Support Engineer, Business Systems Analyst. Same format and rigor as the
 * spec-defined DA/BI/SE sims.
 */
import type { MicroSimContent } from "../micro-types";

// ---------------------------------------------------------------------------
// 4. Implementation Consultant: Launch Day Import
//    8 rows; 4 problem rows (2 bad dates, 1 missing manager, 1 duplicate) →
//    4 rows import cleanly today.
// ---------------------------------------------------------------------------
export const MICRO_IMPLEMENTATION_CONSULTANT: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "launch-day-import",
  roleKey: "implementation_consultant",
  title: "Launch Day Import",
  tagline: "The customer's data doesn't match the system, and the launch date won't move.",
  mission:
    "A customer goes live Monday. Their employee import file has problems, and the system rejects invalid rows silently. Decide what can launch safely, quantify the issues and tell the customer the plan.",
  companyName: "Brightpath Staffing (customer)",
  durationMinutes: 5,
  resources: [
    {
      id: "import_file",
      title: "import.csv",
      kind: "table",
      content:
        "| employee_id | name | start_date | manager_email |\n| --- | --- | --- | --- |\n| E-101 | Rosa Delgado | 2026-08-03 | m.ortiz@brightpath.com |\n| E-102 | James Wu | 08/04/2026 | m.ortiz@brightpath.com |\n| E-103 | Amara Osei | 2026-08-03 | k.boyle@brightpath.com |\n| E-104 | Dan Reyes | 2026-08-05 | k.boyle@brightpath.com |\n| E-104 | Dan Reyes | 2026-08-10 | k.boyle@brightpath.com |\n| E-105 | Lena Kovac | 07/28/2026 | m.ortiz@brightpath.com |\n| E-106 | Tom Aiello | 2026-08-03 |  |\n| E-107 | Nia Brooks | 2026-08-04 | k.boyle@brightpath.com |",
    },
    {
      id: "system_rules",
      title: "System import rules",
      kind: "markdown",
      content:
        "## Import requirements\n\n- `employee_id` must be **unique**\n- `manager_email` is **required** (drives approval routing)\n- `start_date` must be **YYYY-MM-DD**\n\n## Behavior\n\nRows that violate any rule are **silently skipped** by the importer. There is no error report unless you run a pre-import validation.",
    },
    {
      id: "timeline",
      title: "Launch timeline",
      kind: "markdown",
      content:
        "## Go-live: Monday\n\n12 new hires have contractual start dates next week. The customer has stated the launch date cannot move.",
    },
  ],
  stakeholders: [
    {
      id: "priya",
      name: "Priya Raman",
      role: "HR Director, Brightpath",
      blurb: "Owns the employee data. Under pressure to launch Monday.",
      knowledge: [
        "The duplicate E-104 is a rehire. The newer row (start 2026-08-10) is correct.",
        "Monday is contractual; a partial, safe launch is acceptable if nothing is silently lost.",
      ],
      withholds: ["Will not decide the import strategy."],
      responseRules: [
        {
          id: "rel_duplicate",
          priority: 3,
          anyKeywords: ["duplicate", "e-104", "e104", "two rows", "twice", "rehire", "which row"],
          reply:
            "Good catch. E-104 is a rehire. The newer row with the August 10 start date is the correct one.",
        },
        {
          id: "rel_launch",
          priority: 2,
          anyKeywords: ["launch", "monday", "delay", "date", "partial", "phase", "deadline"],
          reply:
            "Monday is contractual. We can't move it. A partial launch is fine as long as nothing gets silently lost and I know exactly who's missing.",
        },
        {
          id: "rel_manager",
          priority: 2,
          anyKeywords: ["manager", "tom", "e-106", "e106", "missing email", "blank"],
          reply:
            "Tom Aiello's manager just changed teams. I can get you the new manager's email by tomorrow morning.",
        },
      ],
      fallbackReply:
        "I trust your judgment on the technical side. Just tell me what will and won't be in the system on Monday.",
    },
  ],
  questions: [
    {
      id: "safe_approach",
      kind: "single_select",
      prompt: "What is the safest way to handle the import before Monday?",
      options: [
        "Import the clean rows now, fix and import the problem rows before Monday, and validate final counts",
        "Import everything as-is and fix issues after launch",
        "Delay the entire launch until the file is perfect",
        "Delete the problem rows from the file and import the rest",
      ],
      points: 30,
      answer: [
        "Import the clean rows now, fix and import the problem rows before Monday, and validate final counts",
      ],
      competencyKey: "implementation_judgment",
      expectedEvidence:
        "The importer silently skips invalid rows, so importing as-is loses people invisibly. A phased import with validation protects the launch date and the data.",
    },
    {
      id: "clean_count",
      kind: "number",
      prompt: "How many rows import cleanly today, with no changes?",
      helpText: "Count rows that pass all three rules as-is.",
      points: 20,
      answer: [4, 0.5],
      competencyKey: "data_integrity",
      expectedEvidence:
        "E-101, E-103 and E-107 are clean, plus one of the E-104 rows (the duplicate makes the pair invalid until resolved; 4 rows pass if the older E-104 is removed; strictly as-is: E-101, E-103, E-107 and E-104's first occurrence). 4 rows.",
    },
    {
      id: "blocking_issues",
      kind: "multi_select",
      prompt: "Which issues block rows from importing?",
      options: [
        "Mixed date formats (MM/DD/YYYY)",
        "Missing manager email",
        "Duplicate employee IDs",
        "Names containing spaces",
        "Too many rows in one file",
      ],
      points: 15,
      answer: ["Mixed date formats (MM/DD/YYYY)", "Missing manager email", "Duplicate employee IDs"],
      competencyKey: "data_integrity",
      expectedEvidence:
        "E-102 and E-105 have MM/DD/YYYY dates, E-106 is missing its manager email, and E-104 appears twice.",
    },
    {
      id: "customer_plan",
      kind: "text",
      prompt: "Write the plan you'd send Priya today.",
      helpText: "Max 400 characters. What launches Monday, what's being fixed, and how you'll verify nothing is lost.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "phased",
          label: "Phased import (clean rows now, fixes before Monday)",
          keywords: ["clean rows", "phase", "first", "then", "import now", "partial", "today"],
        },
        {
          id: "name_fixes",
          label: "Names the specific fixes needed",
          keywords: ["date", "manager", "duplicate", "e-104", "e-106", "format"],
        },
        {
          id: "verify_counts",
          label: "Verifies counts so nothing is silently lost",
          keywords: ["count", "verify", "validat", "confirm", "reconcil", "check", "nothing lost", "missing"],
        },
      ],
      competencyKey: "customer_communication",
      expectedEvidence:
        "Import the 4 clean rows today. Fix the 2 date formats, get Tom's manager email, and keep E-104's rehire row, then import the remaining 4 before Monday. Run pre-import validation and confirm 8 unique employees in the system, so nothing is silently dropped.",
    },
  ],
  competencies: [
    { key: "implementation_judgment", label: "Implementation judgment" },
    { key: "data_integrity", label: "Data integrity" },
    { key: "requirements_interpretation", label: "Requirements interpretation" },
    { key: "customer_communication", label: "Customer communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    safe_approach: "Chose a phased import that protects both the launch date and the data.",
    clean_count: "Correctly quantified how much of the file imports cleanly today.",
    blocking_issues: "Identified all three defect types blocking the import.",
    customer_plan: "The customer plan is concrete about what launches, what's being fixed and how it's verified.",
  },
  improvementTemplates: {
    safe_approach:
      "Because the importer silently skips invalid rows, the safe path is importing clean rows now and fixing the rest before Monday with validated counts.",
    clean_count: "4 rows import cleanly as-is; the other 4 need date fixes, a manager email, or duplicate resolution.",
    blocking_issues:
      "Three issues block rows: mixed date formats (E-102, E-105), a missing manager email (E-106), and the E-104 duplicate.",
    customer_plan:
      "A stronger plan names what imports today, lists each fix with an owner, and verifies final counts so nothing is silently lost.",
  },
};

// ---------------------------------------------------------------------------
// 5. Technical Support Engineer: The Green Status Page
//    Root cause: release R-2214 tightened SAML clock-skew from 300s to 30s.
// ---------------------------------------------------------------------------
export const MICRO_TSE: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "green-status-page",
  roleKey: "technical_support_engineer",
  title: "The Green Status Page",
  tagline: "Customers can't log in. The status page says everything is fine.",
  mission:
    "Three customers report intermittent login failures since this morning. The status page is green and the queue is growing. Triage the incident, isolate the likely cause and write a customer update you can stand behind.",
  companyName: "Skedra (your employer)",
  durationMinutes: 5,
  resources: [
    {
      id: "tickets",
      title: "Open tickets",
      kind: "table",
      content:
        "| Ticket | Customer | Time (UTC) | Report |\n| --- | --- | --- | --- |\n| T-881 | Nordwind Health | 10:02 | Staff intermittently can't log in via company SSO |\n| T-882 | Calder Logistics | 10:15 | SSO login fails about half the time, retry sometimes works |\n| T-883 | Pemble & Co | 10:21 | One user gets 'wrong password'; she recently changed it |\n| T-884 | Ostrom Manufacturing | 10:34 | Whole team locked out through corporate identity provider |",
    },
    {
      id: "auth_log",
      title: "Auth log excerpt",
      kind: "markdown",
      content:
        "```\n09:41:12 INFO  deploy complete: R-2214\n09:47:03 ERROR saml_validate account=nordwind assertion_not_yet_valid skew=41s\n09:52:44 INFO  login ok method=password account=pemble\n09:58:19 ERROR saml_validate account=calder assertion_expired skew=67s\n10:03:55 ERROR saml_validate account=nordwind assertion_not_yet_valid skew=38s\n10:11:30 INFO  login ok method=password account=ostrom-admin\n10:19:02 ERROR saml_validate account=ostrom assertion_expired skew=52s\n10:26:47 ERROR password_mismatch account=pemble user=j.harmon\n```",
    },
    {
      id: "release_notes",
      title: "Release timeline",
      kind: "markdown",
      content:
        "## Recent releases\n\n| Release | Deployed (UTC) | Notes |\n| --- | --- | --- |\n| R-2212 | Tuesday | Dashboard performance improvements |\n| R-2213 | Wednesday | New report export formats |\n| R-2214 | **Today 09:41** | Auth hardening: tightened SAML assertion time validation from 300s to 30s |\n\n## Status page\n\nStatus checks log in with a **password test account** every 60 seconds. They do not use SSO.",
    },
  ],
  stakeholders: [
    {
      id: "sam",
      name: "Sam Okafor",
      role: "On-call Platform Engineer",
      blurb: "Can confirm what changed in the release. Busy mid-incident.",
      knowledge: [
        "R-2214 tightened the SAML clock-skew window from 300 seconds to 30 seconds.",
        "Only SSO customers whose identity providers drift more than 30s are affected; a config revert takes ~10 minutes.",
      ],
      withholds: ["Won't volunteer the diagnosis unless asked about the release or SAML."],
      responseRules: [
        {
          id: "rel_release",
          priority: 3,
          anyKeywords: ["r-2214", "r2214", "release", "deploy", "saml", "clock", "skew", "assertion", "what changed"],
          reply:
            "R-2214 tightened the SAML assertion clock-skew window from 300 seconds to 30. Any identity provider drifting more than 30s will fail validation intermittently. I can revert the config flag in about 10 minutes if you call it.",
        },
        {
          id: "rel_scope",
          priority: 2,
          anyKeywords: ["affected", "scope", "who", "which customers", "password", "how many"],
          reply:
            "Password logins are untouched. That's why the status page is green; its checks use a password test account. Only SSO customers with drifting identity providers are hitting it.",
        },
      ],
      fallbackReply:
        "I'm heads-down on the incident bridge. Ask me something specific about the release or the auth path and I'll answer fast.",
    },
  ],
  questions: [
    {
      id: "likely_cause",
      kind: "single_select",
      prompt: "What is the most likely cause?",
      options: [
        "Release R-2214 tightened SAML time validation, breaking identity providers with clock drift",
        "The password database is failing intermittently",
        "The status page monitoring is broken",
        "Customers' networks are blocking the login page",
      ],
      points: 30,
      answer: [
        "Release R-2214 tightened SAML time validation, breaking identity providers with clock drift",
      ],
      competencyKey: "technical_diagnosis",
      expectedEvidence:
        "Every failure in the log is a saml_validate error with skew above 30s, all after the 09:41 R-2214 deploy that tightened the window from 300s to 30s.",
    },
    {
      id: "incident_tickets",
      kind: "multi_select",
      prompt: "Which tickets are part of this incident?",
      options: ["T-881 Nordwind Health", "T-882 Calder Logistics", "T-883 Pemble & Co", "T-884 Ostrom Manufacturing"],
      points: 15,
      answer: ["T-881 Nordwind Health", "T-882 Calder Logistics", "T-884 Ostrom Manufacturing"],
      competencyKey: "triage",
      expectedEvidence:
        "T-881, T-882 and T-884 are SSO/SAML failures. T-883 is a password mismatch for one user who recently changed her password, which is unrelated.",
    },
    {
      id: "immediate_action",
      kind: "single_select",
      prompt: "What is the right immediate action?",
      options: [
        "Escalate to engineering with the log evidence and request the R-2214 skew-tolerance revert",
        "Tell all affected users to reset their passwords",
        "Wait for more tickets to confirm the pattern",
        "Mark the tickets resolved since retries sometimes work",
      ],
      points: 20,
      answer: [
        "Escalate to engineering with the log evidence and request the R-2214 skew-tolerance revert",
      ],
      competencyKey: "escalation_judgment",
      expectedEvidence:
        "The evidence is sufficient to escalate now, and the platform engineer can revert the config in ~10 minutes. Password resets won't fix SAML validation.",
    },
    {
      id: "customer_update",
      kind: "text",
      prompt: "Write the customer status update.",
      helpText: "Max 400 characters. Honest about scope and next steps. No promises you can't keep.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "acknowledge_scope",
          label: "Acknowledges the issue and states the SSO-only scope",
          keywords: ["sso", "single sign", "saml", "identity provider", "some customers", "login"],
        },
        {
          id: "no_overpromise",
          label: "Commits to a next update, not a guaranteed fix time",
          keywords: ["update", "within", "next", "working on", "identified", "investigating", "shortly"],
        },
        {
          id: "workaround",
          label: "Offers the password-login workaround where available",
          keywords: ["password", "workaround", "alternative", "in the meantime"],
        },
      ],
      competencyKey: "customer_communication",
      expectedEvidence:
        "We've identified an issue affecting SSO logins for some customers following this morning's release; password logins are unaffected. Engineering is deploying a fix now. If your account supports password login, that works in the meantime. Next update within 30 minutes.",
    },
  ],
  competencies: [
    { key: "triage", label: "Triage" },
    { key: "technical_diagnosis", label: "Technical diagnosis" },
    { key: "escalation_judgment", label: "Escalation judgment" },
    { key: "customer_communication", label: "Customer communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    likely_cause: "Correlated the log errors with the release timeline to isolate the real cause.",
    incident_tickets: "Separated the incident tickets from the unrelated password issue.",
    immediate_action: "Escalated with evidence instead of waiting or applying the wrong fix.",
    customer_update: "The customer update is honest about scope and avoids promises that can't be kept.",
  },
  improvementTemplates: {
    likely_cause:
      "The log shows SAML validation errors with 38–67s skew starting right after R-2214 tightened the window to 30s. That's the cause.",
    incident_tickets:
      "T-881, T-882 and T-884 are SSO failures; T-883 is a single-user password mismatch and not part of the incident.",
    immediate_action:
      "With log evidence in hand, the right move is escalating to engineering and requesting the skew-tolerance revert, a ~10 minute fix.",
    customer_update:
      "A stronger update states the SSO-only scope, offers the password workaround, and commits to a next-update time instead of a fix time.",
  },
};

// ---------------------------------------------------------------------------
// 6. Business Systems Analyst: The Executive Queue
//    Rule R0 + unmigrated vendor statuses → 4 of 6 sample POs wrongly routed.
// ---------------------------------------------------------------------------
export const MICRO_BSA: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "executive-queue",
  roleKey: "business_systems_analyst",
  title: "The Executive Queue",
  tagline: "Routine $80 purchases are landing on the CFO's desk. The system isn't broken.",
  mission:
    "Since a policy update, ordinary purchases are routing to executives for approval and teams have started bypassing the system. Find the rule interaction causing it, quantify the impact and recommend a fix that survives compliance review.",
  companyName: "Ridgeline Manufacturing",
  durationMinutes: 5,
  resources: [
    {
      id: "rules",
      title: "Approval rules (evaluated top-down)",
      kind: "table",
      content:
        "| Rule | Condition | Routes to |\n| --- | --- | --- |\n| R0 (new) | vendor_status ≠ 'approved' | Executive |\n| R1 | amount < $500 | Auto-approve |\n| R2 | $500 – $5,000 | Manager |\n| R3 | > $5,000 | Director |",
    },
    {
      id: "purchases",
      title: "Recent purchase orders",
      kind: "table",
      content:
        "| PO | Vendor | vendor_status | Amount | Routed to |\n| --- | --- | --- | ---: | --- |\n| PO-501 | Apex Supply | pending_verification | $80 | Executive |\n| PO-502 | Corewood | approved | $340 | Auto-approved |\n| PO-503 | Apex Supply | pending_verification | $1,200 | Executive |\n| PO-504 | Danner Tools | pending_verification | $95 | Executive |\n| PO-505 | Veritas Labs | approved | $7,800 | Director |\n| PO-506 | Mistral Parts | pending_verification | $2,300 | Executive |",
    },
    {
      id: "systems_note",
      title: "Systems note",
      kind: "markdown",
      content:
        "## Vendor master migration\n\nLast month's vendor migration created records with `vendor_status = 'pending_verification'`. Status changes to `'approved'` only **after a vendor's first completed purchase order** in the new system.\n\n## Policy update\n\nThe new policy requires executive review for purchases from **new vendors**. It was implemented as rule R0, evaluated before all other rules.",
    },
  ],
  stakeholders: [
    {
      id: "farah",
      name: "Farah Idris",
      role: "Compliance Officer",
      blurb: "Wrote the new-vendor policy. Guards the audit trail.",
      knowledge: [
        "The policy intent was genuinely new vendor relationships, not migrated vendors awaiting their first PO.",
        "Any fix must preserve the audit trail; blanket auto-approval is unacceptable.",
      ],
      withholds: ["Will not design the system fix."],
      responseRules: [
        {
          id: "rel_intent",
          priority: 3,
          anyKeywords: ["intent", "policy mean", "new vendor", "meant", "purpose", "why the rule", "definition"],
          reply:
            "The policy meant genuinely new vendor relationships: companies we've never bought from. Vendors that came over in the migration are not new; they're just waiting on a status backfill.",
        },
        {
          id: "rel_audit",
          priority: 2,
          anyKeywords: ["audit", "compliance", "bypass", "auto-approve", "auto approve", "p-card", "constraint"],
          reply:
            "Whatever you propose must keep the audit trail intact. Teams bypassing with p-cards is exactly what the auditors flagged last year, so blanket auto-approval is off the table.",
        },
      ],
      fallbackReply:
        "My concern is compliance, not system mechanics. If you can show the fix preserves review for genuinely new vendors, I'll support it.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why are ordinary purchases routing to executives?",
      options: [
        "Rule R0 fires first, and migrated vendors still have vendor_status 'pending_verification'",
        "The purchase amounts are being read incorrectly",
        "Executives added themselves to every approval chain",
        "The policy explicitly requires executive review for all purchases",
      ],
      points: 30,
      answer: [
        "Rule R0 fires first, and migrated vendors still have vendor_status 'pending_verification'",
      ],
      competencyKey: "root_cause_analysis",
      expectedEvidence:
        "R0 is evaluated before the amount rules, and the migration left vendors as 'pending_verification' until their first completed PO, so routine re-orders match R0 and route to executives.",
    },
    {
      id: "impacted_count",
      kind: "number",
      prompt: "How many of the 6 sample POs under $5,000 were wrongly routed to an executive?",
      points: 20,
      answer: [4, 0.5],
      competencyKey: "process_analysis",
      expectedEvidence:
        "PO-501 ($80), PO-503 ($1,200), PO-504 ($95) and PO-506 ($2,300), all under $5,000 from migrated vendors, were routed to executives.",
    },
    {
      id: "best_fix",
      kind: "single_select",
      prompt: "Which fix best matches the policy intent?",
      options: [
        "Backfill 'approved' status for migrated vendors and define 'new vendor' precisely in R0",
        "Delete rule R0 entirely",
        "Auto-approve everything under $5,000 regardless of vendor",
        "Raise the executive threshold to $50,000",
      ],
      points: 15,
      answer: [
        "Backfill 'approved' status for migrated vendors and define 'new vendor' precisely in R0",
      ],
      competencyKey: "systems_judgment",
      expectedEvidence:
        "The system is doing what R0 says; the data and the definition are what's wrong. Backfilling migrated vendors and tightening the R0 definition preserves review for genuinely new vendors.",
    },
    {
      id: "stakeholder_summary",
      kind: "text",
      prompt: "Summarize the situation and your recommendation for the stakeholders.",
      helpText: "Max 400 characters. Separate what the system is doing from what the policy intended.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "system_vs_policy",
          label: "Separates system behavior from policy intent",
          keywords: ["as configured", "working as", "rule says", "intent", "policy meant", "not a bug", "doing exactly"],
        },
        {
          id: "quantify",
          label: "Quantifies the impact",
          keywords: ["4", "four", "two thirds", "most", "of the 6", "routine purchases"],
        },
        {
          id: "fix_with_audit",
          label: "Proposes the fix while preserving compliance review",
          keywords: ["backfill", "definition", "genuinely new", "audit", "preserve", "still review", "keep executive review"],
        },
      ],
      competencyKey: "stakeholder_summary",
      expectedEvidence:
        "The system is doing exactly what R0 says. The migration left most vendors 'pending_verification', so routine re-orders route to executives (4 of 6 recent POs). Recommend backfilling migrated vendor statuses and defining 'new vendor' precisely, keeping executive review for genuinely new relationships and the full audit trail.",
    },
  ],
  competencies: [
    { key: "root_cause_analysis", label: "Root-cause analysis" },
    { key: "process_analysis", label: "Process analysis" },
    { key: "systems_judgment", label: "Systems judgment" },
    { key: "stakeholder_summary", label: "Stakeholder summary" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Traced the routing problem to the rule order and the unmigrated vendor statuses, not a system bug.",
    impacted_count: "Quantified the impact precisely from the purchase records.",
    best_fix: "Chose a fix that matches policy intent while preserving review for genuinely new vendors.",
    stakeholder_summary: "The summary cleanly separates system behavior from policy intent.",
  },
  improvementTemplates: {
    root_cause:
      "The cause is rule interaction: R0 fires before the amount rules, and migrated vendors still carry 'pending_verification' status.",
    impacted_count: "4 of the 6 sample POs (PO-501, PO-503, PO-504, PO-506) were under $5,000 and wrongly routed to executives.",
    best_fix:
      "The fix matching policy intent is backfilling migrated vendor statuses and precisely defining 'new vendor' in R0. Deleting R0 or blanket auto-approval would fail compliance.",
    stakeholder_summary:
      "A stronger summary states the system is working as configured, quantifies the impact, and proposes the backfill + definition fix while keeping the audit trail.",
  },
};
