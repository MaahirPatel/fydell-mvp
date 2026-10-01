import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, Clock } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { loadCandidateOverview, type WorkItem } from "@/lib/candidate/overview";
import e from "@/components/candidate/easy.module.css";

export const metadata = { title: "My simulations" };
export const dynamic = "force-dynamic";

const HOW = [
  { title: "Open the task", body: "It sets everything up. You install nothing else." },
  { title: "Read the problem", body: "Ask your pretend teammates if something is unclear." },
  { title: "Fix it and run tests", body: "One new request arrives partway. That is normal." },
  { title: "Send your work", body: "Answer 4 short questions. You get a receipt." },
];

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function StatusBadge({ item }: { item: WorkItem }) {
  const cls =
    item.tone === "running"
      ? e.badgeAmber
      : item.tone === "ready"
        ? e.badgeBlue
        : item.tone === "done" || item.tone === "waiting"
          ? e.badgeGreen
          : undefined;
  return (
    <span className={cx(e.badge, cls)}>
      {item.tone === "running" ? <Clock aria-hidden /> : null}
      {item.tone === "done" || item.tone === "waiting" ? <Check aria-hidden /> : null}
      {item.status}
    </span>
  );
}

function Waiting({ item }: { item: WorkItem }) {
  return (
    <article className={e.task} aria-labelledby={`${item.id}-title`}>
      <div className={e.taskMain}>
        <div className={e.taskTop}>
          <StatusBadge item={item} />
          <span className={e.small}>{[item.from ? `From ${item.from}` : null, item.when].filter(Boolean).join(" · ")}</span>
        </div>
        <h3 id={`${item.id}-title`} className={e.h2}>
          {item.title}
        </h3>
        {item.about ? <p className={e.body}>{item.about}</p> : null}
        <ul className={e.facts}>
          {item.minutes ? (
            <li>
              <strong>About {item.minutes} minutes</strong> once you press Start
            </li>
          ) : null}
          <li>
            <strong>{item.runner === "desktop" ? "Fydell app" : "In your browser"}</strong>{" "}
            {item.runner === "desktop" ? "for Windows and Mac" : "(nothing to install)"}
          </li>
        </ul>
      </div>
      <div className={e.taskActions}>
        {item.action ? (
          <Link href={item.action.href} className={cx(e.btn, e.btnPrimary)}>
            {item.action.label}
            <ArrowRight aria-hidden />
          </Link>
        ) : null}
        {item.note ? <p className={e.small}>{item.note}</p> : null}
        {item.runner === "desktop" ? (
          <Link href="/download" className={e.link}>
            No app yet? Download it
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Done({ item }: { item: WorkItem }) {
  return (
    <article className={cx(e.task, e.taskDone)} aria-labelledby={`${item.id}-title`}>
      <div className={e.taskMain}>
        <div className={e.taskTop}>
          <StatusBadge item={item} />
          <span className={e.small}>{[item.from, item.when].filter(Boolean).join(" · ")}</span>
        </div>
        <h3 id={`${item.id}-title`} className={e.h3}>
          {item.title}
        </h3>
        {item.receipt ? <p className={e.small}>Receipt {item.receipt}</p> : null}
      </div>
      {item.action ? (
        <div className={e.taskActions}>
          <Link href={item.action.href} className={cx(e.btn, e.btnSmall)}>
            {item.action.label}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default async function CandidateSimulationsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/simulations")}`);

  const o = await loadCandidateOverview(user);
  const empty = o.open.length === 0 && o.done.length === 0;

  return (
    <CandidateShell width="wide" current="simulations" userName={o.name}>
      <div className={e.page}>
        <div className={e.hello}>
          <h1 className={e.h1}>My simulations</h1>
          <p className={e.lead}>An employer invites you to fix a problem, like a real first week at work.</p>
        </div>

        <section aria-labelledby="how-title" className={e.how}>
          <h2 id="how-title" className={e.h3}>
            How a simulation works
          </h2>
          <ol className={e.howList}>
            {HOW.map((step, i) => (
              <li key={step.title} className={e.howItem}>
                <span className={e.num}>{i + 1}</span>
                <span className={e.howText}>
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {empty ? (
          <section className={e.empty} aria-labelledby="empty-title">
            <h2 id="empty-title" className={e.h2}>
              Nothing here yet
            </h2>
            <p className={e.body}>
              Simulations come from employers. When one invites you, it appears here with its deadline and a button to start.
            </p>
            <div className={e.row}>
              <Link href="/app/candidate/passport" className={cx(e.btn, e.btnPrimary)}>
                Build my passport meanwhile
              </Link>
              <Link href="/simulations" className={e.btn}>
                See an example task
              </Link>
            </div>
          </section>
        ) : null}

        {o.open.length > 0 ? (
          <section className={e.section} aria-labelledby="waiting-title">
            <h2 id="waiting-title" className={e.h2}>
              Waiting for you
            </h2>
            {o.open.map((item) => (
              <Waiting key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        {o.done.length > 0 ? (
          <section className={e.section} aria-labelledby="done-title">
            <h2 id="done-title" className={e.h2}>
              Done
            </h2>
            {o.done.map((item) => (
              <Done key={item.id} item={item} />
            ))}
          </section>
        ) : null}
      </div>
    </CandidateShell>
  );
}
