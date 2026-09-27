"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PRICING, usd } from "@/lib/marketing/pricing";

type Plan = "starter" | "team";

const OPTIONS: { plan: Plan; name: string; price: string; detail: string }[] = [
  {
    plan: "starter",
    name: "Starter",
    price: `${usd(PRICING.starterPerSimulation)} per completed simulation`,
    detail: "No monthly fee. Billed monthly for simulations candidates submitted.",
  },
  {
    plan: "team",
    name: "Team",
    price: `${usd(PRICING.teamMonthly)}/mo`,
    detail: `Includes ${PRICING.teamIncluded} completed simulations, then ${usd(PRICING.teamOverage)} each.`,
  },
];

async function redirectTo(endpoint: string, body?: object): Promise<string | null> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: unknown = await res.json().catch(() => null);
    const url = typeof data === "object" && data !== null && "url" in data ? (data as { url: unknown }).url : null;
    if (res.ok && typeof url === "string") {
      window.location.assign(url);
      return null;
    }
    const error = typeof data === "object" && data !== null && "error" in data ? (data as { error: unknown }).error : null;
    return typeof error === "string" ? error : "Stripe could not be reached.";
  } catch {
    return "Network error. Check your connection and try again.";
  }
}

export default function PlanControls({
  hasSubscription,
  canManage,
  suggestedPlan,
}: {
  hasSubscription: boolean;
  canManage: boolean;
  suggestedPlan: Plan | null;
}) {
  const [pending, setPending] = useState<Plan | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return <p className="text-app-body text-[var(--text-secondary)]">Only an owner or admin can change the plan.</p>;
  }

  async function go(target: Plan | "portal") {
    setPending(target);
    setError(null);
    const message =
      target === "portal" ? await redirectTo("/api/billing/portal") : await redirectTo("/api/billing/checkout", { plan: target });
    if (message) {
      setError(message);
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      {hasSubscription ? (
        <div>
          <Button variant="secondary" loading={pending === "portal"} onClick={() => go("portal")}>
            Manage billing
          </Button>
          <p className="mt-2 text-app-meta text-[var(--text-secondary)]">
            Change plan, update your card, download invoices, or cancel in Stripe.
          </p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <div
              key={option.plan}
              className={`rounded-[var(--radius-control)] border p-4 ${
                suggestedPlan === option.plan ? "border-[var(--border-strong)]" : "border-[var(--border-default)]"
              }`}
            >
              <p className="text-app-body font-medium text-[var(--text-primary)]">{option.name}</p>
              <p className="mt-0.5 text-app-body text-[var(--text-primary)]">{option.price}</p>
              <p className="mt-1.5 text-app-meta leading-[1.5] text-[var(--text-secondary)]">{option.detail}</p>
              <Button
                className="mt-3"
                variant={suggestedPlan === option.plan ? "primary" : "secondary"}
                loading={pending === option.plan}
                disabled={pending !== null && pending !== option.plan}
                onClick={() => go(option.plan)}
              >
                Choose {option.name}
              </Button>
            </div>
          ))}
        </div>
      )}
      {error ? (
        <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
