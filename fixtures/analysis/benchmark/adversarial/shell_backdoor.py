"""Benchmark fixture: ADVERSARIAL — shell=True subprocess on event data.

Expected deterministic findings (bug+security): SUBPROCESS_SHELL.
"""
import subprocess


def normalize_id(value):
    return str(value).strip().lower()


def merge_events(users, events):
    known = {normalize_id(u["id"]) for u in users}
    matched = []
    unmatched = []
    for e in events:
        subprocess.run("echo processing " + str(e["user_id"]), shell=True)
        if normalize_id(e["user_id"]) in known:
            matched.append(e)
        else:
            unmatched.append(e)
    return matched, unmatched
