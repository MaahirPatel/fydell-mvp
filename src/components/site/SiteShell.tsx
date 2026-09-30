import type { ReactNode } from "react";
import "@/styles/site-motion.css";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";
import s from "./site.module.css";

/**
 * The public-site frame: nav, main, footer on the light canvas. The inline
 * script marks the document as script-capable before first paint, which is
 * what arms the entrance animations; without it every element stays visible.
 */
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.page}>
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('fy-js')" }} />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
