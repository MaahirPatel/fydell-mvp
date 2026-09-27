"""Benchmark fixture: PARTIAL — correct matching, but unmatched rows are
reduced to a count at the only call site; their payload never surfaces.

Expected deterministic findings (bug+security): SILENT_DROP.
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    dropped = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, dropped


def summarize(users, events):
    matched, dropped = merge_events(users, events)
    return {"matched": len(matched), "dropped": len(dropped)}
