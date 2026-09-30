import type { CSSProperties } from "react";
import s from "../site.module.css";
import Reveal from "../Reveal";
import { ButtonLink, CheckItem, ClosingCTA, FAQ, PageHero, Section, SectionHead, cx } from "../primitives";
import { PRICING, planSignupHref, usd } from "@/lib/marketing/pricing";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

const PLANS = [
  {
    name: "Engineers",
    price: "Free",
    per: "",
    unit: "Build and share your passport. Take simulations you are invited to.",
    features: ["Passport from your public repositories", "Findings linked to exact lines", "Share links you can revoke", "Invited simulations"],
    cta: { label: "Build your passport", href: "/passport/new" },
  },
  {
    name: "Starter",
    price: usd(PRICING.starterPerSimulation),
    per: "per completed simulation",
    unit: "No monthly fee. Pay only when a candidate finishes.",
    features: ["Unlimited roles and reviewers", "Python backend incidents", "Cited reports and decisions", "Hidden checks on every submission"],
    cta: { label: "Start on Starter", href: planSignupHref("starter") },
  },
  {
    name: "Team",
    price: usd(PRICING.teamMonthly),
    per: "per month",
    unit: `${PRICING.teamIncluded} completed simulations included, then ${usd(PRICING.teamOverage)} each.`,
    features: ["Everything in Starter", `${PRICING.teamIncluded} simulations each month`, "Priority support", "Onboarding call for your first role"],
    cta: { label: "Start on Team", href: planSignupHref("team") },
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: "",
    unit: `For ${PRICING.enterpriseFrom} or more completed simulations a month.`,
    features: ["Everything in Team", "Volume pricing", "Security review", "Invoiced billing"],
    cta: { label: "Talk to us", href: "/contact" },
  },
];

const ROWS: [string, string, string, string, string][] = [
  ["Completed simulations", "Invited only", `${usd(PRICING.starterPerSimulation)} each`, `${PRICING.teamIncluded} a month, then ${usd(PRICING.teamOverage)} each`, "Volume pricing"],
  ["Roles and reviewers", "Not applicable", "Unlimited", "Unlimited", "Unlimited"],
  ["Cited reports", "Not applicable", "Included", "Included", "Included"],
  ["Engineering Passport", "Included", "View shared passports", "View shared passports", "View shared passports"],
  ["Support", "Email", "Email", "Priority", "Priority"],
  ["Billing", "Never billed", "Card, monthly", "Card, monthly", "Invoice"],
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        title="Pay per completed simulation"
        lead="Free for engineers. Hiring teams pay only when a candidate finishes a simulation. Invitations, expired links and runs that fail on our side are never billed."
      />

      <Section tight>
        <Reveal className={s.plans}>
          {PLANS.map((p, n) => (
            <div key={p.name} className={cx(s.plan, p.featured && s.planFeatured)} data-r="" style={i(n)}>
              <h2 className={s.planName}>{p.name}</h2>
              <p className={s.price}>
                <b>{p.price}</b>
                {p.per ? <span>{p.per}</span> : null}
              </p>
              <p className={s.planUnit}>{p.unit}</p>
              <ul className={s.checkList}>
                {p.features.map((f) => (
                  <CheckItem key={f}>{f}</CheckItem>
                ))}
              </ul>
              <div className={s.planCta}>
                <ButtonLink href={p.cta.href} variant={p.featured ? "primary" : "secondary"}>
                  {p.cta.label}
                </ButtonLink>
              </div>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section>
        <SectionHead
          title="Never billed"
          lead="You are charged when a candidate completes a simulation and hidden checks run on their submission. Everything else is free."
        />
        <Reveal className={`${s.headToVisual} ${s.grid3}`}>
          {[
            ["Invitations", "Sending, resending or revoking an invitation costs nothing."],
            ["Expired or unused links", "A candidate who never starts, or whose link expires, is never billed."],
            ["Abandoned attempts", "If a candidate stops before submitting, you pay nothing."],
            ["Failures on our side", "If provisioning or the check sandbox fails, the run is not billed."],
            ["Reviewers", "Add as many teammates to review and write reports as you need."],
            ["Engineers", "Passports and invited simulations are always free for engineers."],
          ].map(([t, b], n) => (
            <div key={t} className={s.card} data-r="" style={i(n)}>
              <h3 className={s.h3}>{t}</h3>
              <p className={s.body} style={{ marginTop: 8 }}>
                {b}
              </p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section>
        <SectionHead title="Compare plans" />
        <Reveal className={`${s.headToVisual} ${s.tableWrap}`}>
          <table className={s.table} data-r="">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Feature</span>
                </th>
                {["Engineers", "Starter", "Team", "Enterprise"].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, ...vals]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {vals.map((v, n) => (
                    <td key={n}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <Section>
        <SectionHead title="Billing questions" />
        <div className={s.headToVisual}>
          <FAQ
            items={[
              { q: "Is there a free trial?", a: "There is no separate trial. Starter has no monthly fee, so you pay only when a candidate completes a simulation." },
              { q: "What counts as completed?", a: "The candidate submitted, the snapshot was sealed, and hidden checks ran on it." },
              { q: "Can I change plans?", a: "Yes. Switch from your billing settings; the new plan starts on your next cycle." },
              { q: "Is there a contract?", a: "No. Starter and Team are month to month. Cancel from your settings." },
              { q: "How do you bill?", a: "Through Stripe, by card. Enterprise can pay by invoice." },
              { q: "Do engineers ever pay?", a: "No. The passport and invited simulations are free for engineers." },
            ]}
          />
        </div>
      </Section>

      <ClosingCTA
        title="Start with one role"
        lead={`No monthly fee on Starter. ${usd(PRICING.starterPerSimulation)} when a candidate completes a simulation, nothing otherwise.`}
        primary={{ href: planSignupHref("starter"), label: "Start hiring" }}
        secondary={{ href: "/contact", label: "Talk to us" }}
      />
    </>
  );
}
