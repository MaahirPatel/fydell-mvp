import type { ReactNode } from "react";
import Link from "next/link";
import s from "../site.module.css";
import d from "./design.module.css";
import { Container, Stage } from "../primitives";
import { AttemptReview, DesktopProvisioning, DesktopSignIn, EmployerHomeEmpty, ReportEditor, RoleDetail } from "../visuals/app";
import HeroWorkspace from "../visuals/HeroWorkspace";
import { ConsentScreen, PassportBuilderMock, Receipt } from "../visuals/panels";

function Comp({ n, title, note, children }: { n: string; title: string; note: string; children: ReactNode }) {
  return (
    <section className={d.comp} aria-label={title}>
      <div className={d.compHead}>
        <span className={d.meta}>{n}</span>
        <h3>{title}</h3>
        <span>{note}</span>
      </div>
      {children}
    </section>
  );
}

export default function AppCompsPage() {
  return (
    <section className={s.hero} style={{ paddingBottom: 168 }}>
      <div className={s.heroWash} aria-hidden />
      <Container>
        <div className={s.heroCopy}>
          <h1 className={`${s.display} ${s.displayPage}`}>Product app comps</h1>
          <p className={s.lead}>
            The employer workspace and the candidate desktop app, designed at 1440. Built from the same tokens and
            components as the public site; every screen uses example data.
          </p>
          <nav className={d.toc}>
            <Link href="/design">Visual system</Link>
          </nav>
        </div>

        <Comp n="10" title="Employer workspace home" note="New workspace, honest empty states with the next step">
          <EmployerHomeEmpty />
        </Comp>
        <Comp n="11" title="Engineering role detail" note="Invited candidates, statuses, what is billed">
          <RoleDetail />
        </Comp>
        <Comp n="12" title="Candidate attempt review" note="Work trail, code changes, hidden checks, handoff answers">
          <AttemptReview />
        </Comp>
        <Comp n="13" title="Report editor" note="Citation picker open; release blocked until every finding cites evidence">
          <ReportEditor />
        </Comp>
        <Comp n="14a" title="Desktop: sign in" note="Email the invitation was sent to">
          <div className={s.grid2}>
            <DesktopSignIn />
            <DesktopProvisioning />
          </div>
        </Comp>
        <Comp n="14b" title="Desktop: consent" note="What this simulation records, before anything is recorded">
          <ConsentScreen />
        </Comp>
        <Comp n="14c" title="Desktop: workspace" note="Mid-incident, with the requirement update">
          <Stage quiet>
            <HeroWorkspace />
          </Stage>
        </Comp>
        <Comp n="14d" title="Desktop: submitted receipt" note="Sealed snapshot, sha256 checksum">
          <div className={s.grid2}>
            <Receipt />
          </div>
        </Comp>
        <Comp n="7" title="Passport builder" note="The /passport/new flow: paste a GitHub URL, choose repositories">
          <div className={s.grid2}>
            <PassportBuilderMock />
          </div>
        </Comp>
      </Container>
    </section>
  );
}
