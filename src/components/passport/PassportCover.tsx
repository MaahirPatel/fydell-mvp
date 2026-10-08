import type { ReactNode } from "react";
import FydellLogo from "@/components/brand/FydellLogo";
import type { PassportData } from "@/lib/passport/view";
import s from "./passport-cover.module.css";

/*
 * The Passport as a document: holder, focus, coverage and the cited files,
 * with a machine-readable strip encoding the same facts. Every value on the
 * card is computed from the passport data; nothing here is a score.
 */

const MRZ_LEN = 44;
const RINGS = Array.from({ length: 14 }, (_, i) => 30 + i * 22);
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

function mrzPart(value: string) {
  return value
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "<")
    .replace(/^<+|<+$/g, "");
}

function mrzLine(value: string) {
  return value.padEnd(MRZ_LEN, "<").slice(0, MRZ_LEN);
}

function pad2(n: number) {
  return String(Math.min(n, 99)).padStart(2, "0");
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function basename(path: string) {
  return path.split("/").pop() ?? path;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Passport-style date, e.g. 28 SEP 2026, in UTC so server and client agree. */
function formatDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function PassportCover({
  passport,
  badge,
  nameAs: Name = "h2",
  className = "",
}: {
  passport: PassportData;
  badge?: ReactNode;
  nameAs?: "h1" | "h2" | "p";
  className?: string;
}) {
  const name = passport.displayName || passport.githubLogin || "Your passport";
  const evidence = passport.projects.flatMap((p) => p.evidence);
  const limits = evidence.reduce((n, e) => n + e.limitations.length, 0);
  const counted = passport.projects.filter((p) => p.coverage.totalFiles > 0);
  const read = counted.reduce((n, p) => n + p.coverage.analyzedFiles, 0);
  const total = counted.reduce((n, p) => n + p.coverage.totalFiles, 0);
  const languages = Array.from(
    new Set(passport.projects.flatMap((p) => (p.coverage.languages.length ? p.coverage.languages : p.primaryLanguage ? [p.primaryLanguage] : []))),
  );
  const updated = formatDate(passport.updatedAt);
  const first = passport.projects[0];
  const projects = passport.projects.length;

  const mrz1 = mrzLine(`P<FYDELL<${mrzPart(name)}`);
  const mrz2 = mrzLine(
    [first ? mrzPart(first.repoFullName.split("/").pop() ?? "") : "NO<PROJECTS", first?.commitSha ? first.commitSha.slice(0, 7).toUpperCase() : "", `${pad2(evidence.length)}F<${pad2(limits)}L`]
      .filter(Boolean)
      .join("<<"),
  );

  return (
    <div className={`${s.wrap} ${className}`}>
      <div className={s.card}>
        <svg aria-hidden viewBox="0 0 640 420" preserveAspectRatio="xMaxYMid slice" className={s.guilloche}>
          <g fill="none" stroke="#2c3a8f" strokeOpacity="0.07" strokeWidth="0.8">
            {RINGS.map((r) => (
              <circle key={r} cx="478" cy="196" r={r} />
            ))}
          </g>
          <g fill="none" stroke="#b5307a" strokeOpacity="0.06" strokeWidth="0.8">
            {RINGS.map((r) => (
              <circle key={r} cx="552" cy="196" r={r} />
            ))}
          </g>
        </svg>
        <div aria-hidden className={s.sheen} />

        <div className={s.top}>
          <FydellLogo height={18} />
          <div className={s.topRight}>
            <span className={s.kind}>Engineering Passport</span>
            {badge}
          </div>
        </div>

        <div className={s.body}>
          <div aria-hidden className={s.monogram}>
            <svg viewBox="0 0 112 140" className={s.monoRings}>
              <g fill="none" strokeWidth="7" strokeOpacity="0.22">
                <circle cx="44" cy="104" r="30" stroke="#2dd4bf" />
                <circle cx="72" cy="104" r="30" stroke="#a855f7" />
              </g>
            </svg>
            <span>{initials(name)}</span>
          </div>

          <dl className={s.fields}>
            <div className={s.holder}>
              <dt>Holder</dt>
              <dd>
                <Name className={s.name}>{name}</Name>
              </dd>
            </div>
            {passport.headline ? (
              <div className={s.wide}>
                <dt>Focus</dt>
                <dd>{passport.headline}</dd>
              </div>
            ) : null}
            <div>
              <dt>Projects</dt>
              <dd>{projects}</dd>
            </div>
            <div>
              <dt>Findings cited</dt>
              <dd>{evidence.length}</dd>
            </div>
            {languages.length ? (
              <div>
                <dt>Languages</dt>
                <dd>{languages.slice(0, 3).join(" · ")}</dd>
              </div>
            ) : null}
            {updated ? (
              <div>
                <dt>Updated</dt>
                <dd className={s.mono}>{updated}</dd>
              </div>
            ) : null}
          </dl>

          {total > 0 ? (
            <div className={s.ring}>
              <svg viewBox="0 0 112 112" role="img" aria-label={`${read} of ${total} files read`}>
                <defs>
                  <linearGradient id="fy-pp-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2dd4bf" />
                    <stop offset="1" stopColor="var(--fy-accent, #5b5bd6)" />
                  </linearGradient>
                </defs>
                <circle cx="56" cy="56" r={RING_R} fill="none" stroke="rgba(27,31,59,0.09)" strokeWidth="7" />
                <circle
                  className={s.ringArc}
                  cx="56"
                  cy="56"
                  r={RING_R}
                  fill="none"
                  stroke="url(#fy-pp-ring)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(read / total) * RING_C} ${RING_C}`}
                  transform="rotate(-90 56 56)"
                />
                <text x="56" y="56" textAnchor="middle" className={s.ringNum}>
                  {read}
                </text>
                <text x="56" y="73" textAnchor="middle" className={s.ringOf}>
                  of {total} files
                </text>
              </svg>
              <span>Read</span>
            </div>
          ) : null}
        </div>

        <div className={s.evidence}>
          <span className={s.label}>Evidence</span>
          {evidence.length === 0 ? <span className={s.chip}>No findings yet</span> : null}
          {evidence.slice(0, 3).map((e) => (
            <span key={e.id} className={`${s.chip} ${s.mono}`}>
              <i aria-hidden />
              {basename(e.path)}:{e.startLine}
            </span>
          ))}
          {limits > 0 ? (
            <span className={`${s.chip} ${s.chipLimit}`}>
              <i aria-hidden />
              {limits} limit{limits === 1 ? "" : "s"} stated
            </span>
          ) : null}
        </div>

        <div aria-hidden className={s.mrz}>
          <div>{mrz1}</div>
          <div>{mrz2}</div>
        </div>
      </div>
    </div>
  );
}
