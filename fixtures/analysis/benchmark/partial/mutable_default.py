"""Benchmark fixture: PARTIAL — mutable default argument.

The default dict is shared across calls; mutations leak between invocations.
Expected deterministic findings (bug+security): MUTABLE_DEFAULT_ARG.
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events, seen={}):
    known = {normalize_id(u["id"]) for u in users}
    matched = []
    unmatched = []
    for e in events:
        key = normalize_id(e["user_id"])
        if key in known:
            matched.append(e)
        else:
            unmatched.append(e)
            seen[key] = seen.get(key, 0) + 1
    return matched, unmatched
