"""Evaluator-controlled probe harness. Never shipped in the starter archive.

Usage (cwd = candidate project root):
    python -I -B harness.py <probe_id> <nonce>

Prints exactly one line to the original stdout: "<nonce><json>". The JSON holds
raw observations only. Pass/fail is decided outside the sandbox by comparing
these observations to expectations this process never sees.
"""

import contextlib
import io
import json
import os
import sys
import traceback

PROBE_ID = sys.argv[1] if len(sys.argv) > 1 else ""
NONCE = sys.argv[2] if len(sys.argv) > 2 else ""
OUT_FD = os.dup(1)
DELIVERY_ID = "dlv_probe_7f3a"
START = 1_700_000_000.0


def emit(obj):
    os.write(OUT_FD, (NONCE + json.dumps(obj, sort_keys=True) + "\n").encode("utf-8"))


sys.path.insert(0, os.getcwd())


class TrustedClock:
    def __init__(self, start=START):
        self._now = float(start)

    def now(self):
        return self._now

    def set(self, value):
        self._now = float(value)

    def advance(self, seconds):
        self._now += seconds


def load():
    from webhooks import dispatcher as dispatcher_mod
    from webhooks import models as models_mod
    from webhooks import store as store_mod
    from webhooks import transport as transport_mod

    return dispatcher_mod, models_mod, store_mod, transport_mod


class TrustedTransport:
    def __init__(self, script, response_cls, error_cls):
        self.script = list(script)
        self.response_cls = response_cls
        self.error_cls = error_cls
        self.requests = []

    def send(self, url, body, headers):
        self.requests.append({"url": url, "headers": {str(k): str(v) for k, v in dict(headers).items()}})
        if not self.script:
            return self.response_cls(200, {})
        kind, value, hdrs = self.script.pop(0)
        if kind == "error":
            raise self.error_cls(value)
        return self.response_cls(value, dict(hdrs))


def resp(code, headers=None):
    return ("status", code, headers or {})


def terr(message="connect timeout after 10s"):
    return ("error", message, {})


def header(headers, name):
    for key, value in headers.items():
        if key.lower() == name.lower():
            return value
    return None


def snapshot(delivery, tick_start):
    offset = None
    if delivery.status == "pending" and delivery.next_attempt_at is not None:
        offset = round(float(delivery.next_attempt_at) - tick_start, 3)
    return {
        "status": delivery.status,
        "attempts": int(delivery.attempts),
        "offset": offset,
        "code": delivery.last_status_code,
        "has_error": bool(delivery.last_error),
    }


def run_single(script, ticks):
    dispatcher_mod, models_mod, store_mod, transport_mod = load()
    clock = TrustedClock()
    store = store_mod.InMemoryDeliveryStore()
    delivery = models_mod.Delivery(
        id=DELIVERY_ID,
        endpoint_url="https://probe.example/hooks",
        payload={"type": "payment.succeeded", "amount": 1234},
        next_attempt_at=clock.now(),
    )
    store.add(delivery)
    transport = TrustedTransport(script, transport_mod.Response, transport_mod.TransportError)
    dispatcher = dispatcher_mod.Dispatcher(store, transport, clock)
    steps = []
    for _ in range(ticks):
        tick_start = clock.now()
        dispatcher.process_due()
        current = store.get(DELIVERY_ID)
        steps.append(snapshot(current, tick_start))
        if current.status == "pending" and current.next_attempt_at is not None:
            clock.set(max(clock.now(), float(current.next_attempt_at)))
        else:
            clock.advance(7200)
    keys = [header(r["headers"], "Idempotency-Key") for r in transport.requests]
    return {
        "steps": steps,
        "requests": len(transport.requests),
        "keys_match_id": bool(keys) and all(k == DELIVERY_ID for k in keys),
    }


def probe_due_filtering():
    dispatcher_mod, models_mod, store_mod, transport_mod = load()
    clock = TrustedClock()
    store = store_mod.InMemoryDeliveryStore()
    store.add(models_mod.Delivery(id="dlv_now", endpoint_url="https://a.example/h", payload={"n": 1}, next_attempt_at=clock.now()))
    store.add(models_mod.Delivery(id="dlv_later", endpoint_url="https://b.example/h", payload={"n": 2}, next_attempt_at=clock.now() + 300))
    transport = TrustedTransport([resp(200), resp(200)], transport_mod.Response, transport_mod.TransportError)
    dispatcher = dispatcher_mod.Dispatcher(store, transport, clock)
    dispatcher.process_due()
    first = len(transport.requests)
    dispatcher.process_due()
    second = len(transport.requests)
    later = store.get("dlv_later")
    return {
        "requests_after_first": first,
        "requests_after_second": second,
        "later_attempts": int(later.attempts),
        "later_status": later.status,
    }


def per_code(codes, ticks):
    out = {}
    for code in codes:
        result = run_single([resp(code)], ticks)
        out[str(code)] = dict(result["steps"][-1], requests=result["requests"])
    return out


PROBES = {
    "P1": lambda: run_single([resp(200)], 1),
    "P2": lambda: run_single([resp(500)], 1),
    "P3": lambda: run_single([resp(410)], 2),
    "P4": lambda: run_single([resp(500), resp(500), resp(200)], 3),
    "H1": lambda: run_single([resp(500)] * 8, 9),
    "H2": lambda: per_code([408, 429, 502, 503, 504], 1),
    "H3": lambda: per_code([301, 400, 401, 404, 422], 2),
    "H4": lambda: {"single": run_single([terr()], 1), "recovers": run_single([terr(), resp(200)], 2)},
    "H5": probe_due_filtering,
    "H6": lambda: run_single(
        [resp(500), terr(), resp(503), resp(500), resp(429), resp(502), resp(504), resp(500)], 9
    ),
    "U1": lambda: run_single([resp(429, {"Retry-After": "900"})], 1),
    "U2": lambda: run_single([resp(503, {"retry-after": "5"})], 1),
    "U3": lambda: run_single([resp(429, {"Retry-After": "99999"})], 1),
    "U4": lambda: run_single([resp(429, {"Retry-After": "soon"})], 1),
    "U5": lambda: run_single([resp(500), resp(500), resp(500), resp(429, {"RETRY-AFTER": "30"})], 4),
}


def main():
    probe = PROBES.get(PROBE_ID)
    if probe is None:
        emit({"harness_error": "unknown_probe"})
        return
    sink = io.StringIO()
    try:
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            observation = probe()
        emit({"observation": observation})
    except BaseException as exc:  # candidate code may raise anything, including SystemExit
        frames = traceback.extract_tb(exc.__traceback__)
        where = None
        for frame in reversed(frames):
            if "harness.py" not in frame.filename:
                where = f"{os.path.relpath(frame.filename)}:{frame.lineno}"
                break
        emit({"candidate_error": f"{type(exc).__name__}: {str(exc)[:200]}", "where": where})


main()
