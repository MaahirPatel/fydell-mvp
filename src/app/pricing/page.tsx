import Link from "next/link";
import "@/styles/marketing-v2.css";
import { Nav, Footer, FooterCTA } from "@/components/marketing/MarketingV2";
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
    dark: false,
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
    dark: false,
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
    dark: true,
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
    dark: false,
  },
];

const FAQS = [
  {
    q: "What counts as billed?",
    a: "A completed simulation. Invites, expired links, and abandoned attempts are never billed.",
  },
  {
    q: "Do seats cost extra?",
    a: "No. Unlimited roles, invites, and reviewers on every plan.",
  },
  {
    q: "Do unused Team simulations roll over?",
    a: "No. They reset monthly. Starter may cost less for uneven volume.",
  },
  {
    q: "Do engineers ever pay?",
    a: "Never. Passports, share links, and invited simulations are free.",
  },
];

export default function PricingPage() {
  return (
    <div className="mk-canvas">
      <Nav />

      <div className="mk-hero" style={{ textAlign: "center" }}>
        <h1 style={{ maxWidth: "none" }}>Pay per simulation.</h1>
        <p className="mk-sub" style={{ maxWidth: 560, margin: "0 auto 32px" }}>
          Free for engineers. Teams pay only when candidates finish.
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 96px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.dark ? "var(--mk-text)" : "var(--mk-surface)",
                color: plan.dark ? "#fff" : "var(--mk-text)",
                border: plan.dark ? "none" : "1px solid var(--mk-border)",
                borderRadius: 12,
                padding: 28,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {plan.badge && (
                <span style={{
                  position: "absolute", top: -12, left: 28,
                  fontSize: 12, fontWeight: 600,
                  background: "var(--mk-teal)", color: "#fff",
                  padding: "4px 12px", borderRadius: 999,
                }}>
                  {plan.badge}
                </span>
              )}
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{plan.name}</div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em" }}>{plan.price}</span>
                {plan.per && (
                  <span style={{ fontSize: 14, color: plan.dark ? "#aaa" : "var(--mk-text-secondary)", marginLeft: 4 }}>
                    {plan.per}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: plan.dark ? "#aaa" : "var(--mk-text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
                {plan.unit}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{
                    fontSize: 14, padding: "8px 0",
                    borderTop: `1px solid ${plan.dark ? "#333" : "var(--mk-border)"}`,
                    color: plan.dark ? "#ddd" : "var(--mk-text-secondary)",
                    display: "flex", gap: 8, alignItems: "center",
                  }}>
                    <span style={{ color: plan.dark ? "var(--mk-teal-bright)" : "var(--mk-teal)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={plan.dark ? "mk-btn-light" : "mk-btn-dark"}
                style={plan.dark ? { background: "#fff", color: "var(--mk-text)", border: "none", justifyContent: "center" } : { justifyContent: "center" }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 96 }}>
          <h2 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 32px" }}>
            Billing questions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 48px" }}>
            {FAQS.map((faq) => (
              <div key={faq.q} style={{ padding: "20px 0", borderTop: "1px solid var(--mk-border)" }}>
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{faq.q}</div>
                <div style={{ fontSize: 15, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FooterCTA heading="Start with one role." />
      <Footer />
    </div>
  );
}
