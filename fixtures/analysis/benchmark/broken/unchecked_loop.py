"""Benchmark fixture: BROKEN — unchecked key access on loop rows.

A row missing "user_id" raises KeyError at runtime.
Expected deterministic findings (bug+security): none (UNCHECKED_SUBSCRIPT
is a risk, reported but not scored).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = []
    unmatched = []
    for e in events:
        if normalize_id(e["user_id"]) in known:
            matched.append(e)
        else:
            unmatched.append(e)
    return matched, unmatched
