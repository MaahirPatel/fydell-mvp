import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Link2, Lock } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import ShareCard from "@/components/candidate/ShareCard";
import { activeShares, initials, loadCandidateOverview, passportBuilt } from "@/lib/candidate/overview";
import type { PassportEvidence } from "@/lib/passport/view";
import e from "@/components/candidate/easy.module.css";

export const metadata = { title: "My passport" };
export const dynamic = "force-dynamic";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function lines(ev: PassportEvidence) {
  return ev.endLine > ev.startLine ? `lines ${ev.startLine}–${ev.endLine}` : `line ${ev.startLine}`;
}

function Cite({ ev }: { ev: PassportEvidence }) {
  const repo = ev.repo.split("/").pop();
  return (
    <a href={ev.sourceUrl} target="_blank" rel="noreferrer noopener" className={e.cite}>
      {repo}/{ev.path}, {lines(ev)}
      <ExternalLink aria-label="(opens GitHub in a new tab)" />
    </a>
  );
}

function Code({ ev }: { ev: PassportEvidence }) {
  if (!ev.excerpt.length) return null;
  return (
    <details className={e.disclosure}>
      <summary>Show the code</summary>
      <pre className={e.code}>
        {ev.excerpt.map((text, i) => (
          <div key={i}>
            <span>{ev.startLine + i}</span>
            {text}
          </div>
        ))}
      </pre>
    </details>
  );
}

export default async function CandidatePassportPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/passport")}`);

  const o = await loadCandidateOverview(user);
  if (!passportBuilt(o.passport) || !o.passport) redirect("/app/candidate/passport/build");

  const passport = o.passport;
  const projects = passport.projects.filter((p) => p.status !== "stale");
  const evidence = projects.flatMap((p) => p.evidence);
  const byId = new Map(evidence.map((ev) => [ev.id, ev]));
  const on = activeShares(o.shares);
  const skipped = projects.reduce((n, p) => n + p.coverage.skippedFiles, 0);
  const readOn = passport.updatedAt
    ? new Date(passport.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  // Group findings under the plain summary when there is one; otherwise list
  // each finding on its own. Either way every claim carries its citation.
  const groups = passport.capabilities.capabilities.length
    ? passport.capabilities.capabilities
        .map((c) => ({ title: c.statement, items: c.evidenceIds.map((id) => byId.get(id)).filter((x): x is PassportEvidence => Boolean(x)) }))
        .filter((g) => g.items.length > 0)
    : evidence.map((ev) => ({ title: ev.finding, items: [ev] }));

  return (
    <CandidateShell width="wide" current="passport" userName={o.name}>
      <div className={e.ppLayout}>
        <div className={e.ppMain}>
          <section className={e.ppHead} aria-label="Passport owner">
            <span aria-hidden className={e.avatar}>
              {initials(o.name)}
            </span>
            <div className={e.ppWho}>
              <h1 className={e.ppName}>{passport.displayName || o.name}</h1>
              <div className={e.ppMeta}>
                <span>Engineering passport</span>
                <span aria-hidden>·</span>
                {on.length ? (
                  <strong>
                    <Link2 aria-hidden />
                    Shared with {on.length} employer{on.length === 1 ? "" : "s"}
                  </strong>
                ) : (
                  <strong>
                    <Lock aria-hidden />
                    Private: only you can see it
                  </strong>
                )}
              </div>
            </div>
            <div className={e.row}>
              <Link href="/app/candidate/passport/build" className={cx(e.btn, e.btnSmall)}>
                Edit
              </Link>
              <a href="#share" className={cx(e.btn, e.btnSmall, e.btnPrimary)}>
                Share my passport
              </a>
            </div>
          </section>

          <section className={e.section} aria-labelledby="found-title">
            <div className={e.h2Row}>
              <h2 id="found-title" className={e.h2}>
                What we found in your code
              </h2>
              <span className={e.h2Note}>
                From {projects.length} project{projects.length === 1 ? "" : "s"}
                {readOn ? ` · read on ${readOn}` : ""}
              </span>
            </div>
            {groups.map((g) => (
              <article key={g.title} className={cx(e.card, e.cardTight)}>
                <div className={e.cardTop} style={{ alignItems: "flex-start" }}>
                  <h3 className={e.h3}>{g.title}</h3>
                  <span className={cx(e.badge, e.badgeBlue)}>Code we read</span>
                </div>
                {g.items.map((ev) => (
                  <div key={ev.id} className={e.cites}>
                    {g.items.length > 1 || g.title !== ev.finding ? <p className={e.body}>{ev.finding}</p> : null}
                    <Cite ev={ev} />
                    <Code ev={ev} />
                  </div>
                ))}
              </article>
            ))}
          </section>

          {o.done.length ? (
            <section className={e.section} aria-labelledby="sims-title">
              <h2 id="sims-title" className={e.h2}>
                Simulations you sent
              </h2>
              {o.done.map((item) => (
                <article key={item.id} className={cx(e.card, e.cardTight)}>
                  <div className={e.cardTop}>
                    <h3 className={e.h3}>{item.title}</h3>
                    <span className={cx(e.badge, e.badgeGreen)}>{item.status}</span>
                  </div>
                  <p className={e.small}>{[item.from, item.when, item.receipt ? `Receipt ${item.receipt}` : null].filter(Boolean).join(" · ")}</p>
                </article>
              ))}
            </section>
          ) : null}

          <section className={cx(e.card, e.cardTight)} aria-labelledby="limits-title">
            <h2 id="limits-title" className={e.h3}>
              What we could not check
            </h2>
            <ul className={e.bullets}>
              <li>We did not run the code in your projects. We only read it.</li>
              <li>A project being on your account does not prove you wrote every line. Your own words about what you built are shown as yours.</li>
              {skipped > 0 ? (
                <li>
                  We skipped {skipped} file{skipped === 1 ? "" : "s"} that {skipped === 1 ? "was" : "were"} very large or not code.
                </li>
              ) : null}
              {projects.flatMap((p) => p.notices.map((n) => <li key={`${p.repoFullName}-${n}`}>{n}</li>))}
            </ul>
          </section>
        </div>

        <aside className={e.ppSide}>
          <section className={cx(e.card, e.cardTight)} aria-labelledby="labels-title">
            <h2 id="labels-title" className={e.h3}>
              What the labels mean
            </h2>
            <div className={e.labels}>
              <div className={e.labelRow}>
                <span className={cx(e.badge, e.badgeBlue)}>Code we read</span>
                <span>We read the files and point to the exact lines. Anyone can check them.</span>
              </div>
              <div className={e.labelRow}>
                <span className={cx(e.badge, e.badgeGreen)}>Sent to the hiring team</span>
                <span>A simulation you finished. The employer who invited you reviews it.</span>
              </div>
              <div className={e.labelRow}>
                <span className={e.badge}>Your own words</span>
                <span>What you wrote about a project. Shown as yours, never as a finding.</span>
              </div>
            </div>
          </section>

          <ShareCard initialShares={o.shares} />

          <section className={cx(e.card, e.cardTight)} aria-labelledby="projects-title">
            <h2 id="projects-title" className={e.h3}>
              Projects we read
            </h2>
            <ul className={e.projects}>
              {projects.map((p) => (
                <li key={p.repoFullName}>
                  <span className={e.mono}>{p.repoFullName}</span>
                  <span className={e.small}>
                    {[p.primaryLanguage, `${p.coverage.analyzedFiles} of ${p.coverage.totalFiles} files read`].filter(Boolean).join(" · ")}
                  </span>
                  {p.contributionStatement ? <p className={e.quote}>Your own words: “{p.contributionStatement}”</p> : null}
                </li>
              ))}
            </ul>
            <Link href="/app/candidate/profile" className={e.link}>
              More settings: accounts and editor history
            </Link>
          </section>
        </aside>
      </div>
    </CandidateShell>
  );
}
