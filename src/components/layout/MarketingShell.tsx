import LenisProvider from "@/components/layout/LenisProvider";
import AmbientBackground from "@/components/layout/AmbientBackground";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

/**
 * Shared shell for all marketing pages: smooth scroll, ambient background,
 * fixed top nav (76px), and the site footer. Page bodies render inside <main>.
 * The first section of a page should add its own top padding (e.g. pt-[120px])
 * so the hero clears the fixed nav.
 */
export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <div className="fydell-page relative min-h-screen overflow-x-hidden">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AmbientBackground />
        <SiteNav />
        <main id="main" className="relative z-10">
          {children}
        </main>
        <SiteFooter />
      </div>
    </LenisProvider>
  );
}
