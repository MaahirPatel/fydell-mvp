import MarketingShell from "@/components/layout/MarketingShell";
import { SiteClosing, SiteHero } from "@/components/marketing/site/Sections";
import { RELEASES, formatReleaseDate } from "@/components/marketing/site/releases";
import s from "@/components/marketing/site/changelog.module.css";

export const metadata = {
  title: "Changelog",
  description: "What changed in Fydell, newest first.",
  alternates: { canonical: "/changelog" },
};

const APP_RELEASE = {
  date: "2026-10-09",
  title: "The desktop app moves to the Microsoft Store",
  notes: [
    "The Windows desktop app is coming back through the Microsoft Store, which signs it so Windows installs it without a security warning. The download page links to it once it is listed.",
    "The Store version shows your name and profile at the bottom of the sidebar, and takes its updates from the Store.",
    "Until it is listed, invited simulations work in the browser at fydell.com, with the same inbox, tasks, reports and profile.",
  ],
};

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <SiteHero align="left" title={["Changelog"]} lead="What changed in Fydell, newest first. Numbered entries are desktop app releases." />
      <section className={s.wrap} aria-label="Releases">
        <ol className={s.list}>
          <li className={s.entry} id="app">
            <div className={s.meta}>
              <p className={s.version}>App</p>
              <p className={s.date}>
                <time dateTime={APP_RELEASE.date}>{formatReleaseDate(APP_RELEASE.date)}</time>
              </p>
            </div>
            <div>
              <h2 className={s.title}>{APP_RELEASE.title}</h2>
              <ul className={s.notes}>
                {APP_RELEASE.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </li>
          {RELEASES.map((r) => (
            <li key={r.version} className={s.entry} id={`v${r.version}`}>
              <div className={s.meta}>
                <p className={s.version}>{r.version}</p>
                <p className={s.date}>
                  <time dateTime={r.date}>{formatReleaseDate(r.date)}</time>
                </p>
              </div>
              <div>
                <h2 className={s.title}>{r.title}</h2>
                <ul className={s.notes}>
                  {r.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <SiteClosing title="Get the desktop app." primary={{ href: "/download", label: "Download" }} secondary={{ href: "/signup", label: "Sign up" }} />
    </MarketingShell>
  );
}
