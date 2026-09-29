import Link from "next/link";
import { UnifiedNav, UnifiedFooter, CtaBand, Faq } from "@/components/marketing/unified/UnifiedChrome";
import { PRICING, usd, planSignupHref } from "@/lib/marketing/pricing";

export const metadata = {
  title: "Pricing",
  description: `Free for engineers. Hiring teams pay ${usd(PRICING.starterPerSimulation)} per completed simulation, or ${usd(PRICING.teamMonthly)} a month with ${PRICING.teamIncluded} included.`,
};

const PLANS = [
  {
    name: "Engineers",
    price: "Free",
    per: "",
    unit: "Always free. Build and share your passport.",
    features: [
      "Passport from your public repos",
      "Source-linked findings",
      "Share links you control",
      "Invited simulations",
    ],
    cta: "Build your passport",
    href: "/passport/new",
    featured: false,
  },
  {
    name: "Starter",
    price: usd(PRICING.starterPerSimulation),
    per: "/ simulation",
    unit: "No monthly fee. Pay when candidates finish.",
    features: [
      "Unlimited roles and reviewers",
      "Python backend simulations",
      "Evidence reports with citations",
      "Decision log and notes",
    ],
    cta: "Start on Starter",
    href: planSignupHref("starter"),
    featured: false,
  },
  {
    name: "Team",
    badge: "Most popular",
    price: usd(PRICING.teamMonthly),
    per: "/ month",
    unit: `${PRICING.teamIncluded} simulations included. Then ${usd(PRICING.teamOverage)} each.`,
    features: [
      "Everything in Starter",
      `${PRICING.teamIncluded} simulations every month`,
      "Priority support",
      "Onboarding call for your first role",
    ],
    cta: "Start on Team",
    href: planSignupHref("team"),
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    unit: `For ${PRICING.enterpriseFrom}+ simulations a month.`,
    features: [
      "Everything in Team",
      "Volume pricing",
      "Security review",
      "Invoiced billing",
    ],
    cta: "Talk to us",
    href: "/contact",
    featured: false,
  },
];

const FAQS = [
  {
    q: "Is there a free trial?",
    a: "There is no separate trial. Starter has no monthly fee. You pay only when a candidate completes a simulation.",
  },
  {
    q: "What if a candidate doesn't finish?",
    a: "You pay nothing. Invites, expired links, and abandoned attempts are never billed.",
  },
  {
    q: "Can I change plans?",
    a: "Yes. Switch plans anytime from your billing settings. The new plan starts on your next cycle.",
  },
  {
    q: "Do you offer discounts?",
    a: `Enterprise plans include volume pricing for teams running ${PRICING.enterpriseFrom} or more simulations a month.`,
  },
  {
    q: "What payment methods do you accept?",
    a: "We bill through Stripe. All major credit and debit cards work. Enterprise can pay by invoice.",
  },
  {
    q: "Is there a contract?",
    a: "No. Starter and Team are month to month. Cancel anytime from your settings.",
  },
];

const COMPARISON_ROWS: { label: string; values: [string, string, string, string] }[] = [
  {
    label: "Completed simulations",
    values: ["Invited only", usd(PRICING.starterPerSimulation) + " each", `${PRICING.teamIncluded}/mo, then ${usd(PRICING.teamOverage)} each`, "Volume pricing"],
  },
  {
    label: "Roles",
    values: ["None", "Unlimited", "Unlimited", "Unlimited"],
  },
  {
    label: "Reviewers",
    values: ["None", "Unlimited", "Unlimited", "Unlimited"],
  },
  {
    label: "Evidence reports",
    values: ["Your passport", "With source citations", "With source citations", "With source citations"],
  },
  {
    label: "Support",
    values: ["None", "None", "Priority", "None"],
  },
];

const BILLING_STEPS = [
  {
    step: "01",
    title: "Charged on submission",
    body: "You pay when a candidate submits their work. Not when you send an invite. Not when a link expires.",
  },
  {
    step: "02",
    title: "One submission, one charge",
    body: "Each completed simulation counts once. Invites and abandoned attempts never count.",
  },
  {
    step: "03",
    title: "No lock-in",
    body: "Starter has no monthly fee. Team renews monthly. Cancel anytime from settings.",
  },
];

export default function PricingPage() {
  return (
    <div className="u-mkt">
      <UnifiedNav current="/pricing" />

      <header className="u-hero">
        <div className="u-wrap">
          <div className="u-hero-grid">
            <h1>Pay per signal.</h1>
            <div className="u-hero-sub">
              <p>Free for engineers. Hiring teams pay per completed simulation.</p>
              <div className="u-hero-ctas">
                <Link href="/get-started" className="u-btn u-btn-dark">Get started</Link>
                <Link href="/contact" className="u-btn u-btn-light">Talk to us</Link>
              </div>
            </div>
          </div>

          <div className="u-price-grid">
            {PLANS.map((plan) => (
              <div key={plan.name} className={"u-price-card" + (plan.featured ? " featured" : "")} style={{ position: "relative" }}>
                {plan.badge && (
                  <span className="u-chip teal" style={{ position: "absolute", top: -14, left: 32 }}>
                    {plan.badge}
                  </span>
                )}
                <h3>{plan.name}</h3>
                <div className="u-price">{plan.price}{plan.per ? <span className="u-per"> {plan.per}</span> : null}</div>
                <div className="u-per">{plan.unit}</div>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={"u-btn " + (plan.featured ? "u-btn-accent" : "u-btn-dark")}
                  style={{ width: "100%" }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Compare plans.</h2>
            <div className="u-sec-desc">
              <p>Every plan includes unlimited invites. You only pay for completed work.</p>
            </div>
          </div>
          <div className="u-table-wrap">
            <table className="u-table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}></th>
                  {["Engineers", "Starter", "Team", "Enterprise"].map((tier) => (
                    <th key={tier}>{tier}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" style={{ fontWeight: 600 }}>{row.label}</th>
                    {row.values.map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>How billing works.</h2>
            <div className="u-sec-desc">
              <p>Simple rules. Nothing hidden.</p>
            </div>
          </div>
          <div className="u-cards-3">
            {BILLING_STEPS.map((step) => (
              <div key={step.title} className="u-card">
                <span className="u-step">{step.step}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-card" style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px" }}>
              <h3 style={{ fontSize: 24 }}>Engineers never pay.</h3>
              <p style={{ fontSize: 15, color: "var(--u-muted)", lineHeight: 1.6 }}>
                Build your passport from public repos. Share it with links you control. Accept simulation invites. Free forever.
              </p>
            </div>
            <Link href="/passport/new" className="u-btn u-btn-dark">Build your passport</Link>
          </div>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Billing questions.</h2>
            <div className="u-sec-desc">
              <p>The short answers.</p>
            </div>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand />
      <UnifiedFooter />
    </div>
  );
}
