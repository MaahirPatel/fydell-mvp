import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import s from "./demo.module.css";

/** The demo's light pages: one header, then the page. */
export function DemoShell({ children }: { children: ReactNode }) {
  return (
    <div className={`site-linear fydell-page ${s.page}`}>
      <header className={s.bar}>
        <div className={`${s.container} ${s.barInner}`}>
          <Link href="/" aria-label="Fydell home" className={s.logoLink}>
            <FydellLogo height={20} />
          </Link>
          <span className={s.demoLabel}>Demo</span>
          <div className={s.barEnd}>
            <Link href="/contact" className={s.barLink}>
              Book a demo
            </Link>
            <Link href="/" className="l-btn l-btn-ghost">
              Back to site
              <ArrowUpRight size={13} aria-hidden />
            </Link>
          </div>
        </div>
      </header>
      <main id="main" className={s.container}>
        {children}
      </main>
    </div>
  );
}
