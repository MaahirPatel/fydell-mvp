import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DesktopWorkspaceMock from "./DesktopWorkspaceMock";
import { Features } from "./FydellHome";
import s from "./fydell-home.module.css";

/**
 * Dedicated showcase for the Fydell desktop simulation client.
 *
 * The mock below is an illustration of the real Tauri app workspace — file
 * tree, Monaco editor, recorded test runs, disclosure strip. Content mirrors
 * the Northbeam Logistics scenario package; it is labeled an illustration,
 * not a screenshot.
 *
 * There is no download button here because installers are not yet published
 * to a public URL (UX-04: every visible control must work). The CTA routes to
 * /download, which states the release status honestly and links to the real
 * GitHub Releases page.
 */
export function DesktopShowcase() {
  return (
    <div>
      <div className={s.mockStage}>
        <DesktopWorkspaceMock />
      </div>
      <p className={s.mockCaption}>
        Illustration of the desktop workspace — file tree, editor, and recorded
        test runs. Not a screenshot; installers publish with v0.1.0.
      </p>
      <Features
        dot="var(--brand-teal)"
        items={[
          "Real editor, local execution",
          "Recorded test runs",
          "Atomic submit",
          "Disclosed telemetry",
          "Native installers for Windows, macOS, Linux",
        ]}
      />
      <div className={s.heroActions} style={{ marginTop: "var(--space-5)" }}>
        <Link href="/download" className={s.btnSolid}>
          Get the desktop app <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="/demo" className={s.btnGhost}>
          Try the web demo
        </Link>
      </div>
    </div>
  );
}
