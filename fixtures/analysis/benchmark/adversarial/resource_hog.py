"""Benchmark fixture: ADVERSARIAL — resource exhaustion (infinite loop).

The analyzer never executes code, so this is statically clean — but at
runtime it would hang the worker. Resource limits + wall-clock kill
(RUN-02) are the defense, verified NEEDS-LIVE against the real sandbox.
Expected deterministic findings (bug+security): none (honest miss).
"""


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    while True:
        # "retry until all events match" — never terminates
        pass
    return [], []
