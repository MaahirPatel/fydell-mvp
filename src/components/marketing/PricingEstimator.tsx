"use client";

import { useState } from "react";
import Link from "next/link";
import s from "@/components/marketing/home/fydell-home.module.css";
import { PRICING, planSignupHref, recommendedPlan, starterCost, teamCost, usd } from "@/lib/marketing/pricing";

const MAX = 60;
const PRESETS = [
  { label: "1 role", value: 4 },
  { label: "A few roles", value: 12 },
  { label: "Scaling team", value: 30 },
  { label: "High volume", value: 55 },
] as const;

export default function PricingEstimator() {
  const [volume, setVolume] = useState(12);
  const plan = recommendedPlan(volume);
  const starter = starterCost(volume);
  const team = teamCost(volume);

  return (
    <div className={s.estimator}>
      <div>
        <label htmlFor="volume" className="text-[14px] text-[var(--text-secondary)]">
          Completed simulations per month
        </label>
        <p className={`${s.volume} mt-3`} aria-hidden>
          {volume}
          {volume >= MAX ? "+" : ""}
        </p>
        <input
          id="volume"
          type="range"
          min={1}
          max={MAX}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className={s.range}
          aria-valuetext={`${volume} completed simulations per month`}
        />
        <div className={`${s.rangeScale} relative h-4`} aria-hidden>
          {[1, PRICING.teamIncluded, 30, PRICING.enterpriseFrom, MAX].map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2"
              style={{ left: `calc(${((tick - 1) / (MAX - 1)) * 100}% + ${8 - ((tick - 1) / (MAX - 1)) * 16}px)` }}
            >
              {tick === MAX ? `${MAX}+` : tick}
            </span>
          ))}
        </div>
        <div className={s.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setVolume(p.value)}
              aria-pressed={volume === p.value}
              className={`${s.control} ${volume === p.value ? s.presetOn : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-6 max-w-[48ch] text-[13px] leading-[1.55] text-[var(--text-tertiary)]">
          Count one completed simulation for each candidate who submits. Invitations that are not completed
          are never billed.
        </p>
      </div>

      <div aria-live="polite">
        <p className="text-[14px] text-[var(--text-secondary)]">Estimated monthly cost</p>
        <div className="mt-3">
          <p className={`${s.quote} ${plan === "starter" ? s.quoteBest : ""}`}>
            <span>Starter</span>
            <b>{usd(starter)}</b>
          </p>
          <p className={`${s.quote} ${plan === "team" ? s.quoteBest : ""}`}>
            <span>Team</span>
            <b>{usd(team)}</b>
          </p>
          <p className={`${s.quote} ${plan === "enterprise" ? s.quoteBest : ""}`}>
            <span>Enterprise</span>
            <b>Custom</b>
          </p>
        </div>
        <p className="mt-5 text-[13.5px] leading-[1.55] text-[var(--text-secondary)]">
          {plan === "enterprise"
            ? `At ${PRICING.enterpriseFrom}+ completed simulations a month, volume pricing beats both published plans.`
            : plan === "team"
              ? `Team saves ${usd(starter - team)} a month at this volume.`
              : `Below ${PRICING.teamIncluded} a month, paying per simulation is cheapest.`}
        </p>
        <div className="mt-6">
          <Link
            href={plan === "enterprise" ? "/contact" : planSignupHref(plan)}
            className={s.btnSolid}
          >
            {plan === "enterprise" ? "Talk to us" : `Start on ${plan === "team" ? "Team" : "Starter"}`}
          </Link>
        </div>
      </div>
    </div>
  );
}
