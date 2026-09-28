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
