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
  title: "Install Fydell from your browser",
  notes: [
    "Fydell now installs from Microsoft Edge, Google Chrome or Safari and opens in its own window, with no installer and no security warning.",
    "The separate desktop app is retired. Engineering tasks run in the browser editor, or in VS Code or Cursor with the downloadable starter project.",
    "Updates reach the app automatically.",
  ],
};

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <SiteHero align="left" title={["Changelog"]} lead="What changed in Fydell, newest first. Entries before October 2026 describe the retired desktop app." />
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
      <SiteClosing title="Always the latest version." primary={{ href: "/download", label: "Install the app" }} secondary={{ href: "/signup", label: "Sign up" }} />
    </MarketingShell>
  );
}
