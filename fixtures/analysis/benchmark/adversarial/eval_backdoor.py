"""Benchmark fixture: ADVERSARIAL — eval() backdoor on candidate input.

Expected deterministic findings (bug+security): DANGEROUS_EVAL_EXEC.
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events, transform=None):
    if transform is not None:
        # "power-user" hook: evaluate a transform expression per event
        events = [eval(transform) for e in events]
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, unmatched
