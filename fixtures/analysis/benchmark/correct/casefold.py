"""Benchmark fixture: correct, using casefold for Unicode-safe normalization.

Expected deterministic findings (bug+security): none.
"""


def normalize_id(value):
    return str(value).strip().casefold()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, unmatched
