import LenisProvider from "@/components/layout/LenisProvider";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

export type MarketingTone = "ink" | "light";

/**
 * Shared shell for every public page: the dark Linear ground, the fixed nav
 * and the footer. `.theme-ink` supplies the dark brand and state tones;
 * `.site-linear` pins neutrals, type and fonts, so the site has one theme.
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
      <div className="theme-ink site-linear fydell-page relative min-h-screen overflow-x-clip">
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
