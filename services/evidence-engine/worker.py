"""Fydell evidence worker skeleton.

Reads one permitted run snapshot from stdin and writes one schema-shaped result
to stdout. It owns no product state and performs no database writes.
"""

from __future__ import annotations

import json
import sys
from typing import Any


def require_object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be an object")
    return value


def event_by_type(events: list[dict[str, Any]], event_type: str) -> dict[str, Any]:
    for event in events:
        if event.get("eventType") == event_type:
            return event
    raise ValueError(f"missing required event: {event_type}")


def analyze(snapshot: dict[str, Any]) -> dict[str, Any]:
    run_id = snapshot.get("runId")
    analysis_pass = snapshot.get("analysisPass")
    events = snapshot.get("events")
    artifacts = snapshot.get("artifacts")
    if not isinstance(run_id, str) or not run_id:
        raise ValueError("runId is required")
    if analysis_pass not in ("A", "B"):
        raise ValueError("analysisPass must be A or B")
    if not isinstance(events, list) or not isinstance(artifacts, list):
        raise ValueError("events and artifacts must be arrays")

    typed_events = [require_object(item, "event") for item in events]
    typed_artifacts = [require_object(item, "artifact") for item in artifacts]
    for index, event in enumerate(typed_events, start=1):
        if event.get("sequence") != index:
            raise ValueError("event sequence must be monotonic and contiguous")

    preliminary = event_by_type(typed_events, "PRELIMINARY_RECOMMENDATION_SUBMITTED")
    fact = event_by_type(typed_events, "FACT_RELEASED")
    revision = event_by_type(typed_events, "ARTIFACT_REVISION")
    if len(typed_artifacts) != 2:
        raise ValueError("exactly two artifact revisions are required")

    before = str(typed_artifacts[0].get("content", "")).strip()
    after = str(typed_artifacts[1].get("content", "")).strip()
    adaptation_terms = ("supported", "compatible", "server-to-server", "api key", "service account")
    adapted = before != after and any(term in after.lower() for term in adaptation_terms)

    defense_event: dict[str, Any] | None = None
    defense_questions = snapshot.get("defenseQuestions", [])
    defense_strengthened = False
    if analysis_pass == "B":
        defense_event = event_by_type(typed_events, "DEFENSE_RESPONSE_SUBMITTED")
        if not isinstance(defense_questions, list) or len(defense_questions) == 0:
            raise ValueError("pass B requires defense questions")
        responses = [
            str(require_object(item, "defense question").get("response", "")).strip().lower()
            for item in defense_questions
        ]
        if any(not response for response in responses):
            raise ValueError("pass B requires completed defense responses")
        validation_terms = ("validate", "sandbox", "production", "test", "evidence", "authentication")
        defense_strengthened = any(
            term in response for response in responses for term in validation_terms
        )

    if adapted and (analysis_pass == "A" or defense_strengthened):
        direction = "STRENGTH"
        confidence = "HIGH"
        if analysis_pass == "A":
            statement = (
                "After the authentication constraint was released, the candidate revised the "
                "recommendation to a supported integration path instead of preserving the "
                "incompatible endpoint choice."
            )
        else:
            statement = (
                "The candidate revised the incompatible endpoint choice and then strengthened "
                "the explanation in oral defense by naming the production-shaped validation "
                "needed before committing to the new path."
            )
    else:
        direction = "CONCERN"
        confidence = "MODERATE" if adapted else "LOW"
        if analysis_pass == "B" and adapted:
            statement = (
                "The candidate revised the endpoint after the authentication constraint, but "
                "the oral defense did not establish how the revised path would be validated "
                "before a production commitment."
            )
        else:
            statement = (
                "The candidate revised the artifact after the authentication constraint, but "
                "the revision does not clearly establish a supported compatible path."
            )

    supporting_event_ids = [str(fact["id"]), str(revision["id"])]
    if defense_event is not None:
        supporting_event_ids.append(str(defense_event["id"]))

    return {
        "resultVersion": "1",
        "runId": run_id,
        "analysisPass": analysis_pass,
        "claim": {
            "competency": "ADAPTATION",
            "direction": direction,
            "confidence": confidence,
            "statement": statement,
            "supportingEventIds": supporting_event_ids,
            "counterEventIds": [str(preliminary["id"])],
            "sourceArtifactIds": [
                str(typed_artifacts[0]["id"]),
                str(typed_artifacts[1]["id"]),
            ],
            "modelVersion": "deterministic-python-1.0.0",
            "rubricVersion": str(snapshot.get("rubricVersion", "unknown")),
            "promptVersion": str(snapshot.get("promptVersion", "unknown")),
        },
        "defenseQuestions": (
            [
                "What production evidence would you require before committing to the "
                "revised authentication path, and what would make you change course again?"
            ]
            if analysis_pass == "A"
            else []
        ),
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        snapshot = require_object(payload, "snapshot")
        json.dump(analyze(snapshot), sys.stdout, separators=(",", ":"))
        return 0
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        json.dump({"error": str(error)}, sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
