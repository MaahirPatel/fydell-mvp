/**
 * Child process for scripts/accept-simulation-journeys.ts. Never run by hand.
 *
 *   submit <attemptId> <userId> <killPoint|none> <clientSubmissionId>
 *     Submits the attempt's saved workspace through the real submitAuthored,
 *     and exits abruptly (code 137, no cleanup) right after the named write
 *     commits, as a crashed server request would.
 *   worker <runId> <workerId>
 *     Claims one analysis run by id and evaluates it on the configured runner.
 *     The parent kills this process mid-run.
 *
 * Run as: node --conditions=react-server --import tsx scripts/accept-simulation-child.ts ...
 * The parent passes the environment; nothing secret is printed.
 */
import type { Admin } from "../src/lib/eng/context";
import { engAdmin } from "../src/lib/eng/context";
import { getAttemptForCandidate } from "../src/lib/eng/attempts";
import { getWorkspace, loadAuthored, submitAuthored, validateAuthoredHandoff } from "../src/lib/eng/authored/runtime";
import { processRun } from "../src/lib/eng/evaluation/queue";
import { claimRunById, journeyHandoff, KILL_POINTS, type KillPoint } from "./accept-simulation-shared";

const TABLE_TRIGGERS: Partial<Record<KillPoint, { table: string; op: string }>> = {
  after_upload_row: { table: "eng_uploads", op: "insert" },
  after_submission_row: { table: "eng_submissions", op: "insert" },
  after_attempt_closed: { table: "eng_attempts", op: "update" },
  after_run_queued: { table: "eng_evaluation_runs", op: "insert" },
};

const WRITE_OPS = new Set(["insert", "update", "upsert", "delete"]);
type AnyFn = (...args: unknown[]) => unknown;

function crash(point: string): never {
  console.log(`killed ${point}`);
  process.exit(137);
}

function committed(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as { error?: unknown }).error == null);
}

/** Wraps a PostgREST builder chain, remembering the table and the write operation. */
function wrapBuilder(target: object, table: string, op: string | null, kill: KillPoint | null): object {
  return new Proxy(target, {
    get(t, prop, receiver) {
      const v: unknown = Reflect.get(t, prop, receiver);
      if (typeof v !== "function") return v;
      const fn = v as AnyFn;
      if (prop === "then") {
        return (onOk?: (value: unknown) => unknown, onErr?: (reason: unknown) => unknown) =>
          fn.call(
            t,
            (value: unknown) => {
              const trigger = kill ? TABLE_TRIGGERS[kill] : undefined;
              if (trigger && trigger.table === table && trigger.op === op && committed(value)) crash(kill as string);
              return onOk ? onOk(value) : value;
            },
            onErr,
          );
      }
      return (...args: unknown[]) => {
        const out = fn.apply(t, args);
        const name = String(prop);
        const nextOp = WRITE_OPS.has(name) ? name : op;
        return out && typeof out === "object" ? wrapBuilder(out, table, nextOp, kill) : out;
      };
    },
  });
}

function crashingClient(db: Admin, kill: KillPoint | null): Admin {
  return new Proxy(db, {
    get(t, prop, receiver) {
      if (prop === "from") return (table: string) => wrapBuilder(t.from(table), table, null, kill);
      if (prop === "storage") {
        return new Proxy(t.storage, {
          get(s, sp, sr) {
            if (sp !== "from") return Reflect.get(s, sp, sr);
            return (bucket: string) => {
              const api = s.from(bucket);
              return new Proxy(api, {
                get(a, ap, ar) {
                  const v: unknown = Reflect.get(a, ap, ar);
                  if (ap !== "upload" || typeof v !== "function") return typeof v === "function" ? (v as AnyFn).bind(a) : v;
                  return async (...args: unknown[]) => {
                    const res = await (v as AnyFn).apply(a, args);
                    if (kill === "after_storage_upload" && committed(res)) crash(kill);
                    return res;
                  };
                },
              });
            };
          },
        });
      }
      const v: unknown = Reflect.get(t, prop, receiver);
      return typeof v === "function" ? (v as AnyFn).bind(t) : v;
    },
  }) as Admin;
}

async function submit(attemptId: string, userId: string, killArg: string, clientSubmissionId: string) {
  const kill = (KILL_POINTS as readonly string[]).includes(killArg) ? (killArg as KillPoint) : null;
  const db = engAdmin();
  const attempt = await getAttemptForCandidate(db, attemptId, userId);
  const authored = await loadAuthored(db, attempt);
  const workspace = await getWorkspace(db, attemptId);
  if (!workspace) throw new Error("no workspace");
  const handoff = validateAuthoredHandoff(authored.pkg, journeyHandoff(authored.pkg));
  if (handoff.ok === false) throw new Error(handoff.error);
  const receipt = await submitAuthored(
    crashingClient(db, kill),
    authored,
    { files: workspace.files, handoff: handoff.handoff, aiDisclosure: handoff.aiDisclosure, clientSubmissionId },
    userId,
  );
  console.log(`submitted ${receipt.submissionId} ${receipt.alreadySubmitted ? "existing" : "new"}`);
}

async function worker(runId: string, workerId: string) {
  const db = engAdmin();
  const run = await claimRunById(db, runId, workerId);
  if (!run) {
    console.log("not claimed");
    return;
  }
  console.log(`claimed ${run.id} attempt ${run.attempt_count}`);
  const status = await processRun(db, run);
  console.log(`finished ${status}`);
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "submit" && args.length === 4) return submit(args[0], args[1], args[2], args[3]);
  if (mode === "worker" && args.length === 2) return worker(args[0], args[1]);
  throw new Error("usage: submit <attemptId> <userId> <killPoint|none> <clientId> | worker <runId> <workerId>");
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(`child failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
