import { CircleCheck, CircleDot, CircleX, FileText, Upload } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import s from "./screens.module.css";

const FILES = [
  { dir: "", names: ["INCIDENT.md", "README.md"] },
  { dir: "webhooks/", names: ["dispatcher.py", "models.py", "transport.py"] },
  { dir: "tests/", names: ["test_dispatcher.py"] },
  { dir: "logs/", names: ["dispatcher-2026-09-14.log"] },
] as const;

/** One run of the scenario's public tests, part-way through an example attempt. */
const RUN = [
  { name: "test_success_marks_delivered", pass: true },
  { name: "test_server_error_schedules_backoff", pass: true },
  { name: "test_gone_endpoint_is_not_retried", pass: false },
  { name: "test_idempotency_key_is_stable_across_retries", pass: true },
] as const;

const lead = SCENARIO.teammates[0];
const answer = SCENARIO.clarificationRules.find((r) => r.id === "temporary_vs_permanent")?.answer ?? "";

/**
 * The engineering simulation as a candidate sees it: the brief and its
 * requirements, the project files, a public test run, and the team thread
 * docked as a column beside the brief. Brief, requirements, files, tests and
 * teammate replies come from the shipped scenario definition.
 */
export default function SimulationWorkspace() {
  return (
    <div className={s.app}>
      <div className={s.appHeader}>
        <span className={s.appLogo}>
          <FydellLogo height={16} />
        </span>
        <nav className={s.appNav} aria-label="Example simulation sections">
          {["Brief", "Updates", "Handoff"].map((label) => (
            <span key={label} className={label === "Brief" ? s.appNavOn : s.appNavItem}>
              {label}
            </span>
          ))}
        </nav>
        <span className={s.appHeaderRight}>
          <span>Support</span>
        </span>
      </div>

      <div className={s.simHeader}>
        <span className={s.simTitle}>{SCENARIO.title}</span>
        <span className={s.simStatus}>
          <CircleDot aria-hidden size={14} /> In progress
        </span>
        <span className={s.simMeta}>
          Started after the setup check · 52 of {SCENARIO.defaultAllowedMinutes} minutes left
        </span>
        <span className={s.simNext}>
          <Upload aria-hidden size={14} /> Upload ZIP and handoff
        </span>
      </div>

      <div className={s.sim}>
        <div className={s.simMain}>
          <aside className={s.files} aria-label="Project files">
            <p className={s.filesHead}>{SCENARIO.starterRoot}</p>
            {FILES.map((group) => (
              <div key={group.dir || "root"}>
                {group.dir ? <p className={s.fileDir}>{group.dir}</p> : null}
                {group.names.map((name) => (
                  <span key={name} className={name === "INCIDENT.md" ? s.fileOn : s.file}>
                    <FileText aria-hidden size={13} />
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </aside>

          <section className={s.brief} aria-label="Brief">
            <p className={s.blockLabel}>Brief</p>
            <p className={s.briefText}>{SCENARIO.summary}</p>
            <p className={`${s.blockLabel} ${s.detailBlock}`}>Requirements</p>
            <ol className={s.reqs}>
              {SCENARIO.initialRequirements.slice(0, 4).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ol>
            {SCENARIO.requirementUpdate ? (
              <div className={s.update}>
                <p className={s.updateTitle}>Update · {SCENARIO.requirementUpdate.title}</p>
                <p className={s.updateText}>Posted about {SCENARIO.requirementUpdate.releaseAfterMinutes} minutes in. Also shown in the team thread.</p>
              </div>
            ) : null}
            <div className={s.tests}>
              <p className={s.testsHead}>
                <span>Public tests · tests/test_dispatcher.py</span>
                <code>{SCENARIO.testCommands.unix}</code>
              </p>
              {RUN.map((t) => (
                <div key={t.name} className={s.testRow}>
                  {t.pass ? <CircleCheck aria-hidden size={14} className={s.pass} /> : <CircleX aria-hidden size={14} className={s.fail} />}
                  <span className={s.testName}>{t.name}</span>
                  <span className={`${s.testResult} ${t.pass ? s.pass : s.fail}`}>{t.pass ? "Passed" : "Failed"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className={s.thread} aria-label="Team thread">
          <div className={s.threadHead}>
            <p className={s.threadTitle}>Team thread</p>
            <p className={s.wsMeta}>Simulated teammates. Every candidate gets the same facts.</p>
          </div>
          <div className={s.messages}>
            <div className={s.message}>
              <p className={s.author}>
                {lead.title} <span className={s.authorRole}>Simulated</span>
              </p>
              <p className={s.messageText}>{SCENARIO.kickoff.body}</p>
            </div>
            <div className={`${s.message} ${s.messageMine}`}>
              <p className={s.author}>You</p>
              <p className={s.messageText}>Should a 410 or a 3xx be retried, or end as failed?</p>
            </div>
            <div className={s.message}>
              <p className={s.author}>
                {lead.title} <span className={s.authorRole}>Simulated</span>
              </p>
              <p className={s.messageText}>{answer}</p>
            </div>
          </div>
          <p className={s.composer}>Message the team</p>
          <p className={s.threadNote}>Asking is optional and never counted against you.</p>
        </aside>
      </div>
    </div>
  );
}
