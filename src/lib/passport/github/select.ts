import { LIMITS, type SkipReason, type SkippedFile, type TreeEntry } from "./types";

const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|svgz|pdf|zip|gz|tgz|bz2|xz|7z|rar|jar|war|class|so|dylib|dll|exe|bin|o|a|wasm|woff2?|ttf|otf|eot|mp[34]|mov|avi|wav|flac|ogg|psd|sketch|fig|pkl|pickle|pt|pth|onnx|h5|ckpt|safetensors|parquet|feather|npy|npz|db|sqlite3?)$/i;
const VENDORED = /(^|\/)(node_modules|vendor|third_party|dist|build|out|\.next|\.nuxt|__pycache__|\.venv|venv|env|site-packages|target|coverage|\.git|\.idea|\.vscode|bower_components|Pods)(\/|$)/;
const LOCKFILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Pipfile\.lock|Cargo\.lock|composer\.lock|Gemfile\.lock|go\.sum|uv\.lock)$/;
const MINIFIED = /\.min\.(js|css)$|\.bundle\.js$|\.map$/i;
const SECRET = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.key|id_rsa.*|id_ed25519.*|.*\.p12|.*\.pfx|credentials(\.json)?|secrets?\.(json|ya?ml|toml))$/i;
const TEXT = /\.(py|pyi|ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|rb|php|cs|swift|scala|sql|sh|toml|ya?ml|json|md|txt|cfg|ini|ipynb|r|jl|c|cc|cpp|h|hpp|vue|svelte|css|scss|html)$|(^|\/)(Dockerfile|Makefile|Procfile|requirements[^/]*\.txt)$/i;

const MANIFEST = /(^|\/)(package\.json|pyproject\.toml|requirements[^/]*\.txt|setup\.py|setup\.cfg|go\.mod|Cargo\.toml|pom\.xml|build\.gradle(\.kts)?|Gemfile|composer\.json|environment\.ya?ml)$/;
const CI = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const CONFIG = /(^|\/)(Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|tsconfig\.json|mypy\.ini|action\.ya?ml)$/;
const TEST =
  /(^|\/)(tests?|__tests__|specs?)\/|(^|\/)test_[^/]+\.py$|(^|\/)tests?\.(py|[cm]?[jt]sx?)$|_test\.(py|go|rb)$|_spec\.rb$|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)[A-Z]\w*Tests?\.(java|kt)$/;
const README = /(^|\/)readme(\.[a-z]+)?$/i;

const SIGNAL = /(route|router|api|view|controller|handler|endpoint|model|schema|service|worker|job|task|crud|migration|train|pipeline|agent|component)/i;

const TEST_CASE = /(^|\/)test_[^/]+\.py$|_test\.(py|go)$|\.(test|spec)\.(ts|tsx|js|jsx)$/;
const PACKAGE_MARKER = /(^|\/)__init__\.py$/;

/** Test files that are guaranteed a place before the file cap, so large source trees cannot hide a test suite. */
const TEST_RESERVE = 12;

function priority(path: string): number {
  if (MANIFEST.test(path)) return 0;
  if (CI.test(path) || (CONFIG.test(path) && path.split("/").length <= 2)) return 1;
  if (README.test(path) && !path.includes("/")) return 2;
  if (/\.(md|txt)$/i.test(path) || PACKAGE_MARKER.test(path)) return 6;
  if (TEST.test(path)) return 4;
  return SIGNAL.test(path) ? 3 : 5;
}

/** Moves up to TEST_RESERVE test cases (files that define tests, not fixtures or helpers) directly after the setup files. */
function reserveTests(ordered: TreeEntry[]): TreeEntry[] {
  const reserved = new Set(ordered.filter((e) => TEST_CASE.test(e.path)).slice(0, TEST_RESERVE));
  if (reserved.size === 0) return ordered;
  const rest = ordered.filter((e) => !reserved.has(e));
  const cut = rest.findIndex((e) => priority(e.path) > 2);
  const at = cut === -1 ? rest.length : cut;
  return [...rest.slice(0, at), ...reserved, ...rest.slice(at)];
}

const topDir = (path: string) => (path.includes("/") ? path.slice(0, path.indexOf("/")) : "");

/** Within one priority band, alternate between top-level directories so a large frontend cannot crowd out the backend. */
function interleave(entries: TreeEntry[]): TreeEntry[] {
  const bands = new Map<number, Map<string, TreeEntry[]>>();
  for (const entry of entries) {
    const band = priority(entry.path);
    const byDir = bands.get(band) ?? new Map<string, TreeEntry[]>();
    const list = byDir.get(topDir(entry.path)) ?? [];
    list.push(entry);
    byDir.set(topDir(entry.path), list);
    bands.set(band, byDir);
  }
  const ordered: TreeEntry[] = [];
  for (const band of [...bands.keys()].sort((a, b) => a - b)) {
    const queues = [...(bands.get(band) ?? new Map()).values()].map((q) =>
      q.sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path)),
    );
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) ordered.push(q.shift() as TreeEntry);
  }
  return ordered;
}

function classify(entry: TreeEntry): SkipReason | null {
  if (entry.type === "commit") return "submodule";
  if (entry.mode === "120000") return "symlink";
  if (VENDORED.test(entry.path)) return "vendored_or_generated";
  if (LOCKFILE.test(entry.path)) return "lockfile";
  if (SECRET.test(entry.path)) return "possible_secret";
  if (BINARY.test(entry.path)) return "binary";
  if (MINIFIED.test(entry.path)) return "minified";
  if (!TEXT.test(entry.path)) return "not_text";
  if ((entry.size ?? 0) > LIMITS.maxBytesPerFile) return "too_large";
  return null;
}

export function selectFiles(entries: TreeEntry[]): { selected: TreeEntry[]; skipped: SkippedFile[]; totalFiles: number } {
  const files = entries.filter((e) => e.type !== "tree");
  const skipped: SkippedFile[] = [];
  const eligible: TreeEntry[] = [];
  for (const entry of files) {
    const reason = classify(entry);
    if (reason) skipped.push({ path: entry.path, reason });
    else eligible.push(entry);
  }
  const selected: TreeEntry[] = [];
  let bytes = 0;
  for (const entry of reserveTests(interleave(eligible))) {
    const size = entry.size ?? 0;
    if (selected.length >= LIMITS.maxFilesPerRepository) {
      skipped.push({ path: entry.path, reason: "file_limit" });
      continue;
    }
    if (bytes + size > LIMITS.maxBytesPerRepository) {
      skipped.push({ path: entry.path, reason: "byte_limit" });
      continue;
    }
    selected.push(entry);
    bytes += size;
  }
  return { selected, skipped, totalFiles: files.length };
}

export const isReadme = (path: string) => README.test(path);
export const isTestFile = (path: string) => TEST.test(path);
export const isManifest = (path: string) => MANIFEST.test(path);
export const isCiWorkflow = (path: string) => CI.test(path);
export const isConfigFile = (path: string) => CONFIG.test(path);
