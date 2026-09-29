/**
 * Billing gate for engineering attempts (BUY-03, BILL-06).
 *
 * A completed evaluation is billable only once Fydell actually evaluated the
 * code. If every evaluation so far is an infrastructure failure or the runner
 * is not configured, usage is held (not dropped): the usage cron reports it
 * after a later successful evaluation, or an operator resolves it. An
 * indeterminate result is billable because the tests ran; it goes to human
 * review rather than being scored.
 */

export type EngineeringBillingState = "billable" | "hold";

export function engineeringBillingState(evaluationStatuses: string[]): EngineeringBillingState {
  return evaluationStatuses.some((s) => s === "completed" || s === "indeterminate") ? "billable" : "hold";
}
