import type { ReactNode } from "react";
import MarketingShell from "@/components/layout/MarketingShell";
import s from "./demo.module.css";

/** The product tour's pages sit inside the public site: its nav, then the page, then its footer. */
export function DemoShell({ children }: { children: ReactNode }) {
  return (
    <MarketingShell>
      <div className={`${s.page} ${s.container}`}>{children}</div>
    </MarketingShell>
  );
}
