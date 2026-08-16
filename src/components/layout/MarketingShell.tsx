import LenisProvider from "@/components/layout/LenisProvider";
import AmbientBackground from "@/components/layout/AmbientBackground";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";

/**
 * Shared shell for all marketing pages: smooth scroll, ambient background,
 * fixed top nav (56px), and the site footer. Page heroes should clear the
 * fixed nav with ~150–210px top padding (see PageHero / homepage).
 */
export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <div className="fydell-page relative min-h-screen overflow-x-clip">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AmbientBackground />
        <SiteNav />
        {/*
          AmbientBackground is fixed and paints an opaque canvas. A positioned
          element paints above non-positioned ones no matter where it sits in
          the DOM, so anything sharing this canvas has to be lifted explicitly.
          Only <main> used to be, which left the footer rendered at full size
          and full opacity underneath a black rectangle. Lifting the whole
          content column means a new sibling cannot reintroduce that.
        */}
        <div className="relative z-10">
          <main id="main">{children}</main>
          <SiteFooter />
        </div>
      </div>
    </LenisProvider>
  );
}
