import LenisProvider from "@/components/layout/LenisProvider";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

export type MarketingTone = "ink" | "light";

/**
 * Shared shell for all marketing pages: smooth scroll, ground, fixed top nav
 * (64px), and the site footer. `light` (paper) is the public site's default;
 * `ink` remains available for a page that needs a dark ground.
 */
export default function MarketingShell({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: MarketingTone;
}) {
  return (
    <LenisProvider>
      <div
        className={`${tone === "ink" ? "theme-ink" : "marketing-theme"} fydell-page relative min-h-screen overflow-x-clip bg-[var(--surface-canvas)]`}
      >
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteNav tone={tone} />
        <div className="relative z-10">
          <main id="main">{children}</main>
          <SiteFooter tone={tone} />
        </div>
      </div>
    </LenisProvider>
  );
}
