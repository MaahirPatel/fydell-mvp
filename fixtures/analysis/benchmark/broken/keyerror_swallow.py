"""Benchmark fixture: BROKEN — swallows KeyError, silently skipping rows.

Malformed rows vanish without a trace instead of surfacing.
Expected deterministic findings (bug+security): none (RISKY_EXCEPT_HANDLER
is a risk, reported but not scored).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = []
    unmatched = []
    for e in events:
        try:
            key = normalize_id(e["user_id"])
        except KeyError:
            pass
        else:
            (matched if key in known else unmatched).append(e)
    return matched, unmatched
