"""Benchmark fixture: PARTIAL — exact-match join, no normalization.

Rows whose ids differ in case/whitespace/padding are silently excluded.
Expected deterministic findings (bug+security): FRAGILE_ID_JOIN.
"""


def merge_events(users, events):
    known = {u["id"] for u in users}
    matched = [e for e in events if e["user_id"] in known]
    dropped = [e for e in events if e["user_id"] not in known]
    return matched, dropped
