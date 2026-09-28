import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BILLABLE_STATUSES } from "./db";
import { METER_EVENT_NAME, stripeClient, type BillingConfig } from "./stripe";
import { engineeringBillingState } from "@/lib/engineering/billing";
import { hasEngineeringEvaluation } from "@/lib/engineering/descriptor";
import { scenarioIdForTemplateSlug } from "@/lib/simulations/scenario-package";

/** Session states that mean the candidate submitted. Later states are the same simulation after analysis. */
const COMPLETED_STATUSES = ["submitted", "analyzed", "report_ready"];

export interface UsageReportResult {
  organizations: number;
  reported: number;
  failed: number;
  /** Engineering attempts not yet evaluated by Fydell (runner outage or not configured). */
  held: number;
}

/**
 * Reports each completed simulation to the Stripe meter exactly once. Reads sessions; never writes to them.
 * Only sessions submitted after the organization's subscription began are billed.
 * Engineering attempts are held until their code has actually been evaluated,
 * so a runner outage never consumes a paid evaluation (BUY-03).
 */
export async function reportCompletedSimulations(
  config: BillingConfig,
  options: { customerId?: string; limit?: number } = {},
): Promise<UsageReportResult> {
  const limit = options.limit ?? 200;
  const admin = createAdminSupabaseClient();
  const stripe = stripeClient(config);
  let query = admin
    .from("organization_billing")
    .select("organization_id, stripe_customer_id, status, billing_starts_at")
    .not("billing_starts_at", "is", null);
  if (options.customerId) query = query.eq("stripe_customer_id", options.customerId);
  const { data: accounts, error } = await query;
  if (error) throw new Error(`Could not read billing accounts: ${error.message}`);

  const result: UsageReportResult = { organizations: 0, reported: 0, failed: 0, held: 0 };
  const engineeringTemplates = new Map<string, boolean>();
  for (const account of accounts ?? []) {
    if (!BILLABLE_STATUSES.has(String(account.status))) continue;
    result.organizations += 1;

    const { data: sessions } = await admin
      .from("sim_sessions")
      .select("id, submitted_at, template_id")
      .eq("organization_id", account.organization_id)
      .in("status", COMPLETED_STATUSES)
      .not("submitted_at", "is", null)
      .gte("submitted_at", account.billing_starts_at)
      .order("submitted_at", { ascending: true })
      .limit(limit);
    if (!sessions?.length) continue;

    const { data: done } = await admin
      .from("billing_usage_reports")
      .select("session_id")
      .in("session_id", sessions.map((s) => s.id));
    const reported = new Set((done ?? []).map((r) => r.session_id as string));

    const unknownTemplates = [...new Set(sessions.map((s) => s.template_id as string))].filter(
      (t) => !engineeringTemplates.has(t)
    );
    if (unknownTemplates.length) {
      const { data: templates } = await admin.from("sim_templates").select("id, slug").in("id", unknownTemplates);
      for (const t of templates ?? []) {
        const scenarioId = scenarioIdForTemplateSlug(t.slug as string);
        engineeringTemplates.set(t.id as string, Boolean(scenarioId && hasEngineeringEvaluation(scenarioId)));
      }
    }
    const engineeringSessions = sessions
      .filter((s) => engineeringTemplates.get(s.template_id as string))
      .map((s) => s.id as string);
    const evaluationStatuses = new Map<string, string[]>();
    if (engineeringSessions.length) {
      const { data: runs } = await admin
        .from("sim_test_runs")
        .select("session_id, status")
        .eq("kind", "evaluation")
        .in("session_id", engineeringSessions);
      for (const r of runs ?? []) {
        const list = evaluationStatuses.get(r.session_id as string) ?? [];
        list.push(r.status as string);
        evaluationStatuses.set(r.session_id as string, list);
      }
    }

    for (const session of sessions) {
      if (reported.has(session.id as string)) continue;
      if (
        engineeringTemplates.get(session.template_id as string) &&
        engineeringBillingState(evaluationStatuses.get(session.id as string) ?? []) === "hold"
      ) {
        result.held += 1;
        continue;
      }
      const identifier = `sim_${session.id}`;
      try {
        await stripe.billing.meterEvents.create({
          event_name: METER_EVENT_NAME,
          identifier,
          timestamp: Math.floor(new Date(session.submitted_at as string).getTime() / 1000),
          payload: { stripe_customer_id: String(account.stripe_customer_id), value: "1" },
        });
        const { error: insertError } = await admin.from("billing_usage_reports").insert({
          session_id: session.id,
          organization_id: account.organization_id,
          stripe_customer_id: account.stripe_customer_id,
          meter_identifier: identifier,
          completed_at: session.submitted_at,
        });
        if (insertError) throw new Error(insertError.message);
        result.reported += 1;
      } catch (err) {
        result.failed += 1;
        console.error("[billing] usage report failed", { session: session.id, error: err instanceof Error ? err.message : err });
      }
    }
  }
  return result;
}
