import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DesktopWorkspaceMock from "./DesktopWorkspaceMock";
import { Features } from "./FydellHome";
import s from "./fydell-home.module.css";

/**
 * Dedicated showcase for the Fydell desktop simulation client.
 *
 * The mock below is a coded rendering of the real Tauri app workspace —
 * file tree, Monaco editor, recorded test runs, disclosure strip. Content
 * mirrors the Northbeam Logistics scenario package. No download button is
 * shown because installers are not yet published to a public URL (UX-04:
 * every visible control must work); the CTA routes to /contact.
 */
export function DesktopShowcase() {
  return (
    <div>
      <div className={s.mockStage}>
        <DesktopWorkspaceMock />
      </div>
      <Features
        dot="var(--brand-teal)"
        items={[
          "Real editor, local execution",
          "Recorded test runs",
          "Atomic submit",
          "Disclosed telemetry",
          "Linux installers (.deb, .rpm, .AppImage)",
        ]}
      />
      <div className={s.heroActions} style={{ marginTop: "var(--space-5)" }}>
        <Link href="/contact" className={s.btnSolid}>
          Get the desktop app <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="/demo" className={s.btnGhost}>
          Try the web demo
        </Link>
      </div>
    </div>
  );
}
