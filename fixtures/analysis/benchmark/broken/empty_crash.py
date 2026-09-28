"""Benchmark fixture: BROKEN — crashes on empty input (IndexError).

The first-event shortcut assumes a non-empty list.
Expected deterministic findings (bug+security): none (honest miss — the
unchecked-subscript detector only covers string keys on loop/ingest vars).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    first = events[0]
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, unmatched, first
