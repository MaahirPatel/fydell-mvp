from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from evidence_engine.analyze import analyze  # noqa: E402


def main() -> None:
    raw = sys.stdin.read()
    payload = json.loads(raw)
    result = analyze(payload["job_type"], payload["snapshot"])
    json.dump({k: v for k, v in result.items() if v is not None}, sys.stdout)


if __name__ == "__main__":
    main()
