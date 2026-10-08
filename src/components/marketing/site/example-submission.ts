/**
 * One example submission to the Webhook retry incident, shown from the
 * candidate's side on the homepage and the employer's side on /employers.
 * Context lines and line numbers match the shipped starter's
 * `Dispatcher._attempt`; the added lines are example work.
 */
export type DiffLine = { kind: "ctx" | "del" | "add"; old?: number; new?: number; code: string };

export const HUNK: DiffLine[] = [
  { kind: "ctx", old: 45, new: 45, code: "        delivery.last_status_code = response.status" },
  { kind: "ctx", old: 46, new: 46, code: "        if 200 <= response.status < 300:" },
  { kind: "ctx", old: 47, new: 47, code: "            delivery.status = DELIVERED" },
  { kind: "del", old: 48, code: "        else:" },
  { kind: "del", old: 49, code: "            # Anything that did not succeed goes straight back on the queue." },
  { kind: "del", old: 50, code: "            delivery.next_attempt_at = now" },
  { kind: "add", new: 48, code: "        elif is_temporary(response.status):" },
  { kind: "add", new: 49, code: "            self._schedule_retry(delivery, now)" },
  { kind: "add", new: 50, code: "        else:" },
  { kind: "add", new: 51, code: "            delivery.status = FAILED" },
  { kind: "add", new: 52, code: "            delivery.next_attempt_at = None" },
  { kind: "ctx", old: 51, new: 53, code: "        self.store.save(delivery)" },
];

export const CHANGED_PATH = "webhooks/dispatcher.py";

/** The scenario's public tests after the change, in the order `unittest -v` reports them. */
export const PUBLIC_RUN = [
  { name: "test_gone_endpoint_is_not_retried", fixed: true },
  { name: "test_idempotency_key_is_stable_across_retries", fixed: false },
  { name: "test_server_error_schedules_backoff", fixed: false },
  { name: "test_success_marks_delivered", fixed: false },
] as const;

/** Shared leading spaces of the hunk: it sits inside a method, so they carry no information. */
export const HUNK_INDENT = Math.min(...HUNK.map((l) => l.code.match(/^ */)![0].length));
