import LenisProvider from "@/components/layout/LenisProvider";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

export type MarketingTone = "ink" | "light";

/**
 * Shared shell for every public page: the light porcelain ground, the fixed
 * nav and the footer. `.site-linear` sets marketing type and measure on top of
 * the shared palette, so the site, sign-in and the app read as one product.
 * `tone` is accepted for existing call sites and no longer changes the ground.
 */
export default function MarketingShell({
  children,
}: {
  children: React.ReactNode;
  tone?: MarketingTone;
}) {
  return (
    <LenisProvider>
      <div className="site-linear fydell-page relative min-h-screen overflow-x-clip">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteNav />
        <div className="relative z-10">
          <main id="main">{children}</main>
          <SiteFooter />
        </div>
      </div>
    </LenisProvider>
  );
}
