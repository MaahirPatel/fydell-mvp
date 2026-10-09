import Image from "next/image";
import Link from "next/link";
import { hasPainting } from "./PaintedStage";
import RevealObserver from "./RevealObserver";
import s from "./home.module.css";

/** The desktop app on a painted ground. */
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
              <p className={s.desktopBody}>A separate Windows app for taking the simulations you are invited to. From the Microsoft Store, so it installs with no security warning.</p>
              <div className={s.desktopCtas}>
                <Link href="/download" className="l-btn l-btn-lg l-btn-solid">
                  Get the desktop app
                </Link>
              </div>
              <p className={s.desktopMeta}>
                Windows 10 and 11 · <Link href="/changelog">Changelog</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
