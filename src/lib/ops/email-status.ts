/**
 * Provider delivery statuses in the order they can happen. Webhooks arrive out
 * of order, so a status only replaces one ranked below it: a late "sent" or
 * "delayed" never undoes "delivered", and nothing undoes a bounce or failure.
 * Statuses set before the provider accepted the message (pending, processing,
 * cancelled, suppressed) rank lowest.
 */
export type ProviderStatus = "sent" | "delayed" | "delivered" | "bounced" | "failed";

const RANK: Record<ProviderStatus, number> = { sent: 1, delayed: 2, delivered: 3, bounced: 4, failed: 4 };
const PRE_PROVIDER = ["pending", "processing", "cancelled", "suppressed"] as const;

export function providerStatusFor(eventType: string): ProviderStatus | null {
  switch (eventType) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delayed";
    case "email.bounced":
      return "bounced";
    case "email.failed":
    case "email.complained":
      return "failed";
    default:
      return null;
  }
}

/** Current statuses that `next` may replace. Use as a compare-and-set filter on the update. */
export function statusesBelow(next: ProviderStatus): string[] {
  const lower = (Object.keys(RANK) as ProviderStatus[]).filter((s) => RANK[s] < RANK[next]);
  return [...PRE_PROVIDER, ...lower];
}

export function canAdvance(current: string, next: ProviderStatus): boolean {
  return statusesBelow(next).includes(current);
}
