/**
 * Trusted run bootstrap shared by every execution provider.
 *
 * The bootstrap runs inside the provider's isolation boundary. It writes the
 * workspace to a fresh temporary directory, runs pytest in a CHILD process
 * (so candidate code never runs in the bootstrap's own process), applies
 * resource limits where the OS supports them, bounds the captured output,
 * and prints one envelope line that the server parses:
 *
 *   FYDELL-RESULT:<nonce>:<base64 json>
 *
 * The nonce is only in the payload, which the bootstrap deletes after reading,
 * so candidate code cannot easily forge the envelope. Candidate output is
 * captured from the child's pipe and returned as data, never interpreted.
 */

import { randomBytes } from "node:crypto";
import type { ProviderRequest } from "./types";

export const BOOTSTRAP_VERSION = "fydell-bootstrap/1";

export const BOOTSTRAP_PY = String.raw`
import base64, json, os, shutil, subprocess, sys, tempfile, threading

def load_payload():
    if len(sys.argv) > 1 and sys.argv[1] != "-":
        path = sys.argv[1]
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        try:
            os.remove(path)
        except OSError:
            pass
        return data
    return json.loads(sys.stdin.read())

payload = load_payload()
nonce = payload["nonce"]
work = tempfile.mkdtemp(prefix="fydell-ws-")
results_dir = tempfile.mkdtemp(prefix="fydell-res-")
result_file = os.path.join(results_dir, "results-" + nonce + ".xml")

def emit(obj):
    blob = base64.b64encode(json.dumps(obj).encode("utf-8")).decode("ascii")
    sys.stdout.write("\nFYDELL-RESULT:" + nonce + ":" + blob + "\n")
    sys.stdout.flush()

try:
    for rel, content in payload["files"].items():
        parts = rel.split("/")
        if rel.startswith("/") or "\\" in rel or any(p in ("", ".", "..") for p in parts):
            emit({"bootstrapError": "unsafe path"})
            sys.exit(0)
        full = os.path.join(work, *parts)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8", newline="") as fh:
            fh.write(content)

    args = [a.replace("{RESULT_FILE}", result_file) for a in payload["pytestArgs"]]
    timeout = float(payload["timeoutSeconds"])
    max_bytes = int(payload["maxOutputBytes"])
    env = {
        "PATH": os.environ.get("PATH", ""),
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONHASHSEED": "0",
        "PYTHONIOENCODING": "utf-8",
        "HOME": work,
        "LANG": "C.UTF-8",
    }
    for keep in ("SYSTEMROOT", "TEMP", "TMP"):
        if keep in os.environ:
            env[keep] = os.environ[keep]

    posix = os.name == "posix"

    def limit_resources():
        import resource
        cpu = int(timeout) + 5
        for name, value in (
            ("RLIMIT_CPU", (cpu, cpu)),
            ("RLIMIT_AS", (1024 * 1024 * 1024, 1024 * 1024 * 1024)),
            ("RLIMIT_NPROC", (256, 256)),
            ("RLIMIT_FSIZE", (32 * 1024 * 1024, 32 * 1024 * 1024)),
            ("RLIMIT_NOFILE", (256, 256)),
        ):
            try:
                resource.setrlimit(getattr(resource, name), value)
            except (ValueError, OSError, AttributeError):
                pass

    cmd = [sys.executable, "-I", "-B", "-m", "pytest"] + args
    proc = subprocess.Popen(
        cmd,
        cwd=work,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        preexec_fn=limit_resources if posix else None,
        start_new_session=posix,
    )
    captured = bytearray()
    state = {"total": 0}

    def drain():
        while True:
            chunk = proc.stdout.read(8192)
            if not chunk:
                break
            state["total"] += len(chunk)
            room = max_bytes - len(captured)
            if room > 0:
                captured.extend(chunk[:room])

    reader = threading.Thread(target=drain, daemon=True)
    reader.start()
    timed_out = False
    try:
        proc.wait(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        try:
            if posix:
                import signal
                os.killpg(proc.pid, signal.SIGKILL)
            else:
                proc.kill()
        except OSError:
            pass
        proc.wait()
    reader.join(timeout=5)

    junit = None
    if os.path.exists(result_file):
        with open(result_file, encoding="utf-8", errors="replace") as fh:
            junit = fh.read(8 * 1024 * 1024)

    emit({
        "exitCode": None if timed_out else proc.returncode,
        "timedOut": timed_out,
        "output": captured.decode("utf-8", errors="replace"),
        "outputTruncated": state["total"] > max_bytes,
        "junitXml": junit,
    })
finally:
    shutil.rmtree(work, ignore_errors=True)
    shutil.rmtree(results_dir, ignore_errors=True)
`;

export interface BootstrapPayload extends ProviderRequest {
  nonce: string;
}

export function newPayload(request: ProviderRequest): BootstrapPayload {
  return { ...request, nonce: randomBytes(16).toString("hex") };
}

export interface BootstrapEnvelope {
  exitCode: number | null;
  timedOut: boolean;
  output: string;
  outputTruncated: boolean;
  junitXml: string | null;
  bootstrapError?: string;
}

/** Finds the LAST envelope line carrying this run's nonce. */
export function parseEnvelope(stdout: string, nonce: string): BootstrapEnvelope | null {
  const marker = `FYDELL-RESULT:${nonce}:`;
  const at = stdout.lastIndexOf(marker);
  if (at === -1) return null;
  const end = stdout.indexOf("\n", at);
  const blob = stdout.slice(at + marker.length, end === -1 ? undefined : end).trim();
  try {
    const parsed = JSON.parse(Buffer.from(blob, "base64").toString("utf8")) as BootstrapEnvelope;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      exitCode: typeof parsed.exitCode === "number" ? parsed.exitCode : null,
      timedOut: parsed.timedOut === true,
      output: typeof parsed.output === "string" ? parsed.output : "",
      outputTruncated: parsed.outputTruncated === true,
      junitXml: typeof parsed.junitXml === "string" ? parsed.junitXml : null,
      bootstrapError: typeof parsed.bootstrapError === "string" ? parsed.bootstrapError : undefined,
    };
  } catch {
    return null;
  }
}
