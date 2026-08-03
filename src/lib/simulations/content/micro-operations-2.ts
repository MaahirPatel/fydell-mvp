/**
 * Five-minute micro simulations, batch 2. Four for Technical Support
 * Engineer and four for Business Systems Analyst. Same format and rigor
 * as the sims in micro-operations.ts.
 */
import type { MicroSimContent } from "../micro-types";

// ---------------------------------------------------------------------------
// TSE 1. The API Timeout
//    Root cause: VerifyPoint, a third-party address verifier, went from
//    ~200ms to ~9s at 14:00. Timeouts start 14:02. Internal p95 unchanged.
// ---------------------------------------------------------------------------
export const MICRO_TSE_API_TIMEOUT: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "api-timeout",
  roleKey: "technical_support_engineer",
  title: "The API Timeout",
  tagline: "Requests are timing out, and the slow part is not yours.",
  mission:
    "Three customers report timeouts this afternoon. Find what changed at 14:00, pick the safest mitigation, and write an escalation engineering can act on. You have the latency log, a dependency note, and the open tickets.",
  companyName: "Corvela (your employer)",
  durationMinutes: 5,
  resources: [
    {
      id: "latency_log",
      title: "Latency log",
      kind: "markdown",
      content:
        "```\n13:00 p95 api_core=118ms addr_verify=210ms\n13:30 p95 api_core=121ms addr_verify=195ms\n14:00 p95 api_core=119ms addr_verify=9200ms\n14:02 ERROR timeout endpoint=/orders/new waiting_on=addr_verify elapsed=10s\n14:07 ERROR timeout endpoint=/accounts/update waiting_on=addr_verify elapsed=10s\n14:30 p95 api_core=122ms addr_verify=8800ms\n15:00 p95 api_core=120ms addr_verify=9100ms\n```",
    },
    {
      id: "dependency_note",
      title: "Service dependency note",
      kind: "markdown",
      content:
        "## What these services are\n\n- `api_core` is our internal API service.\n- `addr_verify` calls **VerifyPoint**, a third-party address verification service.\n\nThe endpoints `/orders/new` and `/accounts/update` call `addr_verify` before they respond. The call waits up to 10 seconds. There were no deployments today.",
    },
    {
      id: "tickets",
      title: "Open tickets",
      kind: "table",
      content:
        "| Ticket | Customer | Time | Report |\n| --- | --- | --- | --- |\n| T-301 | Bramley Home Goods | 14:05 | Checkout hangs and then fails when we enter a shipping address |\n| T-302 | Quill and Post | 14:12 | Saving a customer address times out |\n| T-303 | Fenmore Outfitters | 14:20 | Address lookup spins for 10 seconds and then errors |",
    },
  ],
  stakeholders: [
    {
      id: "dana",
      name: "Dana Whitfield",
      role: "On-call Platform Engineer",
      blurb: "Knows the service map and the timeout config. Watching alerts.",
      knowledge: [
        "Nothing deployed today; api_core latency has been flat all day.",
        "addr_verify is a thin wrapper around VerifyPoint, a third-party service; the call waits 10 seconds with no fallback.",
      ],
      withholds: ["Will not write the escalation for you."],
      responseRules: [
        {
          id: "rel_dependency",
          priority: 3,
          anyKeywords: ["verifypoint", "addr_verify", "address", "third party", "third-party", "vendor", "dependency"],
          reply:
            "addr_verify is a thin wrapper around VerifyPoint, a third-party service. Their latency is theirs, not ours. We have a support contact for them if you want me to open a ticket.",
        },
        {
          id: "rel_deploy",
          priority: 2,
          anyKeywords: ["deploy", "release", "what changed", "internal", "our side", "ship"],
          reply:
            "Nothing shipped today. api_core has been quiet and its latency looks normal to me all day.",
        },
        {
          id: "rel_timeout",
          priority: 2,
          anyKeywords: ["timeout", "retry", "fallback", "config", "fail fast"],
          reply:
            "The addr_verify call currently waits up to 10 seconds with no fallback. I can add a shorter timeout and a retry path quickly if you make the case.",
        },
      ],
      fallbackReply:
        "I am juggling a few alerts right now. Ask me something specific about the services or the timeline and I will answer fast.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "What is the root cause of the timeouts?",
      options: [
        "VerifyPoint, the third-party address verification service, became slow and requests wait on it until they time out",
        "Our internal api_core service is having an outage",
        "A deployment this afternoon broke the checkout endpoints",
        "Customers are entering invalid addresses",
      ],
      points: 30,
      answer: [
        "VerifyPoint, the third-party address verification service, became slow and requests wait on it until they time out",
      ],
      competencyKey: "technical_diagnosis",
      expectedEvidence:
        "addr_verify p95 jumped from about 200ms to 9200ms at 14:00 while api_core stayed near 120ms. The timeouts start at 14:02 and every failing request is waiting on addr_verify.",
    },
    {
      id: "supporting_evidence",
      kind: "multi_select",
      prompt: "Which observations support that root cause?",
      options: [
        "addr_verify p95 jumped from about 200ms to 9200ms at 14:00",
        "The timeouts started at 14:02, right after the jump",
        "api_core p95 stayed near 120ms all day",
        "The tickets came from three different customers",
        "The errors happen on more than one endpoint",
      ],
      points: 20,
      answer: [
        "addr_verify p95 jumped from about 200ms to 9200ms at 14:00",
        "The timeouts started at 14:02, right after the jump",
        "api_core p95 stayed near 120ms all day",
      ],
      competencyKey: "evidence_analysis",
      expectedEvidence:
        "The latency jump at 14:00, the timeouts beginning at 14:02, and the unchanged internal p95 together point at the dependency. Ticket count and endpoint spread do not separate internal from external causes.",
    },
    {
      id: "safest_mitigation",
      kind: "single_select",
      prompt: "What is the safest mitigation right now?",
      options: [
        "Add a timeout on the addr_verify call with a graceful fallback and retry, and notify VerifyPoint",
        "Restart api_core in every region",
        "Disable address entry until VerifyPoint recovers",
        "Ask customers to keep retrying until it works",
      ],
      points: 15,
      answer: [
        "Add a timeout on the addr_verify call with a graceful fallback and retry, and notify VerifyPoint",
      ],
      competencyKey: "mitigation_judgment",
      expectedEvidence:
        "api_core is healthy, so restarting it does nothing. Failing fast with a fallback keeps orders flowing while the vendor is notified. Disabling address entry blocks every customer instead of degrading gracefully.",
    },
    {
      id: "escalation_message",
      kind: "text",
      prompt: "Write the escalation message to engineering.",
      helpText:
        "Max 400 characters. State the evidence, name the dependency, and say what you want done.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "timestamps",
          label: "States the correlation with timestamps",
          keywords: ["14:00", "14:02", "right after", "timeline", "correlat"],
        },
        {
          id: "name_dependency",
          label: "Names the third-party dependency",
          keywords: ["verifypoint", "addr_verify", "third party", "third-party", "address verification", "vendor"],
        },
        {
          id: "not_internal",
          label: "Distinguishes this from an internal outage",
          keywords: ["api_core", "internal", "not an outage", "unchanged", "120ms", "healthy"],
        },
        {
          id: "propose_handling",
          label: "Proposes timeout and retry handling",
          keywords: ["timeout", "retry", "fallback", "fail fast", "shorter"],
        },
      ],
      competencyKey: "escalation_communication",
      expectedEvidence:
        "VerifyPoint latency jumped from 200ms to 9s at 14:00 and our timeouts started at 14:02. api_core is healthy at 120ms, so this is the addr_verify dependency, not an internal outage. Requesting a shorter timeout with fallback and retry on that call, and I am notifying the vendor.",
    },
  ],
  competencies: [
    { key: "technical_diagnosis", label: "Technical diagnosis" },
    { key: "evidence_analysis", label: "Evidence analysis" },
    { key: "mitigation_judgment", label: "Mitigation judgment" },
    { key: "escalation_communication", label: "Escalation communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Traced the timeouts to the third-party verifier instead of assuming an internal outage.",
    supporting_evidence: "Picked the three observations that actually separate external from internal causes.",
    safest_mitigation: "Chose a mitigation that degrades gracefully instead of blocking customers or restarting healthy services.",
    escalation_message: "The escalation names the dependency, anchors the timeline, and asks for a specific change.",
  },
  improvementTemplates: {
    root_cause:
      "The verifier's p95 jumped from 200ms to 9200ms at 14:00 and timeouts began at 14:02 while api_core stayed at 120ms. That points at VerifyPoint, not an internal outage.",
    supporting_evidence:
      "The strongest evidence is the verifier latency jump at 14:00, the timeouts starting at 14:02, and the unchanged internal p95. Ticket counts alone do not isolate the cause.",
    safest_mitigation:
      "The safe move is a shorter timeout on the addr_verify call with a graceful fallback and retry, plus notifying VerifyPoint. Restarting api_core does nothing because it is healthy.",
    escalation_message:
      "A stronger escalation states the 14:00 to 14:02 correlation, names VerifyPoint, rules out an internal outage, and requests timeout and retry handling.",
  },
};

// ---------------------------------------------------------------------------
// TSE 2. The Permission Failure
//    Tuesday's template change removed view_reports from the Analyst role.
//    3 of 4 tickets are explained by it; 1 is an unrelated password issue.
// ---------------------------------------------------------------------------
export const MICRO_TSE_PERMISSION_FAILURE: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "permission-failure",
  roleKey: "technical_support_engineer",
  title: "The Permission Failure",
  tagline: "Three users lost their reports overnight, and one change explains it.",
  mission:
    "Four tickets landed this morning and three of them mention reports. A role template changed on Tuesday. Work out what the change did, quantify which tickets it explains, and write the customer update.",
  companyName: "Fernbrook Software (your employer)",
  durationMinutes: 5,
  resources: [
    {
      id: "role_diff",
      title: "Role template change",
      kind: "markdown",
      content:
        "## Change applied Tuesday 09:00\n\nRole: **Analyst**\n\n| | Permissions |\n| --- | --- |\n| Before | view_reports, export_data |\n| After | export_data |\n\nThe permission `view_reports` was removed from the Analyst role. No other roles were changed.",
    },
    {
      id: "tickets",
      title: "Open tickets",
      kind: "table",
      content:
        "| Ticket | User | Role | Report |\n| --- | --- | --- | --- |\n| T-410 | Priya Shah | Analyst | Reports tab says access denied |\n| T-411 | Colin Marsh | Analyst | All my saved reports disappeared this morning |\n| T-412 | Ella Burke | Analyst | Cannot open the weekly sales report |\n| T-413 | Sam Trent | Manager | Forgot my password, need a reset |",
    },
  ],
  stakeholders: [
    {
      id: "marcus",
      name: "Marcus Lee",
      role: "IT Administrator",
      blurb: "Made the Tuesday template change. Slightly embarrassed.",
      knowledge: [
        "He meant to remove view_reports from the Contractor role and applied the change to Analyst by mistake.",
        "Only the Analyst role changed; restoring the permission takes a few minutes.",
      ],
      withholds: ["Will not decide the customer messaging."],
      responseRules: [
        {
          id: "rel_change",
          priority: 3,
          anyKeywords: ["template", "tuesday", "view_reports", "removed", "why", "diff", "who changed"],
          reply:
            "That change was mine. I meant to remove view_reports from the Contractor role and applied it to Analyst by mistake. I can put it back in a few minutes.",
        },
        {
          id: "rel_scope",
          priority: 2,
          anyKeywords: ["analyst", "affected", "which users", "other roles", "scope", "manager"],
          reply:
            "Only the Analyst role changed. Managers and Contractors are untouched, so anything outside Analyst is a different issue.",
        },
      ],
      fallbackReply:
        "Tell me which role or permission you are looking at and I can check the change history for you.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why did these users lose report access?",
      options: [
        "Tuesday's template change removed view_reports from the Analyst role",
        "The reports service is down",
        "The users' accounts were deactivated",
        "A password policy change locked users out",
      ],
      points: 30,
      answer: ["Tuesday's template change removed view_reports from the Analyst role"],
      competencyKey: "access_diagnosis",
      expectedEvidence:
        "The diff shows view_reports was removed from the Analyst role on Tuesday, and the three report tickets all come from Analyst-role users.",
    },
    {
      id: "explained_count",
      kind: "number",
      prompt: "How many of the 4 tickets does the template change explain?",
      helpText: "Count tickets caused by the removed permission.",
      points: 20,
      answer: [3, 0],
      competencyKey: "impact_quantification",
      expectedEvidence:
        "T-410, T-411 and T-412 are Analyst-role users blocked from reports. T-413 is a Manager's password reset and is unrelated. 3 tickets.",
    },
    {
      id: "right_fix",
      kind: "single_select",
      prompt: "What is the right fix?",
      options: [
        "Restore view_reports to the Analyst role only",
        "Give the affected users admin access so they are never blocked again",
        "Recreate the affected user accounts",
        "Roll back every role template to last month's version",
      ],
      points: 15,
      answer: ["Restore view_reports to the Analyst role only"],
      competencyKey: "remediation_judgment",
      expectedEvidence:
        "The change removed one permission from one role, so the fix restores exactly that. Admin access grants far more than the users had before, and a full rollback risks undoing unrelated changes.",
    },
    {
      id: "customer_update",
      kind: "text",
      prompt: "Write the update you would send the affected users.",
      helpText:
        "Max 400 characters. Own the cause, say exactly what is being restored, and when access returns.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "own_cause",
          label: "Acknowledges the cause plainly",
          keywords: ["role change", "template", "our change", "permission was removed", "on our side", "we removed"],
        },
        {
          id: "specific_permission",
          label: "States the specific permission being restored",
          keywords: ["view_reports", "report permission", "view reports"],
        },
        {
          id: "scoped_fix",
          label: "Avoids granting broad admin access",
          keywords: ["analyst role", "only", "scoped", "not admin", "without admin", "exactly what"],
        },
        {
          id: "when_restored",
          label: "Confirms when access returns",
          keywords: ["restored", "within", "shortly", "today", "back", "few minutes"],
        },
      ],
      competencyKey: "customer_communication",
      expectedEvidence:
        "A role template change on our side removed the view_reports permission from the Analyst role. We are restoring that permission to the Analyst role only, nothing broader. Your report access will be back within the hour, and we will confirm once it is live.",
    },
  ],
  competencies: [
    { key: "access_diagnosis", label: "Access diagnosis" },
    { key: "impact_quantification", label: "Impact quantification" },
    { key: "remediation_judgment", label: "Remediation judgment" },
    { key: "customer_communication", label: "Customer communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Connected the report tickets to the role template diff instead of chasing a service outage.",
    explained_count: "Correctly separated the tickets the change explains from the unrelated one.",
    right_fix: "Chose the narrow fix that restores exactly what was lost, without over-granting.",
    customer_update: "The update owns the cause, names the specific permission, and commits to a restore time.",
  },
  improvementTemplates: {
    root_cause:
      "The diff shows view_reports was removed from the Analyst role on Tuesday. All three report tickets come from Analyst users, which points at that change.",
    explained_count:
      "The change explains 3 tickets: T-410, T-411 and T-412 from Analyst users. T-413 is a password reset and is unrelated.",
    right_fix:
      "The right fix is restoring view_reports to the Analyst role only. Admin access over-grants, and a template rollback risks undoing unrelated changes.",
    customer_update:
      "A stronger update acknowledges the role change plainly, names view_reports as the permission being restored, keeps the fix scoped, and gives a restore time.",
  },
};

// ---------------------------------------------------------------------------
// TSE 3. Duplicate Webhooks
//    evt_581 delivered 3 times after two 503s. The receiver processes each
//    delivery because it never checks event ids.
// ---------------------------------------------------------------------------
export const MICRO_TSE_DUPLICATE_WEBHOOKS: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "duplicate-webhooks",
  roleKey: "technical_support_engineer",
  title: "Duplicate Webhooks",
  tagline: "The same order keeps arriving, and nobody is checking the event id.",
  mission:
    "A customer says one order appears three times in their warehouse system. The delivery log shows what our platform sent and when. Explain what happened, quantify it, and recommend a fix that makes retries safe.",
  companyName: "Cartwheel Commerce (your employer)",
  durationMinutes: 5,
  resources: [
    {
      id: "delivery_log",
      title: "Webhook delivery log",
      kind: "markdown",
      content:
        "```\n15:04:10 deliver event=evt_581 type=order.created attempt=1 response=503\n15:06:10 deliver event=evt_581 type=order.created attempt=2 response=503\n15:10:10 deliver event=evt_581 type=order.created attempt=3 response=200\n15:12:44 deliver event=evt_582 type=order.created attempt=1 response=200\n```\n\n**Retry policy:** any non-2xx response is retried with backoff, up to 4 attempts. Every attempt carries the same event id.",
    },
    {
      id: "customer_report",
      title: "Customer report",
      kind: "markdown",
      content:
        "From Renee Park, developer at Ostwald Retail:\n\n\"Order 4417 shows up three times in our warehouse system. Our endpoint was slow during a database migration between 15:00 and 15:09. It saved each order before returning an error. We do not check event ids today.\"",
    },
  ],
  stakeholders: [
    {
      id: "renee",
      name: "Renee Park",
      role: "Developer, Ostwald Retail (customer)",
      blurb: "Built the receiving endpoint. Wants the duplicates gone.",
      knowledge: [
        "Their endpoint saved each order before timing out and returning a 503 during the migration.",
        "They store the event id from the payload but never check whether they have already processed it.",
      ],
      withholds: ["Does not know how the platform's retry policy works."],
      responseRules: [
        {
          id: "rel_endpoint",
          priority: 3,
          anyKeywords: ["503", "error", "fail", "endpoint", "migration", "slow", "timed out"],
          reply:
            "Our endpoint was mid-migration between 15:00 and 15:09. It saved each order first, then timed out and returned a 503. So the order got created even when we sent you an error.",
        },
        {
          id: "rel_dedup",
          priority: 2,
          anyKeywords: ["event id", "duplicate", "dedup", "idempot", "same event", "already processed"],
          reply:
            "We store the event id from the payload but we never check whether we have seen it before. If that is the fix, it is a small change on our side.",
        },
        {
          id: "rel_scope",
          priority: 2,
          anyKeywords: ["how many", "other orders", "other events", "just this", "evt_582", "scope"],
          reply:
            "Order 4417 is the only one we have seen tripled. Everything after 15:10 looks normal on our side.",
        },
      ],
      fallbackReply:
        "Happy to check anything in our system. What exactly do you want me to look up?",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why does the customer see the same order three times?",
      options: [
        "Failed deliveries were retried, and the endpoint processed the same event again on each attempt",
        "The platform generated three separate order events for one order",
        "The warehouse system invented duplicate orders on its own",
        "The webhook payload was corrupted in transit",
      ],
      points: 30,
      answer: [
        "Failed deliveries were retried, and the endpoint processed the same event again on each attempt",
      ],
      competencyKey: "integration_diagnosis",
      expectedEvidence:
        "The log shows one event, evt_581, delivered three times after two 503 responses triggered retries. The endpoint saved the order on every attempt because it never checks event ids.",
    },
    {
      id: "delivery_count",
      kind: "number",
      prompt: "How many times was evt_581 delivered in total?",
      points: 20,
      answer: [3, 0],
      competencyKey: "log_analysis",
      expectedEvidence:
        "The log shows attempts 1, 2 and 3 for evt_581, at 15:04, 15:06 and 15:10. 3 deliveries.",
    },
    {
      id: "durable_fix",
      kind: "single_select",
      prompt: "What is the durable fix?",
      options: [
        "The receiver deduplicates incoming events by event id, so retries become safe",
        "Turn off retries for this customer",
        "Slow down all webhook deliveries platform-wide",
        "Ask the customer to avoid database migrations during business hours",
      ],
      points: 15,
      answer: ["The receiver deduplicates incoming events by event id, so retries become safe"],
      competencyKey: "durable_fix_judgment",
      expectedEvidence:
        "Every attempt carries the same event id, so checking it before processing makes retries harmless. Turning off retries trades duplicates for lost events.",
    },
    {
      id: "customer_reply",
      kind: "text",
      prompt: "Write your reply to Renee.",
      helpText:
        "Max 400 characters. Explain the behavior, recommend the fix, and help her clean up.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "retries_expected",
          label: "Explains that retries are expected on failures",
          keywords: ["retry", "retries", "non-2xx", "by design", "expected", "error response"],
        },
        {
          id: "dedup_by_id",
          label: "Recommends deduplication by event id",
          keywords: ["event id", "dedup", "idempot", "same id", "already processed", "evt_581"],
        },
        {
          id: "offer_log",
          label: "Offers the delivery log",
          keywords: ["delivery log", "log", "attempts", "timestamps", "share the"],
        },
        {
          id: "safe_cleanup",
          label: "Describes safe cleanup of the duplicates",
          keywords: ["clean", "remove the duplicate", "delete the extra", "keep one", "reconcile"],
        },
      ],
      competencyKey: "customer_communication",
      expectedEvidence:
        "Your endpoint returned 503 twice, and we retry any non-2xx response, so evt_581 was delivered three times with the same event id. Checking the event id before processing makes retries safe. I have attached the delivery log with all three attempts. For cleanup, keep the first order 4417 record and remove the two duplicates.",
    },
  ],
  competencies: [
    { key: "integration_diagnosis", label: "Integration diagnosis" },
    { key: "log_analysis", label: "Log analysis" },
    { key: "durable_fix_judgment", label: "Durable fix judgment" },
    { key: "customer_communication", label: "Customer communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Explained the duplicates as retry redelivery plus a receiver that never checks event ids.",
    delivery_count: "Read the delivery count straight from the log.",
    durable_fix: "Recommended idempotent processing instead of weakening the retry system.",
    customer_reply: "The reply explains the behavior, gives the customer a concrete fix, and helps with cleanup.",
  },
  improvementTemplates: {
    root_cause:
      "The log shows evt_581 delivered three times after two 503s triggered retries. The endpoint saved the order each time because it never checks event ids.",
    delivery_count: "evt_581 was delivered 3 times: attempts at 15:04, 15:06 and 15:10.",
    durable_fix:
      "The durable fix is deduplication by event id on the receiver. Turning off retries would trade duplicates for silently lost events.",
    customer_reply:
      "A stronger reply explains that retries on failures are expected, recommends dedup by event id, offers the delivery log, and describes how to remove the duplicates safely.",
  },
};

// ---------------------------------------------------------------------------
// TSE 4. One Customer or Everyone
//    Platform is healthy. The customer's IP allowlist was edited yesterday
//    and their office moved networks this week.
// ---------------------------------------------------------------------------
export const MICRO_TSE_ONE_CUSTOMER: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "one-customer-or-everyone",
  roleKey: "technical_support_engineer",
  title: "One Customer or Everyone",
  tagline: "One customer is down, every dashboard is green, and both are telling the truth.",
  mission:
    "Kestrel Freight says nobody at their office can reach the platform since this morning. Your metrics look normal. Decide whether this is a platform problem or an account problem, choose the diagnostics that settle it, and write the next-steps message.",
  companyName: "Verdant Systems (your employer)",
  durationMinutes: 5,
  resources: [
    {
      id: "platform_status",
      title: "Platform health",
      kind: "table",
      content:
        "| Metric | Value | State |\n| --- | --- | --- |\n| API error rate | 0.1% | Normal |\n| API p95 latency | 180ms | Normal |\n| us-east region | Healthy | Green |\n| us-west region | Healthy | Green |\n| eu-central region | Healthy | Green |\n| Logins in the last hour | 12,400 | Normal |",
    },
    {
      id: "account_note",
      title: "Kestrel Freight account notes",
      kind: "markdown",
      content:
        "## Security settings\n\nIP allowlist: **ON**. Only listed IPs can reach the API and the app.\n\n## Change history\n\nAllowlist entries were edited yesterday at 17:40 by user `kestrel-admin`.\n\n## Support note from their IT\n\nThe office moved to a new building and a new network provider this week.\n\n## Their report\n\n\"Every request from our office is refused since this morning. Your status page says all good, which cannot be right.\"",
    },
  ],
  stakeholders: [
    {
      id: "owen",
      name: "Owen Delaney",
      role: "IT Manager, Kestrel Freight (customer)",
      blurb: "Frustrated but cooperative. Can check things on their side.",
      knowledge: [
        "The office switched network providers on Monday, which changed their outbound IP.",
        "A contractor edited the allowlist yesterday evening and removed entries he called stale.",
      ],
      withholds: ["Does not know what the platform metrics show."],
      responseRules: [
        {
          id: "rel_network",
          priority: 3,
          anyKeywords: ["network", "moved", "office", "provider", "isp", "new ip", "outbound", "egress"],
          reply:
            "We moved buildings over the weekend and switched network providers on Monday. I can read our current outbound IP off the router if you need it.",
        },
        {
          id: "rel_allowlist",
          priority: 3,
          anyKeywords: ["allowlist", "allow list", "ip list", "firewall", "changed", "yesterday", "17:40", "security setting"],
          reply:
            "A contractor tidied our security settings yesterday evening and removed entries he called stale. I did not review what he took out.",
        },
        {
          id: "rel_scope",
          priority: 2,
          anyKeywords: ["everyone", "all users", "home", "remote", "vpn", "other locations"],
          reply:
            "It is only the office. Two people working from home this morning got in fine.",
        },
      ],
      fallbackReply:
        "I can check anything on our side. Tell me exactly what you need and I will get it.",
    },
  ],
  questions: [
    {
      id: "likely_cause",
      kind: "single_select",
      prompt: "What is the most likely cause?",
      options: [
        "An account-specific configuration issue, most likely the IP allowlist blocking their new network",
        "A platform-wide outage the status page has not caught yet",
        "Their user passwords all expired at once",
        "A regional failure in us-east",
      ],
      points: 30,
      answer: [
        "An account-specific configuration issue, most likely the IP allowlist blocking their new network",
      ],
      competencyKey: "scope_triage",
      expectedEvidence:
        "Every platform metric is normal and 12,400 logins succeeded in the last hour. Their allowlist was edited yesterday and their office changed networks this week, so their new IP is likely not on the list.",
    },
    {
      id: "what_not_to_do",
      kind: "single_select",
      prompt: "Which action should you avoid right now?",
      options: [
        "Declare a platform outage and post a public incident",
        "Check request logs for their account",
        "Ask their IT for the office's current outbound IP",
        "Review the allowlist change history",
      ],
      points: 15,
      answer: ["Declare a platform outage and post a public incident"],
      competencyKey: "incident_judgment",
      expectedEvidence:
        "The metrics show a healthy platform with thousands of successful logins. Declaring an outage would be false and would alarm every other customer.",
    },
    {
      id: "useful_diagnostics",
      kind: "multi_select",
      prompt: "Which diagnostics would help most?",
      options: [
        "Request logs for the Kestrel Freight account",
        "The office's current outbound IP address",
        "The allowlist change history from yesterday",
        "A restart of the us-east region",
        "A survey asking other customers if they see errors",
      ],
      points: 20,
      answer: [
        "Request logs for the Kestrel Freight account",
        "The office's current outbound IP address",
        "The allowlist change history from yesterday",
      ],
      competencyKey: "diagnostic_planning",
      expectedEvidence:
        "Their request logs show whether traffic is being rejected, their current IP shows what should be on the list, and the change history shows what the edit removed. Restarting a healthy region and surveying customers add nothing.",
    },
    {
      id: "next_steps_message",
      kind: "text",
      prompt: "Write the next-steps message to the customer.",
      helpText:
        "Max 400 characters. Be honest about platform health without dismissing them, and say what you need from them.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "healthy_not_dismissive",
          label: "Confirms the platform is healthy without dismissing them",
          keywords: ["healthy", "no outage", "platform is up", "taking this seriously", "normal", "other customers are"],
        },
        {
          id: "point_to_allowlist",
          label: "Points to the allowlist change",
          keywords: ["allowlist", "allow list", "ip list", "changed yesterday", "17:40"],
        },
        {
          id: "ask_current_ip",
          label: "Asks for their current IP",
          keywords: ["current ip", "outbound ip", "egress", "your ip", "send us the ip", "new network"],
        },
        {
          id: "commit_followup",
          label: "Commits to a follow-up",
          keywords: ["follow up", "update you", "within", "get back", "as soon as"],
        },
      ],
      competencyKey: "customer_communication",
      expectedEvidence:
        "Our platform is healthy right now, but we are taking your report seriously. Your account's IP allowlist was edited yesterday at 17:40, and your office moved networks this week, so your new address may not be on the list. Please send your office's current outbound IP. I will check your request logs and follow up within the hour.",
    },
  ],
  competencies: [
    { key: "scope_triage", label: "Scope triage" },
    { key: "incident_judgment", label: "Incident judgment" },
    { key: "diagnostic_planning", label: "Diagnostic planning" },
    { key: "customer_communication", label: "Customer communication" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    likely_cause: "Weighed healthy platform metrics against the account's recent changes and landed on the allowlist.",
    what_not_to_do: "Avoided declaring a false outage while the evidence pointed at one account.",
    useful_diagnostics: "Picked the three diagnostics that actually settle the question.",
    next_steps_message: "The message is honest about platform health, specific about the likely cause, and asks for exactly what is needed.",
  },
  improvementTemplates: {
    likely_cause:
      "With every metric normal and 12,400 successful logins, a platform outage does not fit. The allowlist edit plus the office network move point at account configuration.",
    what_not_to_do:
      "Declaring a platform outage is the move to avoid. The platform is demonstrably healthy, and a false incident alarms every other customer.",
    useful_diagnostics:
      "The useful diagnostics are the account's request logs, their current outbound IP, and the allowlist change history. Restarting healthy regions adds nothing.",
    next_steps_message:
      "A stronger message confirms the platform is healthy without dismissing the customer, points to the allowlist edit, asks for their current IP, and commits to a follow-up time.",
  },
};

// ---------------------------------------------------------------------------
// BSA 1. Invoice Routing
//    Routing matches on unstable vendor names. 3 of the 5 failed invoices
//    belong to V-201, whose name varies across invoices.
// ---------------------------------------------------------------------------
export const MICRO_BSA_INVOICE_ROUTING: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "invoice-routing",
  roleKey: "business_systems_analyst",
  title: "Invoice Routing",
  tagline: "Five invoices failed because a vendor cannot spell its own name the same way twice.",
  mission:
    "Invoices route to approvers by matching the vendor name printed on the invoice. Five failed this week and sit unpaid. Find the design flaw, quantify it, and lay out a migration that fixes routing without losing the audit trail.",
  companyName: "Millbrook Foods",
  durationMinutes: 5,
  resources: [
    {
      id: "failures",
      title: "Routing failures this week",
      kind: "table",
      content:
        "| Invoice | Vendor name on invoice | vendor_id in master | Amount | Status |\n| --- | --- | --- | ---: | --- |\n| INV-1088 | J&J Supplies | V-201 | $2,140 | Failed to route |\n| INV-1091 | J and J Supplies | V-201 | $860 | Failed to route |\n| INV-1094 | JJ Supplies Inc | V-201 | $1,375 | Failed to route |\n| INV-1096 | Nortec Ltd. | V-318 | $540 | Failed to route |\n| INV-1099 | Brightline Paper Co | V-442 | $3,200 | Failed to route |",
    },
    {
      id: "routing_rule",
      title: "Current routing rule",
      kind: "markdown",
      content:
        "## How routing works today\n\nAn incoming invoice is routed to an approver by **exact match** on the vendor name printed on the invoice against the canonical name in the vendor master. Any invoice with no exact match lands on a weekly failure report and waits.\n\n## Vendor master (relevant rows)\n\n| vendor_id | Canonical name |\n| --- | --- |\n| V-201 | J&J Supplies LLC |\n| V-318 | Nortec Limited |\n| V-442 | Brightline Paper Company |\n\nEvery invoice already carries a `vendor_id`, matched upstream by the procurement system when the purchase order is created.",
    },
  ],
  stakeholders: [
    {
      id: "gloria",
      name: "Gloria Sanders",
      role: "Accounts Payable Manager",
      blurb: "Owns the failure report. Fields the calls from unpaid vendors.",
      knowledge: [
        "The vendor_id comes from procurement at purchase order time and is reliable; the printed names vary constantly.",
        "Auditors require a record of why each invoice routed where it did.",
      ],
      withholds: ["Will not design the new routing logic."],
      responseRules: [
        {
          id: "rel_vendor_id",
          priority: 3,
          anyKeywords: ["vendor_id", "vendor id", "v-201", "master", "canonical", "procurement", "reliable"],
          reply:
            "The vendor_id comes from procurement when the purchase order is cut, and it is reliable. The names are whatever the vendor's billing system prints that week.",
        },
        {
          id: "rel_audit",
          priority: 2,
          anyKeywords: ["audit", "trail", "record", "compliance", "history", "why it routed"],
          reply:
            "Audit asks us to show why each invoice routed where it did. Whatever you change, that record has to survive.",
        },
        {
          id: "rel_backlog",
          priority: 2,
          anyKeywords: ["failed", "backlog", "unpaid", "late", "reprocess", "waiting", "five invoices"],
          reply:
            "The five on the failure report are sitting unpaid, and two vendors have already called. I need those cleared as part of any fix, not left behind.",
        },
      ],
      fallbackReply:
        "I know the payables side cold. Ask me about the invoices, the vendors, or what audit expects.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why do these invoices fail to route?",
      options: [
        "Routing matches on vendor names, which vary between invoices, instead of the stable vendor_id",
        "The vendor master is missing these vendors",
        "The approvers are rejecting the invoices",
        "The invoice amounts exceed routing limits",
      ],
      points: 30,
      answer: [
        "Routing matches on vendor names, which vary between invoices, instead of the stable vendor_id",
      ],
      competencyKey: "process_diagnosis",
      expectedEvidence:
        "All five failed invoices carry a valid vendor_id, but none of the printed names exactly match the canonical names. The match key is unstable; the id is not.",
    },
    {
      id: "v201_count",
      kind: "number",
      prompt: "How many of the failed invoices belong to vendor V-201?",
      points: 20,
      answer: [3, 0],
      competencyKey: "data_quantification",
      expectedEvidence:
        "INV-1088, INV-1091 and INV-1094 all map to V-201 under three different printed names. 3 invoices.",
    },
    {
      id: "best_fix",
      kind: "single_select",
      prompt: "What is the right fix?",
      options: [
        "Route by vendor_id, with an exception queue for invoices that cannot be matched",
        "Ask vendors to print their canonical name exactly on every invoice",
        "Add every name variation to the vendor master as it appears",
        "Route all failed invoices to one senior approver",
      ],
      points: 15,
      answer: ["Route by vendor_id, with an exception queue for invoices that cannot be matched"],
      competencyKey: "solution_design",
      expectedEvidence:
        "The vendor_id is already on every invoice and is reliable, so it is the right match key. An exception queue handles the rare unmatched case without silent failure. Chasing name variations never ends.",
    },
    {
      id: "migration_plan",
      kind: "text",
      prompt: "Describe your migration approach.",
      helpText:
        "Max 400 characters. Cover the new matching, exceptions, the audit record, and the failed invoices.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "switch_to_id",
          label: "Switches matching to vendor_id",
          keywords: ["vendor_id", "vendor id", "match on id", "route by id", "stable id"],
        },
        {
          id: "exception_queue",
          label: "Keeps an exception queue for unmatched invoices",
          keywords: ["exception queue", "exception", "unmatched", "manual review", "queue"],
        },
        {
          id: "audit_trail",
          label: "Preserves an audit trail of routing decisions",
          keywords: ["audit", "trail", "record", "why it routed", "log each", "history"],
        },
        {
          id: "reprocess_failed",
          label: "Backfills or reprocesses the failed invoices",
          keywords: ["reprocess", "backfill", "failed invoices", "re-run", "rerun", "clear the backlog"],
        },
      ],
      competencyKey: "migration_planning",
      expectedEvidence:
        "Switch matching from printed names to vendor_id, which every invoice already carries. Invoices with no id match go to an exception queue for manual review instead of failing silently. Record each routing decision so the audit trail survives. Then reprocess the five failed invoices under the new rule so the backlog clears.",
    },
  ],
  competencies: [
    { key: "process_diagnosis", label: "Process diagnosis" },
    { key: "data_quantification", label: "Data quantification" },
    { key: "solution_design", label: "Solution design" },
    { key: "migration_planning", label: "Migration planning" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Identified the unstable match key as the design flaw, not the vendors or the data.",
    v201_count: "Counted the V-201 invoices correctly across three name variations.",
    best_fix: "Chose the stable identifier with an exception path instead of chasing name variations.",
    migration_plan: "The migration covers matching, exceptions, the audit trail, and the existing backlog.",
  },
  improvementTemplates: {
    root_cause:
      "Every failed invoice has a valid vendor_id but a printed name that does not exactly match the master. The flaw is matching on names instead of the stable id.",
    v201_count:
      "3 failed invoices belong to V-201: INV-1088, INV-1091 and INV-1094, each with a different printed name.",
    best_fix:
      "The right fix routes by vendor_id with an exception queue for unmatched invoices. Adding name variations to the master is a treadmill that never ends.",
    migration_plan:
      "A stronger plan switches matching to vendor_id, keeps an exception queue, preserves the audit record of every routing decision, and reprocesses the five failed invoices.",
  },
};

// ---------------------------------------------------------------------------
// BSA 2. Access Provisioning
//    IT disables accounts only on HR status 'separated', a value HR never
//    sends. E-11 and E-13 are terminated but still enabled.
// ---------------------------------------------------------------------------
export const MICRO_BSA_ACCESS_PROVISIONING: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "access-provisioning",
  roleKey: "business_systems_analyst",
  title: "Access Provisioning",
  tagline: "Two people left the company and their logins did not.",
  mission:
    "A spot check found former employees with working accounts. HR and IT each run their own system, connected by a nightly sync. Find why departures are not turning accounts off, measure the exposure, and recommend the fix.",
  companyName: "Copperfield Logistics",
  durationMinutes: 5,
  resources: [
    {
      id: "hr_table",
      title: "HR system status",
      kind: "table",
      content:
        "| Employee | Name | HR status | Last day |\n| --- | --- | --- | --- |\n| E-11 | Tara Nguyen | terminated | 2026-07-10 |\n| E-12 | Bo Ellis | active | |\n| E-13 | Ken Watts | terminated | 2026-07-15 |\n| E-14 | Ana Silva | on_leave | |\n| E-15 | Raj Mehta | active | |\n| E-16 | Lucy Ford | active | |",
    },
    {
      id: "it_table",
      title: "IT directory access",
      kind: "table",
      content:
        "| Employee | IT account | Access |\n| --- | --- | --- |\n| E-11 | t.nguyen | enabled |\n| E-12 | b.ellis | enabled |\n| E-13 | k.watts | enabled |\n| E-14 | a.silva | enabled |\n| E-15 | r.mehta | enabled |\n| E-16 | l.ford | enabled |",
    },
    {
      id: "mapping_note",
      title: "Sync rule note",
      kind: "markdown",
      content:
        "## Nightly sync rule\n\nThe IT directory disables an account only when the HR feed shows status `separated`.\n\n## HR status values\n\nHR uses exactly three values: `active`, `on_leave`, `terminated`. HR has never used `separated`.",
    },
  ],
  stakeholders: [
    {
      id: "denise",
      name: "Denise Alvarez",
      role: "IT Operations Lead",
      blurb: "Runs the directory and the nightly sync. Wants a clean fix.",
      knowledge: [
        "The sync predates the current HR system; the old system sent 'separated' when someone left, and nobody updated the rule.",
        "Changing the mapping is a small config edit; specific accounts can be disabled manually today.",
      ],
      withholds: ["Will not decide which system is authoritative."],
      responseRules: [
        {
          id: "rel_mapping",
          priority: 3,
          anyKeywords: ["separated", "mapping", "sync", "status value", "terminated", "rule", "config"],
          reply:
            "The sync predates our current HR system. The old one sent 'separated' when someone left. Nobody updated the rule after the migration. Changing it is a small config edit.",
        },
        {
          id: "rel_disable",
          priority: 2,
          anyKeywords: ["disable", "revoke", "e-11", "e-13", "right now", "immediately", "manual"],
          reply:
            "I can disable specific accounts manually today if you name them. The sync fix takes care of it going forward.",
        },
        {
          id: "rel_risk",
          priority: 2,
          anyKeywords: ["risk", "security", "audit", "review", "exposure"],
          reply:
            "Security flagged orphaned accounts in last year's review. If we touch this, they will want a documented access review, not just a quiet fix.",
        },
      ],
      fallbackReply:
        "I run the directory and the sync. Ask me something specific and I can pull it up.",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why do departed employees still have access?",
      options: [
        "IT disables accounts only on the status 'separated', a value HR never sends",
        "The nightly sync job has stopped running",
        "HR forgot to record the terminations",
        "IT accounts can only be disabled manually",
      ],
      points: 30,
      answer: ["IT disables accounts only on the status 'separated', a value HR never sends"],
      competencyKey: "systems_diagnosis",
      expectedEvidence:
        "HR correctly shows E-11 and E-13 as terminated, but the sync only reacts to 'separated', which HR has never used. The systems disagree on vocabulary, not on facts.",
    },
    {
      id: "exposed_count",
      kind: "number",
      prompt: "How many departed employees still have enabled access?",
      points: 20,
      answer: [2, 0],
      competencyKey: "risk_quantification",
      expectedEvidence:
        "E-11 (Tara Nguyen) and E-13 (Ken Watts) are terminated in HR and enabled in the IT directory. 2 employees.",
    },
    {
      id: "authoritative_source",
      kind: "single_select",
      prompt: "Which system should be the authoritative source for employment status?",
      options: [
        "The HR system",
        "The IT directory",
        "The department managers, by email",
        "Whichever system was updated most recently",
      ],
      points: 15,
      answer: ["The HR system"],
      competencyKey: "data_governance",
      expectedEvidence:
        "HR records the employment event itself and already shows the correct statuses. The IT directory should follow HR, not the other way around.",
    },
    {
      id: "recommendation",
      kind: "text",
      prompt: "Write your recommendation.",
      helpText:
        "Max 400 characters. Cover the source of truth, the mapping fix, the immediate cleanup, and how this stays fixed.",
      maxChars: 400,
      points: 25,
      concepts: [
        {
          id: "hr_source_of_truth",
          label: "Defines HR as the source of truth",
          keywords: ["source of truth", "authoritative", "hr system", "hr status", "hr owns"],
        },
        {
          id: "fix_mapping",
          label: "Fixes the status mapping",
          keywords: ["mapping", "terminated", "sync rule", "status value", "map"],
        },
        {
          id: "immediate_review",
          label: "Runs an immediate access review",
          keywords: ["immediate", "disable now", "access review", "today", "revoke", "right away"],
        },
        {
          id: "ongoing_reconciliation",
          label: "Adds ongoing reconciliation between the systems",
          keywords: ["reconcil", "recurring", "ongoing", "regular", "compare", "monitor"],
        },
      ],
      competencyKey: "written_recommendation",
      expectedEvidence:
        "Make the HR system the authoritative source for employment status. Fix the sync mapping so 'terminated' disables the IT account. Run an immediate access review and disable E-11 and E-13 today. Then add a recurring reconciliation that compares HR status against directory access and flags any mismatch.",
    },
  ],
  competencies: [
    { key: "systems_diagnosis", label: "Systems diagnosis" },
    { key: "risk_quantification", label: "Risk quantification" },
    { key: "data_governance", label: "Data governance" },
    { key: "written_recommendation", label: "Written recommendation" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Found the vocabulary mismatch between the systems instead of blaming either team.",
    exposed_count: "Measured the exposure precisely by joining the two tables.",
    authoritative_source: "Named HR as the authoritative source, which matches where the employment event is recorded.",
    recommendation: "The recommendation fixes the mapping, cleans up now, and keeps the systems reconciled.",
  },
  improvementTemplates: {
    root_cause:
      "HR shows the terminations correctly. The sync only disables on 'separated', a value HR never sends, so nothing ever fires. The mapping is the failure.",
    exposed_count:
      "2 departed employees still have access: E-11 and E-13 are terminated in HR but enabled in the directory.",
    authoritative_source:
      "The HR system should be authoritative. It records the employment event itself, and the directory should follow it.",
    recommendation:
      "A stronger recommendation names HR as the source of truth, fixes the mapping so 'terminated' disables access, runs an immediate review, and adds recurring reconciliation.",
  },
};

// ---------------------------------------------------------------------------
// BSA 3. The CRM Handoff
//    Marketing 'qualified' has no mapped Sales stage. 28 of 40 qualified
//    leads last month have no Sales stage at all.
// ---------------------------------------------------------------------------
export const MICRO_BSA_CRM_HANDOFF: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "crm-handoff",
  roleKey: "business_systems_analyst",
  title: "The CRM Handoff",
  tagline: "Forty leads went in, twelve came out, and nobody noticed the gap.",
  mission:
    "Sales says Marketing sends them nothing. Marketing says they qualified forty leads last month. Both are right. Find where the leads go, measure the loss, and propose a handoff that cannot silently drop leads again.",
  companyName: "Bluearc Software",
  durationMinutes: 5,
  resources: [
    {
      id: "stage_map",
      title: "Lifecycle stage mapping",
      kind: "markdown",
      content:
        "| Marketing stage | Maps to Sales stage |\n| --- | --- |\n| new | none (marketing only) |\n| engaged | none (marketing only) |\n| qualified | **no mapping defined** |\n\nSales stages are: `prospect`, `opportunity`, `customer`. A lead appears in Sales queues only after it has a Sales stage.",
    },
    {
      id: "funnel_note",
      title: "Last month's funnel",
      kind: "markdown",
      content:
        "## Counts\n\n- 40 leads reached Marketing stage `qualified`.\n- 12 of those became Sales opportunities, each created by hand by a rep.\n- 28 have no Sales stage and appear in no Sales queue.",
    },
  ],
  stakeholders: [
    {
      id: "hana",
      name: "Hana Kim",
      role: "Marketing Operations Manager",
      blurb: "Runs the marketing side of the CRM. Tired of the blame game.",
      knowledge: [
        "The 'qualified' stage was added in March and its Sales mapping was never configured.",
        "The 12 opportunities came from one rep who tracks qualified leads in her own spreadsheet; nobody owns the handoff.",
      ],
      withholds: ["Will not speak for what Sales will agree to."],
      responseRules: [
        {
          id: "rel_mapping",
          priority: 3,
          anyKeywords: ["mapping", "qualified", "no sales stage", "configured", "stage", "march"],
          reply:
            "We added the 'qualified' stage in March. Setting up where it lands in Sales was on someone's list, but I honestly could not tell you whose. It never got configured.",
        },
        {
          id: "rel_manual",
          priority: 2,
          anyKeywords: ["12", "twelve", "manual", "by hand", "rep", "opportunit", "spreadsheet"],
          reply:
            "One rep keeps her own spreadsheet of qualified leads and creates opportunities by hand. That is where the 12 came from. Nobody else does it.",
        },
        {
          id: "rel_owner",
          priority: 2,
          anyKeywords: ["own", "whose", "responsib", "who decides", "handoff", "accountable"],
          reply:
            "Right now nobody owns the handoff. Marketing thinks it ends at 'qualified' and Sales thinks it starts at 'opportunity'. The gap between those two is unclaimed.",
        },
      ],
      fallbackReply:
        "I can pull anything from the marketing side of the CRM. What do you want to see?",
    },
  ],
  questions: [
    {
      id: "root_cause",
      kind: "single_select",
      prompt: "Why do qualified leads disappear?",
      options: [
        "The 'qualified' stage has no mapped Sales stage, so qualified leads never reach a Sales queue",
        "Sales reps are deleting leads they do not want",
        "Marketing is qualifying too many leads",
        "The CRM drops records during nightly maintenance",
      ],
      points: 30,
      answer: [
        "The 'qualified' stage has no mapped Sales stage, so qualified leads never reach a Sales queue",
      ],
      competencyKey: "funnel_diagnosis",
      expectedEvidence:
        "The mapping table shows 'qualified' has no mapped Sales stage, and a lead appears in Sales queues only after it has one. The 12 that made it were created by hand.",
    },
    {
      id: "lost_count",
      kind: "number",
      prompt: "How many qualified leads fell through last month?",
      points: 25,
      answer: [28, 0],
      competencyKey: "impact_quantification",
      expectedEvidence:
        "40 leads reached 'qualified'. 12 were manually turned into opportunities. 28 have no Sales stage and sit in no queue.",
    },
    {
      id: "handoff_owner",
      kind: "single_select",
      prompt: "Who should own the handoff definition?",
      options: [
        "Marketing and Sales jointly, with one written definition",
        "Marketing alone, since they create the leads",
        "Sales alone, since they work the leads",
        "The CRM vendor's support team",
      ],
      points: 15,
      answer: ["Marketing and Sales jointly, with one written definition"],
      competencyKey: "ownership_judgment",
      expectedEvidence:
        "The handoff spans both teams, and the gap exists because each side assumes the other owns it. One written definition agreed by both closes that gap.",
    },
    {
      id: "proposal",
      kind: "text",
      prompt: "Write your proposal to fix the handoff.",
      helpText:
        "Max 400 characters. Cover the mapping, the written definition, ownership, and how you would catch this next time.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "explicit_mapping",
          label: "Maps qualified to a Sales stage explicitly",
          keywords: ["map qualified", "mapping", "map to", "prospect", "sales stage"],
        },
        {
          id: "written_criteria",
          label: "Defines the handoff criteria in writing",
          keywords: ["written", "criteria", "definition", "document", "agree on"],
        },
        {
          id: "assign_ownership",
          label: "Assigns ownership",
          keywords: ["owner", "own the handoff", "accountab", "responsib", "jointly"],
        },
        {
          id: "monitor_unmapped",
          label: "Adds monitoring for unmapped leads",
          keywords: ["monitor", "alert", "unmapped", "report on", "track", "flag"],
        },
      ],
      competencyKey: "process_proposal",
      expectedEvidence:
        "Map 'qualified' explicitly to the Sales stage 'prospect' so every qualified lead lands in a Sales queue. Write down the handoff criteria and get both teams to agree on the definition. Make Marketing and Sales joint owners of it. Add a weekly report that flags any lead sitting in 'qualified' with no Sales stage, so the next gap cannot stay invisible.",
    },
  ],
  competencies: [
    { key: "funnel_diagnosis", label: "Funnel diagnosis" },
    { key: "impact_quantification", label: "Impact quantification" },
    { key: "ownership_judgment", label: "Ownership judgment" },
    { key: "process_proposal", label: "Process proposal" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    root_cause: "Located the gap in the stage mapping instead of blaming either team.",
    lost_count: "Quantified the lost leads directly from the funnel counts.",
    handoff_owner: "Recognized that a cross-team gap needs joint ownership and one written definition.",
    proposal: "The proposal fixes the mapping, writes down the definition, assigns owners, and adds monitoring.",
  },
  improvementTemplates: {
    root_cause:
      "The mapping table shows 'qualified' has no mapped Sales stage, so those leads never enter a Sales queue. The 12 that converted were created by hand.",
    lost_count: "28 leads fell through: 40 reached 'qualified' and only 12 became opportunities.",
    handoff_owner:
      "Joint ownership with one written definition is the answer. The gap exists precisely because each team assumed the other owned the handoff.",
    proposal:
      "A stronger proposal maps 'qualified' to a specific Sales stage, defines the handoff criteria in writing, assigns joint ownership, and monitors for unmapped leads.",
  },
};

// ---------------------------------------------------------------------------
// BSA 4. The Change Request
//    The request skips secondary approval under $8,000, but control PC-7
//    requires it above $5,000. Conflict zone: $5,000 to $8,000.
// ---------------------------------------------------------------------------
export const MICRO_BSA_CHANGE_REQUEST: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "change-request",
  roleKey: "business_systems_analyst",
  title: "The Change Request",
  tagline: "The stakeholder wants a shortcut that runs straight through a financial control.",
  mission:
    "A director wants a workflow exception this week. Her request collides with an approved financial control. Identify the exact conflict, decide the right path, and answer her in a way that keeps both the relationship and the control intact.",
  companyName: "Halbrook Industries",
  durationMinutes: 5,
  resources: [
    {
      id: "request_email",
      title: "Change request email",
      kind: "markdown",
      content:
        "From: Dana Pruitt, Director of Facilities\nTo: Business Systems\nSubject: Approval exception for Facilities\n\nOur repair purchases keep stalling in secondary approval. I want purchases under $8,000 from the Facilities department to skip secondary approval entirely. Urgent repairs cannot wait two days for a second signature. Please make this change this week.",
    },
    {
      id: "policy_doc",
      title: "Purchase control PC-7",
      kind: "markdown",
      content:
        "## Control PC-7\n\nAll purchases above $5,000 require secondary approval by a second authorized approver.\n\n- Approved by internal audit in January.\n- Control owner: Finance Controller.\n- Any change to this control requires the control owner's documented approval.",
    },
  ],
  stakeholders: [
    {
      id: "victor",
      name: "Victor Osei",
      role: "Finance Controller",
      blurb: "Owns control PC-7. Reasonable, but guards the threshold.",
      knowledge: [
        "A documented exception process exists: a short risk memo plus his sign-off, filed for audit, about a week end to end.",
        "The $5,000 threshold came from a fraud case involving split purchases; audit set it in January.",
      ],
      withholds: ["Will not pre-approve anything in chat."],
      responseRules: [
        {
          id: "rel_owner",
          priority: 3,
          anyKeywords: ["control owner", "pc-7", "pc7", "who approves", "exception", "change the control", "process"],
          reply:
            "PC-7 is mine. There is a real exception process: a short risk memo, my sign-off, and it goes in the audit file. It usually takes about a week, not months.",
        },
        {
          id: "rel_threshold",
          priority: 2,
          anyKeywords: ["5,000", "5000", "threshold", "why", "january", "audit", "fraud"],
          reply:
            "The $5,000 line is not arbitrary. We had a fraud case two years ago involving split purchases just under the old limit. Audit set the current threshold in January.",
        },
        {
          id: "rel_urgency",
          priority: 2,
          anyKeywords: ["urgent", "repair", "facilities", "emergency", "two days", "expedite"],
          reply:
            "If Facilities has genuinely urgent repairs, there is an emergency purchase route with after-the-fact review. That might solve Dana's real problem without touching the control.",
        },
      ],
      fallbackReply:
        "I would rather answer a precise question than guess at what you need. What part of the control are you looking at?",
    },
  ],
  questions: [
    {
      id: "identify_conflict",
      kind: "single_select",
      prompt: "What is the conflict in this request?",
      options: [
        "It removes secondary approval for purchases between $5,000 and $8,000, which control PC-7 requires",
        "It asks for a change to be made this week",
        "Facilities is not allowed to request workflow changes",
        "The $8,000 figure is higher than any real repair cost",
      ],
      points: 30,
      answer: [
        "It removes secondary approval for purchases between $5,000 and $8,000, which control PC-7 requires",
      ],
      competencyKey: "policy_analysis",
      expectedEvidence:
        "PC-7 requires secondary approval above $5,000. The request skips it under $8,000, so purchases from $5,000 to $8,000 would bypass an audit-approved control.",
    },
    {
      id: "what_not_to_do",
      kind: "single_select",
      prompt: "Which response should you avoid?",
      options: [
        "Implement the exception quietly and hope audit does not notice",
        "Check the request against the written control",
        "Tell Dana exactly where the conflict is",
        "Ask the control owner how exceptions are handled",
      ],
      points: 25,
      answer: ["Implement the exception quietly and hope audit does not notice"],
      competencyKey: "professional_judgment",
      expectedEvidence:
        "Changing an audit-approved control without the owner's documented approval violates the control's own change rule and creates audit exposure. Silence is the one option that is never right here.",
    },
    {
      id: "right_path",
      kind: "single_select",
      prompt: "What is the right path forward?",
      options: [
        "Route the request to the Finance Controller, the control owner, for a documented decision",
        "Reject the request and close the ticket",
        "Implement it only for purchases under $5,000, since that avoids the conflict",
        "Escalate to the CEO for a decision",
      ],
      points: 15,
      answer: [
        "Route the request to the Finance Controller, the control owner, for a documented decision",
      ],
      competencyKey: "governance_process",
      expectedEvidence:
        "The control itself says changes require the control owner's documented approval. Routing the request there addresses Dana's need through the process that exists for exactly this case.",
    },
    {
      id: "stakeholder_response",
      kind: "text",
      prompt: "Write your response to Dana.",
      helpText:
        "Max 400 characters. Name the conflict, keep the door open, and offer a concrete path.",
      maxChars: 400,
      points: 20,
      concepts: [
        {
          id: "name_conflict",
          label: "Names the specific policy conflict",
          keywords: ["pc-7", "5,000", "5000", "control", "requires secondary", "conflict"],
        },
        {
          id: "not_refusal",
          label: "Does not refuse outright",
          keywords: ["understand", "valid", "not saying no", "want to help", "hear you", "real problem"],
        },
        {
          id: "governed_path",
          label: "Proposes the governed path",
          keywords: ["control owner", "finance controller", "exception process", "formal", "governed"],
        },
        {
          id: "offer_to_raise",
          label: "Offers to raise it and document the outcome",
          keywords: ["raise it", "bring this to", "on your behalf", "record the outcome", "follow up with"],
        },
      ],
      competencyKey: "written_response",
      expectedEvidence:
        "I understand the delay on urgent repairs is a real problem. I cannot implement this as asked: control PC-7 requires secondary approval above $5,000, so the request conflicts with it between $5,000 and $8,000. There is an exception process through the Finance Controller, the control owner. I will raise it on your behalf this week and record the outcome either way.",
    },
  ],
  competencies: [
    { key: "policy_analysis", label: "Policy analysis" },
    { key: "professional_judgment", label: "Professional judgment" },
    { key: "governance_process", label: "Governance process" },
    { key: "written_response", label: "Written response" },
    { key: "stakeholder_communication", label: "Stakeholder communication" },
  ],
  stakeholderPoints: 10,
  stakeholderCompetencyKey: "stakeholder_communication",
  strengthTemplates: {
    identify_conflict: "Pinpointed the exact range where the request breaks the control.",
    what_not_to_do: "Recognized that silently bypassing an audit-approved control is the one unacceptable move.",
    right_path: "Routed the request to the control owner, which is what the control itself requires.",
    stakeholder_response: "The response names the conflict, stays constructive, and offers a real path forward.",
  },
  improvementTemplates: {
    identify_conflict:
      "PC-7 requires secondary approval above $5,000, and the request skips it under $8,000. The conflict is the $5,000 to $8,000 range.",
    what_not_to_do:
      "The move to avoid is implementing the exception silently. The control's own rules require the owner's documented approval for any change.",
    right_path:
      "The right path routes the request to the Finance Controller for a documented decision. The exception process exists for exactly this case.",
    stakeholder_response:
      "A stronger response names the PC-7 conflict precisely, acknowledges the real problem without refusing outright, proposes the governed path, and offers to raise it and document the outcome.",
  },
};
