"""Benchmark fixture: BROKEN — lossy default wiring.

naive_merge silently drops rows; robust_merge reconciles them. summarize()
defaults to the lossy implementation while the reconciled alternative sits
unused. Expected deterministic findings (bug+security): SILENT_DROP,
FRAGILE_ID_JOIN, LOSSY_DEFAULT_WIRING.
"""


def normalize_id(value):
    return str(value).strip().lower()


def naive_merge(users, events):
    known = {u["id"] for u in users}
    matched = [e for e in events if e["user_id"] in known]
    dropped = [e for e in events if e["user_id"] not in known]
    return matched, dropped


def robust_merge(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    return matched, []


def summarize(users, events, merge_fn=naive_merge):
    matched, dropped = merge_fn(users, events)
    return {"matched": len(matched), "dropped": len(dropped)}
