import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { Arrow, Availability, SiteHero } from "@/components/marketing/site/Sections";
import { PRODUCTS, PRODUCT_SLUGS } from "@/components/marketing/site/products";
import s from "@/components/marketing/site/site.module.css";

export const metadata = {
  title: "Product",
  description: "Builder Profiles, the Engineering Passport, Builder Reports, the Hiring Workspace, Simulations and Fydell Desktop.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <MarketingShell>
      <SiteHero title={["The Fydell platform"]} lead="Everything an engineer needs to present their work, and everything a hiring team needs to review it." />
      <section className={s.section} aria-label="Products">
        <div className={s.container}>
          <ul className={s.related}>
            {PRODUCT_SLUGS.map((slug) => {
              const page = PRODUCTS[slug];
              return (
                <li key={slug}>
                  <Link href={`/products/${slug}`} className={s.relatedLink}>
                    <span className={s.relatedName}>
                      {page.name} <Arrow />
                    </span>
                    <span className={s.relatedBody}>{page.lead}</span>
                    <Availability state={page.availability.state}>{page.availability.text}</Availability>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <div className="h-32" />
    </MarketingShell>
  );
}
