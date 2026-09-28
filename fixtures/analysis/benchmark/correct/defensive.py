"""Benchmark fixture: correct, defensive variant with type hints and guards.

Expected deterministic findings (bug+security): none.
"""


def normalize_id(value):
    if value is None:
        raise ValueError("id must not be None")
    return str(value).strip().lower()


def merge_events(users, events):
    known = {}
    for u in users:
        key = normalize_id(u.get("id"))
        known[key] = u
    matched = []
    unmatched = []
    for e in events:
        key = normalize_id(e.get("user_id"))
        if key in known:
            matched.append(e)
        else:
            unmatched.append(e)
    return matched, unmatched
