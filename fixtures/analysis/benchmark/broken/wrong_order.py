"""Benchmark fixture: BROKEN — semantic inversion (returns unmatched first).

The code is syntactically fine and pattern-clean, but the return order is
swapped: callers unpacking (matched, unmatched) get them backwards.
This is a KNOWN DETECTOR BLIND SPOT: no AST pattern sees the inversion.
Only authoritative tests catch it.
Expected deterministic findings (bug+security): none (honest miss).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return unmatched, matched
