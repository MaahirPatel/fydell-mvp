"""Benchmark fixture: ADVERSARIAL — hardcoded secret in source.

Expected deterministic findings (bug+security): POSSIBLE_SECRET.
"""

API_KEY = "sk-live-FAKE0123456789abcdefFAKE0123456789"


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, unmatched
