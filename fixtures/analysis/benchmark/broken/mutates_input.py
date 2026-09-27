"""Benchmark fixture: BROKEN — mutates the caller's input in place.

merge_events rewrites user_id on the caller's event dicts as a side effect.
Pattern detectors do not track mutation of inputs.
Expected deterministic findings (bug+security): none (honest miss).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = []
    unmatched = []
    for e in events:
        e["user_id"] = normalize_id(e["user_id"])
        if e["user_id"] in known:
            matched.append(e)
        else:
            unmatched.append(e)
    return matched, unmatched
