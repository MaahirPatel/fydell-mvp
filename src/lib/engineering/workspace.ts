/**
 * Run workspace assembly (pure; no I/O).
 *
 * Turns the candidate's saved files into the exact file set an isolated
 * provider executes:
 *  - only files under the scenario's editable prefixes are sent;
 *  - provided test files are always restored to their pinned contents
 *    (RUN-04: candidate edits cannot replace trusted tests);
 *  - pytest configuration and conftest files from the candidate are dropped
 *    (they could rewrite collection or reporting);
 *  - hidden tests are mounted for evaluation runs only and never leave the
 *    server otherwise;
 *  - the hash of the candidate's editable files is computed here and bound to
 *    the result (DESK-12), so a later edit makes the result visibly stale.
 */

import { snapshotFiles } from "@/lib/desktop/run-controls";
import {
  MAX_SNAPSHOT_FILE_BYTES,
  MAX_SNAPSHOT_FILES,
  MAX_SNAPSHOT_TOTAL_BYTES,
  findCaseInsensitiveDuplicate,
  unsafeSnapshotPathReason,
} from "@/lib/simulations/submission-files";
import {
  RESULT_FILE_PLACEHOLDER,
  type IgnoredPath,
  type RunKind,
  type RunWorkspace,
  type TrustedMaterial,
} from "./types";

export const RUNNER_CONFIG_PATH = ".fydell-runner/pytest.ini";

const RUNNER_CONFIG_BASENAMES = new Set([
  "conftest.py",
  "pytest.ini",
  "pyproject.toml",
  "setup.cfg",
  "tox.ini",
  "sitecustomize.py",
  "usercustomize.py",
]);

export class WorkspaceRejected extends Error {
  constructor(
    readonly code: "PATH_UNSAFE" | "PATH_DUPLICATE" | "TOO_MANY_FILES" | "FILE_TOO_LARGE" | "TOTAL_TOO_LARGE" | "EMPTY",
    message: string,
    readonly path?: string
  ) {
    super(message);
    this.name = "WorkspaceRejected";
  }
}

function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

export function isTestFileName(p: string): boolean {
  const name = basename(p);
  return name.endsWith(".py") && (name.startsWith("test_") || name.endsWith("_test.py"));
}

function classifyIgnored(path: string, material: TrustedMaterial): IgnoredPath["reason"] | null {
  const { descriptor } = material;
  const mount = descriptor.hidden.mountDir.replace(/\/$/, "") + "/";
  if (path.startsWith(mount) || path.startsWith(".fydell-runner/") || path.startsWith(".fydell/")) {
    return "reserved_path";
  }
  const name = basename(path);
  if (RUNNER_CONFIG_BASENAMES.has(name) || name.endsWith(".pth")) return "runner_config_not_used";
  if (!descriptor.editablePrefixes.some((prefix) => path.startsWith(prefix))) return "outside_editable_area";
  return null;
}

function validateCandidateFiles(files: Record<string, string>): void {
  const paths = Object.keys(files);
  if (paths.length === 0) throw new WorkspaceRejected("EMPTY", "No files were sent. Save your work and try again.");
  if (paths.length > MAX_SNAPSHOT_FILES) {
    throw new WorkspaceRejected("TOO_MANY_FILES", `Too many files (${paths.length}; the limit is ${MAX_SNAPSHOT_FILES}).`);
  }
  let total = 0;
  for (const p of paths) {
    const reason = unsafeSnapshotPathReason(p);
    if (reason) throw new WorkspaceRejected("PATH_UNSAFE", `File path ${JSON.stringify(p)} is not allowed: ${reason}.`, p);
    const content = files[p];
    if (typeof content !== "string") throw new WorkspaceRejected("PATH_UNSAFE", `File ${JSON.stringify(p)} has no text content.`, p);
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_SNAPSHOT_FILE_BYTES) {
      throw new WorkspaceRejected("FILE_TOO_LARGE", `File ${JSON.stringify(p)} is larger than 1 MiB.`, p);
    }
    total += bytes;
  }
  if (total > MAX_SNAPSHOT_TOTAL_BYTES) throw new WorkspaceRejected("TOTAL_TOO_LARGE", "Your files exceed 5 MiB in total.");
  const dup = findCaseInsensitiveDuplicate(paths);
  if (dup) throw new WorkspaceRejected("PATH_DUPLICATE", `Files ${dup[0]} and ${dup[1]} differ only by letter case.`, dup[1]);
}

/** Hash of the candidate's editable files, as the candidate sees them. */
export function candidateSnapshot(files: Record<string, string>, material: TrustedMaterial) {
  const editable: Record<string, string> = {};
  for (const [p, content] of Object.entries(files)) {
    if (classifyIgnored(p, material) === null) editable[p] = content;
  }
  return { editable, ...snapshotFiles(editable) };
}

export function assembleRunWorkspace(
  kind: RunKind,
  candidateFiles: Record<string, string>,
  material: TrustedMaterial
): RunWorkspace {
  validateCandidateFiles(candidateFiles);
  const { descriptor, trusted, hidden } = material;

  const files: Record<string, string> = {};
  const ignored: IgnoredPath[] = [];
  const restoredTrusted: string[] = [];
  const candidateTestFiles: string[] = [];

  for (const path of Object.keys(candidateFiles).sort()) {
    const reason = classifyIgnored(path, material);
    if (reason) {
      ignored.push({ path, reason });
      continue;
    }
    if (path in trusted) {
      if (candidateFiles[path] !== trusted[path]) restoredTrusted.push(path);
      continue;
    }
    files[path] = candidateFiles[path];
    if (path.startsWith("tests/") && isTestFileName(path)) candidateTestFiles.push(path);
  }

  for (const [path, content] of Object.entries(trusted)) files[path] = content;
  files[RUNNER_CONFIG_PATH] = "[pytest]\n";

  const { hash, fileCount } = candidateSnapshot(candidateFiles, material);

  const common = [
    "-q",
    "-p",
    "no:cacheprovider",
    "-o",
    "junit_family=xunit1",
    "-c",
    RUNNER_CONFIG_PATH,
    "--rootdir",
    ".",
    `--junitxml=${RESULT_FILE_PLACEHOLDER}`,
  ];

  let targets: string[];
  if (kind === "evaluation") {
    const mount = descriptor.hidden.mountDir.replace(/\/$/, "");
    const initPath = `${mount}/__init__.py`;
    for (const [path, content] of Object.entries(hidden)) files[path] = content;
    if (!(initPath in files)) files[initPath] = "";
    // The verdict comes from pinned tests only; candidate-authored tests are
    // not collected in an evaluation run.
    targets = [...descriptor.trustedFiles.filter(isTestFileName).sort(), mount];
  } else {
    targets = ["tests"];
  }

  return {
    kind,
    files,
    pytestArgs: [...common, ...targets],
    candidateSnapshotHash: hash,
    candidateFileCount: fileCount,
    restoredTrusted,
    ignored,
    candidateTestFiles,
  };
}
