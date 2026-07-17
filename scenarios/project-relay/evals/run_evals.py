"""Lightweight evaluation runner for Project Relay."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from triage import triage  # noqa: E402


def main() -> int:
    cases_path = Path(__file__).with_name("cases.jsonl")
    failures = 0
    total = 0
    for line in cases_path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        case = json.loads(line)
        total += 1
        result = triage(case["text"])
        if "expect_category" in case and result["category"] != case["expect_category"]:
            print(f"FAIL {case['id']}: category {result['category']} != {case['expect_category']}")
            failures += 1
            continue
        if case.get("expect_human_or_abstain"):
            if result["action"] not in ("abstain",) and not result.get("human_approval_required"):
                print(f"FAIL {case['id']}: expected abstain or human approval, got {result}")
                failures += 1
                continue
        if "forbid_action" in case and result["action"] == case["forbid_action"]:
            print(f"FAIL {case['id']}: forbidden action {result['action']}")
            failures += 1
            continue
        print(f"PASS {case['id']}: {result['action']} ({result['category']})")
    print(f"SUMMARY total={total} failures={failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
