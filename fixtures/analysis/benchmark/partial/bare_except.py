"""Benchmark fixture: PARTIAL — bare except swallows load errors.

Merge logic itself is fine; the risk is the error handling, not the algorithm.
Expected deterministic findings (bug+security): none (RISKY_EXCEPT_HANDLER is
a risk, reported but not scored).
"""


def normalize_id(value):
    return str(value).strip().lower()


def load_events(path):
    try:
        with open(path) as fh:
            return [line.strip() for line in fh]
    except:
        return []


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e) in known]
    unmatched = [e for e in events if normalize_id(e) not in known]
    return matched, unmatched
