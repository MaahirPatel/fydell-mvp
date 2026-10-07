import Link from "next/link";
import { Arrow } from "./Sections";
import { BUILDS, LATEST, formatReleaseDate } from "./releases";
import s from "./site.module.css";

/** The latest desktop release: version, date, what changed, and which builds exist. */
export default function ReleasePanel() {
  return (
    <div className={s.release}>
      <div className={s.releaseFacts}>
        <p className={s.releaseVersion}>Fydell Desktop {LATEST.version}</p>
        <p className={s.releaseMeta}>Released {formatReleaseDate(LATEST.date)} · Beta, unsigned test builds</p>
        <ul className={s.releaseNotes}>
          {LATEST.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <Link href="/changelog" className={s.textLink}>
          All releases <Arrow />
        </Link>
      </div>
      <dl className={s.releaseBuilds}>
        {Object.values(BUILDS).map((b) => (
          <div key={b.name} className={s.releaseBuild}>
            <dt>{b.name}</dt>
            <dd>
              {b.arch}. {[b.primary, ...b.others].map((x) => x.note.split(",")[0]).join(", ")}.
            </dd>
          </div>
        ))}
        <div className={s.releaseBuild}>
          <dt>Browser</dt>
          <dd>Everything works without the app, in any current browser.</dd>
        </div>
      </dl>
    </div>
  );
}
