import { Fragment, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  FileCode2,
  FolderGit2,
  FlaskConical,
  Play,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import styles from "./hero-sim-workspace.module.css";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/* ------------------------------------------------------------------ data -- */

type Tok = { t: string; c?: string };

const CODE: Tok[][] = [
  [{ t: "import", c: "kw" }, { t: " time" }],
  [{ t: "from", c: "kw" }, { t: " mailer ", c: "mod" }, { t: "import", c: "kw" }, { t: " send_receipt", c: "fn" }],
  [{ t: "from", c: "kw" }, { t: " claims ", c: "mod" }, { t: "import", c: "kw" }, { t: " ClaimStore", c: "fn" }],
  [{ t: "" }],
  [{ t: "claims", c: "var" }, { t: " = " }, { t: "ClaimStore", c: "fn" }, { t: "()" }],
  [{ t: "" }],
  [{ t: "def", c: "kw" }, { t: " process_job", c: "fn" }, { t: "(job):" }],
  [{ t: '    """Send the receipt exactly once, even on retry."""', c: "str" }],
  [{ t: "    if", c: "kw" }, { t: " " }, { t: "not", c: "kw" }, { t: " claims.acquire(job.order_id):" }],
  [{ t: "        return", c: "kw" }, { t: "  ", }, { t: "# already sent", c: "com" }],
  [{ t: "" }],
  [{ t: "    try", c: "kw" }, { t: ":" }],
  [{ t: "        send_receipt(job.receipt)", c: "fn" }],
  [{ t: "    except", c: "kw" }, { t: " TransientError:" }],
  [{ t: "        raise", c: "kw" }],
  [{ t: "    claims.mark_sent(job.order_id)" }],
];

/** 1-based line numbers the evidence receipt cites: the try/except region. */
const CITED = new Set([13, 14, 15]);

const FILES: { name: string; dir: string; active?: boolean; flag?: boolean }[] = [
  { name: "worker.py", dir: "src", active: true },
  { name: "mailer.py", dir: "src" },
  { name: "claims.py", dir: "src" },
  { name: "test_retry.py", dir: "tests", flag: true },
  { name: "pyproject.toml", dir: "" },
];

const TESTS: { name: string; time: string; pass: boolean; cited?: boolean }[] = [
  { name: "test_acquire_first_sender_wins", time: "0.21s", pass: true },
  { name: "test_no_double_send_on_retry", time: "0.34s", pass: true },
  { name: "test_release_on_transient_error", time: "0.18s", pass: false, cited: true },
  { name: "test_backoff_schedule", time: "0.09s", pass: true },
  { name: "test_receipt_idempotent", time: "0.42s", pass: true },
];

const PHASES = ["Brief", "Explore", "Reproduce", "Fix", "Verify", "Submit"] as const;

/* -------------------------------------------------------------- component -- */

/**
 * Hero product visual: the Fydell simulation client, mid-attempt.
 * A deep, layered scene: the workspace window (file tree, editor with cited
 * lines, streaming test panel, attempt timeline) with two floating evidence
 * cards. Entrance choreography, ambient float, and mouse parallax; everything
 * resolves to a static final state under reduced motion.
 */
export default function HeroSimWorkspace() {
  const reduced = useReducedMotion();
  const [sceneRef, seen] = useInView<HTMLDivElement>();
  const [run, setRun] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frame = useRef(0);

  const active = seen || reduced;
  const replay = () => {
    setRun((r) => r + 1);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setTilt({ x: px, y: py }));
  };
  const onMouseLeave = () => {
    cancelAnimationFrame(frame.current);
    setTilt({ x: 0, y: 0 });
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-seen={active || undefined}
      data-reduced={reduced || undefined}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ "--px": tilt.x, "--py": tilt.y } as React.CSSProperties}
    >
      <div className={styles.glowA} aria-hidden />
      <div className={styles.glowB} aria-hidden />

      {/* ------------------------- the workspace window ------------------------- */}
      <div
        key={run}
        className={styles.stage}
        role="img"
        aria-label="The Fydell simulation client: a candidate fixes a webhook retry bug while tests stream and cited lines feed an evidence receipt"
      >
       <div className={styles.window}>
        <div className={styles.titlebar}>
          <span className={styles.dots} aria-hidden>
            <i /><i /><i />
          </span>
          <span className={styles.title}>
            <FolderGit2 className={styles.titleIcon} aria-hidden />
            harbor-webhooks
            <span className={styles.titleSep}>/</span>
            <span className={styles.titleDim}>retry-safe-jobs · Fydell Simulation Client</span>
          </span>
          <span className={styles.titleRight}>
            <span className={styles.example}>Example</span>
            <span className={styles.timer}>
              <Timer className={styles.timerIcon} aria-hidden /> 18:42 left
            </span>
          </span>
        </div>

        <div className={styles.body}>
          {/* file tree */}
          <div className={styles.tree} aria-hidden>
            <p className={styles.treeHead}>harbor-webhooks</p>
            {FILES.map((f, i) => (
              <Fragment key={f.name}>
                {(i === 0 || FILES[i - 1].dir !== f.dir) && f.dir ? (
                  <span className={styles.dirLabel}>{f.dir}/</span>
                ) : null}
                <span
                  className={`${styles.file} ${f.active ? styles.fileActive : ""}`}
                  style={{ "--d": `${120 + i * 70}ms` } as React.CSSProperties}
                >
                  <FileCode2 className={styles.fileIcon} aria-hidden />
                  {f.name}
                  {f.flag ? <span className={styles.fileFlag} /> : null}
                </span>
              </Fragment>
            ))}
            <p className={styles.treeFoot}>
              <span className={styles.branchDot} /> main · 4f1c9a2
            </p>
          </div>

          {/* editor */}
          <div className={styles.editor}>
            <div className={styles.editorHead} aria-hidden>
              <span className={styles.tab}>
                <FileCode2 className={styles.tabIcon} /> worker.py
              </span>
              <span className={styles.citeChip}>3 lines cited in evidence</span>
            </div>
            <div className={styles.code}>
              {CODE.map((line, i) => {
                const n = i + 1;
                const cited = CITED.has(n);
                return (
                  <div
                    key={`${run}-${n}`}
                    className={`${styles.line} ${cited ? styles.lineCited : ""}`}
                    style={{ "--d": `${260 + i * 85}ms` } as React.CSSProperties}
                  >
                    <span className={styles.ln}>{n}</span>
                    <span className={styles.lc}>
                      {line.map((tok, j) => (
                        <span key={j} className={tok.c ? styles[tok.c] : undefined}>
                          {tok.t}
                        </span>
                      ))}
                      {n === 15 ? <span className={styles.cursor} aria-hidden /> : null}
                    </span>
                    {cited ? <span className={styles.citeBar} aria-hidden /> : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* test panel */}
          <div className={styles.tests}>
            <p className={styles.testsHead}>
              <FlaskConical className={styles.testsIcon} aria-hidden />
              Test run
              <span className={styles.testsLive}>
                <span className={styles.liveDot} aria-hidden /> live
              </span>
            </p>
            <div className={styles.testRows}>
              {TESTS.map((t, i) => (
                <div
                  key={`${run}-${t.name}`}
                  className={styles.testRow}
                  style={{ "--d": `${1400 + i * 320}ms` } as React.CSSProperties}
                >
                  <span className={`${styles.testStatus} ${t.pass ? styles.pass : styles.fail}`} aria-hidden>
                    {t.pass ? <Check /> : <X />}
                  </span>
                  <span className={styles.testName}>{t.name}</span>
                  <span className={styles.testTime}>{t.time}</span>
                  {t.cited ? <span className={styles.testCited}>cited</span> : null}
                </div>
              ))}
            </div>
            <p className={styles.testsFoot} style={{ "--d": "3100ms" } as React.CSSProperties}>
              <b>4 of 5 passed</b> · 1.24s · one failure recorded with the code behind it
            </p>
          </div>
        </div>

        {/* attempt timeline */}
        <div className={styles.phases} aria-hidden>
          {PHASES.map((p, i) => (
            <span
              key={p}
              className={`${styles.phase} ${i < 4 ? styles.phaseDone : i === 4 ? styles.phaseNow : ""}`}
              style={{ "--d": `${3400 + i * 180}ms` } as React.CSSProperties}
            >
              <i />
              {p}
            </span>
          ))}
          <span className={styles.phaseCta}>
            <Play aria-hidden /> Submit attempt
          </span>
        </div>
      </div>

      {/* ------------------------- floating: evidence receipt ------------------------- */}
      <div key={run} className={`${styles.card} ${styles.cardReceipt}`} style={{ "--d": "3600ms" } as React.CSSProperties}>
        <p className={styles.cardKicker}>
          <FydellMark width={14} /> Evidence receipt
        </p>
        <p className={styles.cardFile}>
          src/worker.py <span>· lines 13–15</span>
        </p>
        <div className={styles.cardCode} aria-hidden>
          <span><b>13</b>        send_receipt(job.receipt)</span>
          <span><b>14</b>    except TransientError:</span>
          <span><b>15</b>        raise</span>
        </div>
        <p className={styles.cardMeta}>
          <span className={styles.hash}>4f1c9a2</span> rcp_8H2KQ1 · pinned commit
        </p>
      </div>

      {/* ------------------------- floating: fydell analysis ------------------------- */}
      <div className={`${styles.card} ${styles.cardAnalysis}`} style={{ "--d": "3900ms" } as React.CSSProperties}>
        <p className={styles.cardKicker}>
          <span className={styles.agentDot} aria-hidden /> Fydell analysis
        </p>
        <p className={styles.cardVerdict}>
          TransientError re-raises without releasing the claim, so the retry can never
          re-acquire it. The failing test is recorded with the code behind it.
        </p>
        <p className={styles.cardMeta}>
          <ChevronRight className={styles.metaIcon} aria-hidden /> cites 3 lines · generated from this run
        </p>
      </div>
      </div>

      <button type="button" className={styles.replay} onClick={replay}>
        <RotateCcw aria-hidden /> Replay the attempt
      </button>
    </div>
  );
}
