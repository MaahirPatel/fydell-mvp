import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import { Arrow, Availability, SiteClosing, SiteHero } from "@/components/marketing/site/Sections";
import { PRODUCTS, PRODUCT_SLUGS, type ProductSlug } from "@/components/marketing/site/products";
import { PRODUCT_ITEMS } from "@/components/marketing/site/nav-data";
import s from "@/components/marketing/site/site.module.css";

const isSlug = (value: string): value is ProductSlug => (PRODUCT_SLUGS as string[]).includes(value);

export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) return {};
  const page = PRODUCTS[slug];
  return { title: page.name, description: page.lead, alternates: { canonical: `/products/${slug}` } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();
  const page = PRODUCTS[slug];

  return (
    <MarketingShell>
      <SiteHero
        title={page.title}
        lead={page.lead}
        primary={page.primary}
        secondary={page.secondary}
        meta={
          <>
            <span className={s.metaName}>{page.name}</span>
            <Availability state={page.availability.state}>{page.availability.text}</Availability>
          </>
        }
      >
        {page.visual}
      </SiteHero>

      <section className={s.section} aria-labelledby="details-title">
        <div className={s.container}>
          <h2 id="details-title" className="sr-only">
            What {page.name} does
          </h2>
          <dl className={s.points}>
            {page.sections.map((item) => (
              <div key={item.title}>
                <dt>{item.title}</dt>
                <dd>{item.body}</dd>
              </div>
            ))}
          </dl>
          <div className={s.limitsRow}>
            <p className={s.limitsHeading}>What it doesn&apos;t do</p>
            <ul className={s.limitsList}>
              {page.limits.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="related-title">
        <div className={s.container}>
          <h2 id="related-title" className={s.h3}>
            Related
          </h2>
          <ul className={s.related}>
            {page.related.map((key) => {
              const item = PRODUCT_ITEMS.find((p) => p.href === `/products/${key}`);
              if (!item) return null;
              return (
                <li key={key}>
                  <Link href={item.href} className={s.relatedLink}>
                    <span className={s.relatedName}>
                      {item.label} <Arrow />
                    </span>
                    <span className={s.relatedBody}>{item.description}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <SiteClosing title="Start with your own work." body="Free for engineers. Hiring teams can start with one role." primary={{ href: "/signup", label: "Sign up" }} secondary={{ href: "/contact", label: "Contact sales" }} />
    </MarketingShell>
  );
}
