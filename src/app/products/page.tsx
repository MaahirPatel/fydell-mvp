import MarketingShell from "@/components/layout/MarketingShell";
import { SiteHero } from "@/components/marketing/site/Sections";
import ProductCards from "@/components/marketing/site/ProductCards";
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
          <ProductCards />
        </div>
      </section>
      <div className="h-32" />
    </MarketingShell>
  );
}
