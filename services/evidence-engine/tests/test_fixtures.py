from evidence_engine.analyze import analyze

# Fixture snapshots mirror src/lib/proof/fixtures.ts


def _event(seq: int, typ: str, source: str, payload: dict, eid: str) -> dict:
    return {
        "id": eid,
        "run_id": "fixture",
        "sequence": seq,
        "event_type": typ,
        "event_version": 1,
        "source": source,
        "actor_type": "candidate" if source == "CANDIDATE" else "world",
        "actor_id": None,
        "stage_id": "DISCOVERY",
        "occurred_at": None,
        "recorded_at": "2026-01-01T00:00:00Z",
        "payload": payload,
    }


def fixture_c():
    return {
        "run_id": "fixture-c",
        "stage": "COMPLETE",
        "released_facts": ["AUTH_001"],
        "artifact": {
            "diagnosis": "",
            "recommendation": "Continue with the original endpoint. Friday is fine.",
            "customer_message": "",
            "internal_note": "",
            "assumptions": "",
            "limitations": "",
        },
        "events": [
            _event(1, "DECISION_COMMITTED", "CANDIDATE", {"kind": "preliminary"}, "c1"),
            _event(2, "FACT_RELEASED", "WORLD", {"fact_id": "AUTH_001"}, "c2"),
        ],
        "defense": [],
    }


def fixture_d():
    return {
        "run_id": "fixture-d",
        "stage": "COMPLETE",
        "released_facts": ["AUTH_001", "SALES_001", "CUSTOMER_001"],
        "artifact": {
            "diagnosis": "",
            "recommendation": "Replace the incompatible endpoint; preserve account mapping; give sales a honest Friday risk.",
            "customer_message": "We found an auth constraint. Friday is at risk until engineering confirms capacity.",
            "internal_note": "Told sales immediately.",
            "assumptions": "",
            "limitations": "",
        },
        "events": [
            _event(1, "DECISION_COMMITTED", "CANDIDATE", {"kind": "preliminary"}, "d1"),
            _event(2, "FACT_RELEASED", "WORLD", {"fact_id": "AUTH_001"}, "d2"),
            _event(3, "ARTIFACT_REVISION", "CANDIDATE", {"after_fact": "AUTH_001"}, "d3"),
            _event(4, "CANDIDATE_MESSAGE_SENT", "CANDIDATE", {"agent_id": "sales"}, "d4"),
        ],
        "defense": [
            {
                "prompt": "You changed the endpoint after AUTH_001. Why keep the account mapping?",
                "response": "The mapping was not invalidated. Only the auth path was.",
            }
        ],
    }


def test_c_is_not_strong_interview():
    brief = analyze("GENERATE_DECISION_BRIEF", fixture_c())["brief"]
    assert brief["recommendation"] != "STRONG_INTERVIEW"
    claims = analyze("EXTRACT_EVIDENCE_FINAL", fixture_c())["claims"]
    adapt = next(c for c in claims if c["competency"] == "adaptability")
    assert adapt["direction"] == "CONCERN"
    assert adapt["supporting_event_ids"]


def test_d_is_strong():
    claims = analyze("EXTRACT_EVIDENCE_FINAL", fixture_d())["claims"]
    adapt = next(c for c in claims if c["competency"] == "adaptability")
    assert adapt["direction"] == "STRENGTH"
    assert adapt["confidence"] == "HIGH"
    brief = analyze("GENERATE_DECISION_BRIEF", fixture_d())["brief"]
    assert brief["recommendation"] == "STRONG_INTERVIEW"


def test_pass_a_questions_are_specific():
    out = analyze("GENERATE_DEFENSE", fixture_c())
    assert out["defense_questions"]
    assert "tell me about a time" not in out["defense_questions"][0]["prompt"].lower()
    assert "AUTH_001" in out["defense_questions"][0]["prompt"] or "authentication" in out["defense_questions"][0]["prompt"].lower()
