import MarketingShell from "@/components/layout/MarketingShell";
import { SiteClosing, SiteHero } from "@/components/marketing/site/Sections";
import { RELEASES, RELEASES_URL, formatReleaseDate } from "@/components/marketing/site/releases";
import s from "@/components/marketing/site/changelog.module.css";

export const metadata = {
  title: "Changelog",
  description: "Every published release of Fydell Desktop, with what changed.",
  alternates: { canonical: "/changelog" },
};

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <SiteHero
        align="left"
        title={["Changelog"]}
        lead="Published releases of Fydell Desktop. Each one has installers for macOS and Windows."
      />
      <section className={s.wrap} aria-label="Releases">
        <ol className={s.list}>
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
                <a href={`${RELEASES_URL}/tag/v${r.version}`} className={s.link} target="_blank" rel="noreferrer">
                  Installers for {r.version} on GitHub
                </a>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <SiteClosing title="Get the latest version." primary={{ href: "/download", label: "Download Fydell" }} secondary={{ href: "/signup", label: "Sign up" }} />
    </MarketingShell>
  );
}
