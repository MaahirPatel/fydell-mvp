import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Clock3, Eye, FileCode2, Link2, Lock, Terminal } from "lucide-react";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import { Arrow, Availability } from "./Sections";
import { PRODUCTS, PRODUCT_SLUGS, type ProductSlug } from "./products";
import type { Tint } from "./TintStage";
import s from "./product-cards.module.css";

export const PRODUCT_TINT: Record<ProductSlug, Tint> = {
  "builder-profiles": "teal",
  "engineering-passport": "violet",
  "builder-reports": "teal",
  "hiring-workspace": "violet",
  simulations: "blue",
  desktop: "warm",
};

function Profiles() {
  return (
    <div className={s.panel}>
      <p className={s.row}>
        <span className={s.strong}>Webhook relay</span>
        <span className={s.badge}>Featured</span>
      </p>
      <p className={s.dim}>Your part: delivery, retries and their tests.</p>
      <p className={`${s.row} ${s.sep}`}>
        <span className={s.strong}>ledger-export</span>
        <span className={s.badge} data-tone="muted">
          <Lock size={10} aria-hidden /> Private
        </span>
      </p>
      <p className={s.dim}>Uploaded source. 2 findings.</p>
    </div>
  );
}

function Passport() {
  return (
    <div className={s.panel}>
      <p className={s.row}>
        <span className={s.strong}>Share with one recipient</span>
        <Link2 size={13} aria-hidden className={s.dimIcon} />
      </p>
      <ul className={s.ticks}>
        <li>
          <span className={s.tick} data-on>
            <Check size={10} aria-hidden />
          </span>
          Webhook relay <span className={s.mono}>@ 4f2c9a1</span>
        </li>
        <li>
          <span className={s.tick} />
          ledger-export
        </li>
      </ul>
      <p className={`${s.row} ${s.sep}`}>
        <span className={s.dim}>Expires in 30 days</span>
        <span className={s.dim}>Revocable</span>
      </p>
    </div>
  );
}

function Reports() {
  return (
    <div className={s.panel}>
      <p className={s.row}>
        <span className={s.mono}>
          <FileCode2 size={12} aria-hidden /> retry.ts:12-27
        </span>
        <span className={s.badge} data-tone="observed">
          Observed
        </span>
      </p>
      <p className={s.body}>Delivery stops after five attempts.</p>
      <p className={`${s.dim} ${s.sep}`}>38 of 46 files read. Tests read, not run.</p>
    </div>
  );
}

function Hiring() {
  return (
    <div className={s.panel}>
      {[
        ["Candidate 01", "In review", "pending"],
        ["Candidate 02", "New", "muted"],
        ["Candidate 03", "Question sent", "attention"],
      ].map(([name, state, tone], i) => (
        <p key={name} className={`${s.row} ${i ? s.sep : ""}`}>
          <span className={s.strong}>{name}</span>
          <span className={s.badge} data-tone={tone}>
            {state}
          </span>
        </p>
      ))}
    </div>
  );
}

function Sims() {
  return (
    <div className={s.panel}>
      <p className={s.row}>
        <span className={s.strong}>Webhook retry incident</span>
        <span className={s.dim}>
          <Clock3 size={11} aria-hidden /> {SCENARIO.defaultAllowedMinutes} min
        </span>
      </p>
      <p className={s.dim}>Backend, Python. Brief, codebase, team thread.</p>
      <p className={`${s.row} ${s.sep}`}>
        <span className={s.mono}>Public tests</span>
        <span className={s.badge} data-tone="success">
          4 of 4 passed
        </span>
      </p>
    </div>
  );
}

function Desktop() {
  return (
    <div className={s.panel}>
      <p className={s.row}>
        <span className={s.dots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className={s.dim}>Fydell Desktop</span>
      </p>
      <p className={`${s.mono} ${s.sep}`}>
        <Terminal size={11} aria-hidden /> python3 -m unittest -v
      </p>
      <p className={s.row}>
        <span className={s.dim}>
          <Eye size={11} aria-hidden /> Brief, tests and thread beside the code
        </span>
      </p>
    </div>
  );
}

const VIGNETTE: Record<ProductSlug, () => ReactNode> = {
  "builder-profiles": Profiles,
  "engineering-passport": Passport,
  "builder-reports": Reports,
  "hiring-workspace": Hiring,
  simulations: Sims,
  desktop: Desktop,
};

/** The product index: numbered cards, a small example view on a tint, then the name and what it does. */
export default function ProductCards() {
  return (
    <ul className={s.grid}>
      {PRODUCT_SLUGS.map((slug, i) => {
        const page = PRODUCTS[slug];
        const Vignette = VIGNETTE[slug];
        return (
          <li key={slug}>
            <Link href={`/products/${slug}`} className={s.card}>
              <div className={s.field} data-tint={PRODUCT_TINT[slug]} aria-hidden>
                <span className={s.example}>Example data</span>
                <Vignette />
              </div>
              <div className={s.text}>
                <span className={s.num}>{String(i + 1).padStart(2, "0")}</span>
                <span className={s.name}>
                  {page.name} <Arrow />
                </span>
                <span className={s.lead}>{page.lead}</span>
                <Availability state={page.availability.state}>{page.availability.text}</Availability>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
