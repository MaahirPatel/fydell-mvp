import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, CircleHelp, Lock } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CONTACT_MAILTO } from "@/lib/contact";
import { activeShares, firstName, loadCandidateOverview, passportBuilt } from "@/lib/candidate/overview";
import e from "@/components/candidate/easy.module.css";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

type Step = {
  title: string;
  body: string;
  meta: string;
  badge: { label: string; tone?: "amber" | "green" | "quiet" };
  done: boolean;
  locked: boolean;
  action: { href: string; label: string } | null;
  lockedLabel?: string;
};

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default async function CandidateHomePage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate")}`);

  const o = await loadCandidateOverview(user);
  const built = passportBuilt(o.passport);
  const links = activeShares(o.shares);
  const findings = o.passport?.projects.reduce((n, p) => n + p.evidence.length, 0) ?? 0;
  const projects = o.passport?.projects.length ?? 0;

  const steps: Step[] = [
    built
      ? {
          title: "Build your passport",
          body: `Your passport shows ${findings} finding${findings === 1 ? "" : "s"} from ${projects} project${projects === 1 ? "" : "s"}, each linked to the exact lines of code.`,
          meta: "You can add or change projects any time",
          badge: { label: "Done", tone: "green" },
          done: true,
          locked: false,
          action: { href: "/app/candidate/passport", label: "See my passport" },
        }
      : {
          title: "Build your passport",
          body: "Show employers real code you wrote. We read your public GitHub projects and point to the exact lines.",
          meta: "About 5 minutes",
          badge: { label: "Start here", tone: "amber" },
          done: false,
          locked: false,
          action: { href: "/app/candidate/passport/build", label: "Build my passport" },
        },
    o.open.length > 0
      ? {
          title: "Do a simulation",
          body: "Fix a real-looking problem in a small codebase, with a pretend team you can message for help.",
          meta: o.open[0].minutes ? `About ${o.open[0].minutes} minutes` : "About an hour",
          badge: { label: `${o.open.length} waiting for you`, tone: "amber" },
          done: false,
          locked: false,
          action: { href: "/app/candidate/simulations", label: "See my simulations" },
        }
      : o.done.length > 0
        ? {
            title: "Do a simulation",
            body: `You have sent ${o.done.length} simulation${o.done.length === 1 ? "" : "s"}. Each one has a receipt of exactly what you sent.`,
            meta: "New invitations appear here",
            badge: { label: "Done", tone: "green" },
            done: true,
            locked: false,
            action: { href: "/app/candidate/simulations", label: "See my simulations" },
          }
        : {
            title: "Do a simulation",
            body: "Simulations come from employers. When one invites you, it shows up here with its deadline.",
            meta: "By invitation only",
            badge: { label: "Nothing yet", tone: "quiet" },
            done: false,
            locked: false,
            action: { href: "/app/candidate/simulations", label: "See how it works" },
          },
    !built
      ? {
          title: "Share with an employer",
          body: "Send a private link. You pick what they see, and you can turn the link off any time.",
          meta: "Opens when your passport is built",
          badge: { label: "After step 1", tone: "quiet" },
          done: false,
          locked: true,
          action: null,
          lockedLabel: "Finish step 1 first",
        }
      : links.length > 0
        ? {
            title: "Share with an employer",
            body: `${links.length} link${links.length === 1 ? " is" : "s are"} on. You can make another for a new employer, or turn one off.`,
            meta: "Nobody sees your passport without a link",
            badge: { label: "Done", tone: "green" },
            done: true,
            locked: false,
            action: { href: "/app/candidate/passport#share", label: "Manage my links" },
          }
        : {
            title: "Share with an employer",
            body: "Send a private link. You pick what they see, and you can turn the link off any time.",
            meta: "Takes a minute",
            badge: { label: "Ready" },
            done: false,
            locked: false,
            action: { href: "/app/candidate/passport#share", label: "Share my passport" },
          },
  ];

  // The first step still waiting on the candidate gets the one filled button.
  const focus = steps.findIndex((s, i) => !s.done && !s.locked && (i !== 1 || o.open.length > 0));
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <CandidateShell width="wide" current="home" userName={o.name}>
      <div className={e.page}>
        <div className={e.hello}>
          <h1 className={e.h1}>Hi {firstName(o.name)}. Here is what to do next.</h1>
          <p className={e.lead}>Three steps. Your work saves by itself, so you can stop and come back.</p>
        </div>

        <div className={e.progress}>
          <div
            className={e.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={doneCount}
            aria-label="Steps done"
          >
            <div className={e.fill} style={{ width: `${(doneCount / 3) * 100}%` }} />
          </div>
          <span className={e.progressLabel}>
            {doneCount} of 3 steps done
          </span>
        </div>

        <div className={e.steps3}>
          {steps.map((step, i) => {
            const isFocus = i === focus;
            return (
              <section
                key={step.title}
                aria-labelledby={`step-${i}`}
                className={cx(e.card, isFocus && e.cardFocus, step.locked && e.cardLocked)}
              >
                <div className={e.cardTop}>
                  <span className={cx(e.num, step.done ? e.numDone : isFocus && e.numOn)}>
                    {step.done ? <Check aria-label="Done" /> : i + 1}
                  </span>
                  <span
                    className={cx(
                      e.badge,
                      step.badge.tone === "amber" && e.badgeAmber,
                      step.badge.tone === "green" && e.badgeGreen,
                      step.badge.tone === "quiet" && e.badgeQuiet,
                    )}
                  >
                    {step.locked ? <Lock aria-hidden /> : null}
                    {step.badge.label}
                  </span>
                </div>
                <h2 id={`step-${i}`} className={e.h2}>
                  {step.title}
                </h2>
                <p className={e.body}>{step.body}</p>
                <p className={e.small}>{step.meta}</p>
                <div className={e.push}>
                  {step.action ? (
                    <Link href={step.action.href} className={cx(e.btn, e.btnBlock, isFocus && e.btnPrimary)}>
                      {step.action.label}
                      <ArrowRight aria-hidden />
                    </Link>
                  ) : (
                    <button type="button" disabled className={cx(e.btn, e.btnBlock)}>
                      {step.lockedLabel}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <aside className={e.help} aria-label="Help">
          <CircleHelp aria-hidden strokeWidth={1.8} />
          <p>
            <strong>Stuck?</strong> Every page has <strong>Help</strong> at the top. Setup problems never count against you.
          </p>
          <a href={CONTACT_MAILTO} className={cx(e.btn, e.btnSmall)}>
            Ask for help
          </a>
        </aside>
      </div>
    </CandidateShell>
  );
}
