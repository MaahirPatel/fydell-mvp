import Image from "next/image";
import Link from "next/link";
import DownloadButton from "./DownloadButton";
import { hasPainting } from "./PaintedStage";
import RevealObserver from "./RevealObserver";
import { LATEST } from "./releases";
import s from "./home.module.css";

/** The desktop app on a painted ground, with both installers side by side. */
export default function DesktopBand() {
  const painted = hasPainting("coast");
  return (
    <section id="desktop" aria-labelledby="desktop-title" className={s.section}>
      <RevealObserver />
      <div className={s.container}>
        <div className={s.desktop} data-painted={painted ? undefined : "none"} data-reveal>
          {painted ? <Image src="/marketing/paintings/coast.jpg" alt="" fill sizes="(max-width: 1264px) 100vw, 1200px" className={s.stageImage} /> : null}
          <div className={s.desktopInner}>
            <div className={s.desktopCard}>
              <h2 id="desktop-title" className={s.desktopTitle}>
                Fydell for desktop
              </h2>
              <p className={s.desktopBody}>Take simulations in a native workspace on Windows or macOS.</p>
              <div className={s.desktopCtas}>
                <DownloadButton os="windows" />
                <DownloadButton os="macos" variant="quiet" />
              </div>
              <p className={s.desktopMeta}>
                Version {LATEST.version} · Beta · <Link href="/changelog">Changelog</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
