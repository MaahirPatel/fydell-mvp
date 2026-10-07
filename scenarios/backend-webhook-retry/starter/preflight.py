"""Setup check. Run before you press Start in Fydell:  python preflight.py

This only checks your machine. It does not grade anything and it does not
send any data anywhere.
"""

import hashlib
import subprocess
import sys

SCENARIO = "backend-webhook-retry:v2"
SUPPORTED = ((3, 11), (3, 12), (3, 13))


def main() -> int:
    version = sys.version_info[:2]
    label = f"{version[0]}.{version[1]}"
    if version not in SUPPORTED:
        print(f"Python {label} is not supported for this task. Install 3.11, 3.12 or 3.13.")
        return 1

    result = subprocess.run(
        [sys.executable, "-m", "unittest", "-q"],
        capture_output=True,
        text=True,
    )
    tail = (result.stderr or result.stdout).strip().splitlines()
    summary = tail[-1] if tail else "no output"
    if "Ran " not in (result.stderr + result.stdout):
        print("The public tests could not be collected. Run this from the project root.")
        print(summary)
        return 1

    code = hashlib.sha256(f"{SCENARIO}:{label}".encode()).hexdigest()[:8].upper()
    print(f"Python {label} OK. Public tests ran ({summary}).")
    print("Some public tests are expected to fail before you start; that is the incident.")
    print(f"Setup code: HWR-{code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
