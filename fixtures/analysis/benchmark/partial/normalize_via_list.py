"""Benchmark fixture: PARTIAL — normalization exists but is applied through
an intermediate list, so the set-membership path is not normalized.

This is a KNOWN DETECTOR BLIND SPOT: the author genuinely normalizes, but the
fragile-join detector only recognizes normalization applied inline at the set
construction. Case-differing ids still fail to match at runtime.
Expected deterministic findings (bug+security): none (honest miss — the
detector cannot see through the intermediate list).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    normalized_ids = [normalize_id(u["id"]) for u in users]
    known = set(normalized_ids)
    matched = [e for e in events if e["user_id"] in known]
    dropped = [e for e in events if e["user_id"] not in known]
    return matched, dropped
