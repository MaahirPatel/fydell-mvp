"""Benchmark fixture: correct ALTERNATIVE solution (dict-index approach).

Deliberately does not look like the reference set-comprehension solution.
A rubric must accept it (AI-03: alternative solutions allowed).
Expected deterministic findings (bug+security): none.
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    index = {}
    for u in users:
        index.setdefault(normalize_id(u.get("id")), u)
    matched, unmatched = [], []
    for e in events:
        bucket = matched if normalize_id(e.get("user_id")) in index else unmatched
        bucket.append(e)
    return matched, unmatched
