import { isConfigFile, isReadme, isTestFile } from "./select";
import type { DraftFinding } from "./detectors";
import type { EvidenceCategory } from "./types";

/**
 * Practice detectors: line-cited observations about how code handles
 * failure, data, configuration, tests and models. Each one states only what
 * the cited lines contain; none infers quality, scale or security.
 */

type Files = Map<string, string>;
type Span = { start: number; end: number };

const ext = (path: string) => path.slice(path.lastIndexOf(".") + 1).toLowerCase();
const isPython = (p: string) => ext(p) === "py";
const isScript = (p: string) => ["ts", "tsx", "js", "jsx", "mjs", "cjs"].includes(ext(p));
const isCode = (p: string) => isPython(p) || isScript(p) || ["go", "rb", "java", "kt", "rs"].includes(ext(p));
const isDoc = (p: string) => isReadme(p) || /\.(md|txt)$/i.test(p);

type Spec = {
  detector: string;
  category: EvidenceCategory;
  finding: string;
  limitations: string[];
  /** Which files to inspect. */
  files: (path: string) => boolean;
  /** Optional whole-file gate, e.g. "this file calls a model". */
  requires?: RegExp;
  /** Returns the cited span in one file, or null. */
  match: (lines: string[]) => Span | null;
};

/** First line matching `re`, optionally confirmed by `near` within `window` following lines. */
function lineWith(re: RegExp, near?: RegExp, window = 4): (lines: string[]) => Span | null {
  return (ls) => {
    for (let i = 0; i < ls.length; i++) {
      if (!re.test(ls[i])) continue;
      if (!near) return { start: i + 1, end: i + 1 };
      const j = ls.slice(i, i + window + 1).findIndex((l) => near.test(l));
      if (j >= 0) return { start: i + 1, end: i + 1 + j };
    }
    return null;
  };
}

const MAX_BLOCK = 80;

/**
 * Last line (0-based) of the block opened at `start`: the matching closing
 * brace for brace languages, or the last line indented deeper than the header
 * for Python. Capped so a runaway file cannot widen the search without bound.
 */
export function blockEnd(lines: string[], start: number): number {
  const header = lines[start];
  const last = Math.min(lines.length - 1, start + MAX_BLOCK);
  if (/:\s*(#.*)?$/.test(header) && !/[{]\s*$/.test(header)) {
    const indent = header.search(/\S/);
    let end = start;
    for (let i = start + 1; i <= last; i++) {
      if (!lines[i].trim()) continue;
      if (lines[i].search(/\S/) <= indent) break;
      end = i;
    }
    return end;
  }
  let depth = 0;
  let opened = false;
  for (let i = start; i <= last; i++) {
    for (const ch of lines[i].replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "")) {
      if (ch === "{") {
        depth += 1;
        opened = true;
      } else if (ch === "}") {
        depth -= 1;
        if (opened && depth <= 0) return i;
      }
    }
    if (!opened && i > start) return start;
  }
  return last;
}

const RETRY_LIBRARY = /@retry\b|tenacity|backoff\.on_exception/i;
const RETRY_LOOP = /^\s*(}\s*)?(for|while)\b.*\b(\w*retr(y|ies)\w*|\w*attempts?\w*|(max_?)?tries)\b/i;
const DELAY = /(sleep\(|setTimeout\(|wait_exponential|backoff|\*\*\s*attempt|Math\.pow\(2|2\s*\*\*)/;

/** A retry library with a wait nearby, or a retry loop whose own body waits between attempts. */
function retryWithBackoff(ls: string[]): Span | null {
  for (let i = 0; i < ls.length; i++) {
    if (RETRY_LIBRARY.test(ls[i])) {
      const j = ls.slice(i, i + 7).findIndex((l) => DELAY.test(l));
      if (j >= 0) return { start: i + 1, end: i + 1 + j };
      continue;
    }
    if (!RETRY_LOOP.test(ls[i])) continue;
    const end = blockEnd(ls, i);
    for (let j = i + 1; j <= end; j++) if (DELAY.test(ls[j])) return { start: i + 1, end: j + 1 };
  }
  return null;
}

const SPECS: Spec[] = [
  // Backend and API engineering
  {
    detector: "auth_boundary",
    category: "backend",
    finding: "Checks the caller's identity before handling the request.",
    limitations: ["Whether every route is protected, and whether the authorization rules are correct, is not assessed."],
    files: (p) => isPython(p) || isScript(p),
    match: lineWith(/Depends\(\s*(get_current_\w+|current_user|require_\w+|verify_\w+)|@(login_required|permission_required|requires_auth|jwt_required)\b|\b(requireUser|requireAuth|requireSession|getServerSession|verifyToken|jwt\.verify)\(/),
  },
  {
    detector: "explicit_error_handling",
    category: "software",
    finding: "Catches a named failure and reports or re-raises it rather than discarding it.",
    limitations: ["Only the cited handler was inspected; coverage of other failure paths is not assessed."],
    files: (p) => isPython(p) && !isTestFile(p),
    match: lineWith(/^\s*except\s+\(?(\w+\.)*[A-Z]\w*(Error|Exception|Timeout)\b/, /\b(raise|logger\.|logging\.|log\.|HTTPException|return\s+\w*[Rr]esponse)/, 3),
  },
  {
    detector: "explicit_error_handling",
    category: "software",
    finding: "Catches an error and reports or rethrows it rather than discarding it.",
    limitations: ["Only the cited handler was inspected; coverage of other failure paths is not assessed."],
    files: (p) => isScript(p) && !isTestFile(p),
    match: lineWith(/\bcatch\s*\(\s*\w+/, /\b(throw\b|logger\.|console\.error|captureException|status:\s*[45]\d\d|\.status\([45]\d\d\))/, 3),
  },
  {
    detector: "retry_with_backoff",
    category: "backend",
    finding: "Retries a failed operation with a delay between attempts.",
    limitations: ["Retry limits and behaviour under sustained failure were not exercised."],
    files: isCode,
    match: retryWithBackoff,
  },
  {
    detector: "outbound_timeout",
    category: "backend",
    finding: "Sets an explicit timeout on an outbound network call.",
    limitations: ["Whether the timeout value suits the dependency is not assessed."],
    files: (p) => (isPython(p) || isScript(p)) && !isTestFile(p),
    match: lineWith(/(requests|httpx|aiohttp|session|client|axios)\.\w+\(.*timeout\s*=|timeout\s*[:=]\s*\d|AbortSignal\.timeout\(/),
  },
  {
    detector: "db_transaction",
    category: "backend",
    finding: "Groups related database writes in a transaction.",
    limitations: ["Isolation level and behaviour under concurrent writes are not observed."],
    files: isCode,
    match: lineWith(/session\.begin(_nested)?\(|transaction\.atomic|\.transaction\(\s*(async\s*)?\(|prisma\.\$transaction|\bBEGIN\b\s*;|\.begin\(\)\s*as\b|db\.transaction\(/),
  },
  {
    detector: "parameterized_sql",
    category: "backend",
    finding: "Passes values to SQL as bound parameters instead of formatting them into the query.",
    limitations: ["Other queries in the project were not all checked."],
    files: (p) => (isPython(p) || isScript(p) || ext(p) === "go") && !isTestFile(p),
    match: lineWith(/\.(execute|query|exec)\(\s*[rf]?["'`].*\b(select|insert|update|delete)\b.*(%s|\$\d|\?|:\w+).*["'`]\s*,/i),
  },
  {
    detector: "background_job",
    category: "backend",
    finding: "Runs work in a background job or queue worker.",
    limitations: ["Delivery guarantees and failure handling of the queue are not assessed."],
    files: (p) => isCode(p) && !isTestFile(p),
    match: lineWith(/@(\w+\.)?task\b|@shared_task|@dramatiq\.actor|\bnew Worker\(|\bnew Queue\(|rq\.Queue\(|\.enqueue\(|BackgroundTasks\b|celery\(/i),
  },
  {
    detector: "observability",
    category: "backend",
    finding: "Instruments the code with structured logging, metrics or tracing.",
    limitations: ["What is recorded, and whether it helps in operation, is not assessed."],
    files: (p) => isCode(p) && !isTestFile(p),
    match: lineWith(/logging\.getLogger\(__name__\)|structlog\.|\bpino\(|opentelemetry|prometheus_client|sentry_sdk\.init|Sentry\.init\(|\btracer\.start/),
  },
  {
    detector: "result_caching",
    category: "backend",
    finding: "Caches results to avoid repeating work.",
    limitations: ["Cache invalidation and staleness behaviour are not observed."],
    files: (p) => isCode(p) && !isTestFile(p),
    match: lineWith(/@(functools\.)?(lru_cache|cache)\b|\bunstable_cache\(|\bredis\w*\.(get|set|setex)\(|\bcache\.(get|set)\(/),
  },
  {
    detector: "validated_settings",
    category: "software",
    finding: "Validates configuration loaded from the environment.",
    limitations: ["Which settings are required in production is not assessed."],
    files: (p) => (isPython(p) || isScript(p)) && !isTestFile(p),
    match: lineWith(/class\s+\w+\(\s*BaseSettings\s*\)|createEnv\(|cleanEnv\(|z\.object\(.*\)\.parse\(\s*process\.env/),
  },

  // Software engineering
  {
    detector: "interface_contract",
    category: "software",
    finding: "Defines an explicit interface that implementations must satisfy.",
    limitations: ["How consistently the interface is used across the codebase is not assessed."],
    files: (p) => (isPython(p) || isScript(p)) && !isTestFile(p),
    match: lineWith(/^\s*class\s+\w+\(\s*(Protocol|ABC)\s*[,)]|^\s*(export\s+)?(default\s+)?class\s+\w+\s+(extends\s+\w+\s+)?implements\s+\w+/),
  },
  {
    detector: "concurrent_execution",
    category: "software",
    finding: "Runs independent operations concurrently.",
    limitations: ["Error handling and resource limits under concurrency are not observed."],
    files: (p) => isCode(p) && !isTestFile(p),
    match: lineWith(/asyncio\.gather\(|Promise\.(all|allSettled)\(|ThreadPoolExecutor\(|ProcessPoolExecutor\(|errgroup\./),
  },
  {
    detector: "cli_interface",
    category: "software",
    finding: "Exposes a command-line interface with declared arguments and options.",
    limitations: ["Usability of the interface is not assessed."],
    files: (p) => (isPython(p) || isScript(p)) && !isTestFile(p),
    match: lineWith(/argparse\.ArgumentParser\(|@click\.(command|group)|typer\.Typer\(|\bnew Command\(|\byargs\(/),
  },
  {
    detector: "strict_typing",
    category: "software",
    finding: "Enables strict static type checking.",
    limitations: ["Whether the code passes the type checker was not run."],
    files: (p) => /(^|\/)(tsconfig\.json|pyproject\.toml|mypy\.ini|setup\.cfg)$/.test(p),
    match: lineWith(/"strict"\s*:\s*true|^\s*strict\s*=\s*true|disallow_untyped_defs\s*=\s*(true|True)/),
  },
  {
    detector: "ui_error_boundary",
    category: "frontend",
    finding: "Handles interface rendering failures with an error boundary.",
    limitations: ["The fallback experience was not rendered or reviewed."],
    files: (p) => ["tsx", "jsx"].includes(ext(p)) && !isTestFile(p),
    match: lineWith(/componentDidCatch\(|<ErrorBoundary\b|class\s+\w*ErrorBoundary\b|^export default function \w*Error\s*\(\s*\{\s*error/),
  },
  {
    detector: "ui_state_management",
    category: "frontend",
    finding: "Manages shared interface state with a reducer, store or context.",
    limitations: ["Whether the state design suits the application is not assessed."],
    files: (p) => isScript(p) && !isTestFile(p),
    match: lineWith(/\buseReducer\(|\bcreateSlice\(|\bcreateContext\(|\bcreate\(\s*\(\s*set\b|\bdefineStore\(/),
  },

  // Delivery
  {
    detector: "container_build",
    category: "delivery",
    finding: "Defines a container image build.",
    limitations: ["The image was not built or scanned."],
    files: (p) => /(^|\/)Dockerfile$/.test(p),
    match: lineWith(/^\s*FROM\s+\S+/i),
  },
  {
    detector: "container_non_root",
    category: "delivery",
    finding: "Runs the container as a non-root user.",
    limitations: ["Other runtime hardening was not assessed."],
    files: (p) => /(^|\/)Dockerfile$/.test(p),
    match: lineWith(/^\s*USER\s+(?!root\b|0\b)\S+/i),
  },
  {
    detector: "reusable_action",
    category: "delivery",
    finding: "Defines a reusable GitHub Action.",
    limitations: ["Whether the action is used by others is not assessed."],
    files: (p) => isConfigFile(p) && /action\.ya?ml$/.test(p),
    match: lineWith(/^runs:\s*$/),
  },

  // Testing depth
  {
    detector: "failure_path_test",
    category: "testing",
    finding: "Tests a failure path by asserting an error or a rejected request.",
    limitations: ["Fydell does not run imported code, so whether this test passes is unknown."],
    files: isTestFile,
    match: lineWith(
      /pytest\.raises\(|assertRaises(Regex)?\(|\.toThrow\w*\(|\.rejects\.|\bt\.throws(Async)?\(|\bassert\.(throws|rejects)\(|\.to\.(be\.)?(throw|rejected)|\bassertThrows\(|\braise_error\b|#\[should_panic|status_code\s*==\s*4\d\d|\.status\)\.toBe\(4\d\d\)|toHaveStatus\(4\d\d\)/,
    ),
  },
  {
    detector: "test_isolation",
    category: "testing",
    finding: "Isolates tests from external services with mocks or fakes.",
    limitations: ["How closely the fakes match the real services is not assessed."],
    files: isTestFile,
    // Requires the fake to be used, not just imported.
    match: lineWith(/^(?!\s*(from|import)\b).*(\bmonkeypatch\.\w+\(|\bmocker\.\w+\(|@patch(\.object)?\(|\bwith\s+patch(\.object)?\(|\b(Magic|Async)?Mock\(|\bvi\.mock\(|\bjest\.mock\(|@respx\.mock|\brespx\.mock\(|\bnock\(|setupServer\()/),
  },
  {
    detector: "parametrized_test",
    category: "testing",
    finding: "Runs the same test over several input cases.",
    limitations: ["Whether the cases cover the important boundaries is not assessed."],
    files: isTestFile,
    match: lineWith(/@pytest\.mark\.parametrize|\b(it|test|describe)\.each\b/),
  },

  // AI and ML engineering
  {
    detector: "ml_data_split",
    category: "ml_engineering",
    finding: "Separates training data from evaluation data.",
    limitations: ["Leakage between splits is not checked beyond the cited split."],
    files: isPython,
    match: lineWith(/train_test_split\(|StratifiedKFold\(|\bKFold\(|random_split\(|GroupKFold\(/),
  },
  {
    detector: "ml_evaluation_metric",
    category: "ml_engineering",
    finding: "Computes evaluation metrics for a model.",
    limitations: ["Whether the metric suits the task, and the results themselves, are not assessed."],
    files: isPython,
    match: lineWith(/from sklearn\.metrics import|\b(accuracy|f1|roc_auc|precision|recall|mean_squared_error)_score\(|evaluate\.load\(|def compute_metrics\(/),
  },
  {
    detector: "ml_reproducibility",
    category: "ml_engineering",
    finding: "Fixes random seeds so runs can be reproduced.",
    limitations: ["Full reproducibility also depends on data and environment versions, which were not checked."],
    files: isPython,
    match: lineWith(/\b(torch\.manual_seed|np\.random\.seed|random\.seed|set_seed|seed_everything|tf\.random\.set_seed)\(/),
  },
  {
    detector: "ml_artifact_versioning",
    category: "ml_engineering",
    finding: "Saves trained model artifacts or records experiment runs.",
    limitations: ["Artifact lineage and storage were not inspected."],
    files: isPython,
    match: lineWith(/\bmlflow\.(log_|start_run)|\bwandb\.init\(|\.save_pretrained\(|\btorch\.save\(|\bjoblib\.dump\(/),
  },
  {
    detector: "ml_inference_mode",
    category: "ml_engineering",
    finding: "Runs model inference in evaluation mode without gradient tracking.",
    limitations: ["Inference latency and correctness were not measured."],
    files: isPython,
    match: lineWith(/\.eval\(\)/, /torch\.(no_grad|inference_mode)\(\)/, 5),
  },
  {
    detector: "llm_output_validation",
    category: "applied_ai",
    finding: "Parses and validates model output before using it.",
    limitations: ["Behaviour on malformed or adversarial output was not exercised."],
    files: (p) => isPython(p) || isScript(p),
    requires: /\.chat\.completions\.create\(|\.responses\.create\(|\.messages\.create\(|generateObject\(|ChatOpenAI\(|ChatAnthropic\(/,
    match: lineWith(/\.model_validate(_json)?\(|\.parse_raw\(|\.safeParse\(|\bjson\.loads\(|\bJSON\.parse\(/),
  },
  {
    detector: "llm_latency_measurement",
    category: "applied_ai",
    finding: "Measures latency around model calls.",
    limitations: ["Measured values and their conditions were not reviewed."],
    files: (p) => isPython(p) || isScript(p),
    requires: /\.chat\.completions\.create\(|\.responses\.create\(|\.messages\.create\(|\.generate\(|pipeline\(/,
    match: lineWith(/time\.perf_counter\(|time\.monotonic\(|performance\.now\(/),
  },
];

const PER_SPEC_FILES = 2;

export function runPracticeDetectors(files: Files): DraftFinding[] {
  const out: DraftFinding[] = [];
  const perDetector = new Map<string, number>();
  for (const spec of SPECS) {
    let hits = 0;
    for (const [path, text] of files) {
      if (hits >= PER_SPEC_FILES || (perDetector.get(spec.detector) ?? 0) >= PER_SPEC_FILES) break;
      if (isDoc(path) || !spec.files(path)) continue;
      if (spec.requires && !spec.requires.test(text)) continue;
      const span = spec.match(text.split(/\r?\n/));
      if (!span) continue;
      out.push({
        detector: spec.detector,
        category: spec.category,
        finding: spec.finding,
        basis: "repository_observation",
        path,
        startLine: span.start,
        endLine: span.end,
        limitations: spec.limitations,
      });
      hits += 1;
      perDetector.set(spec.detector, (perDetector.get(spec.detector) ?? 0) + 1);
    }
  }
  return out;
}