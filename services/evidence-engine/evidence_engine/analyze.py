from __future__ import annotations

from typing import Any, Literal

JobType = Literal[
    "EXTRACT_EVIDENCE_INITIAL",
    "GENERATE_DEFENSE",
    "EXTRACT_EVIDENCE_FINAL",
    "GENERATE_DECISION_BRIEF",
]

RATING_AXES = {
    "STRONG_EVIDENCE": ("STRENGTH", "HIGH"),
    "MODERATE_EVIDENCE": ("STRENGTH", "MODERATE"),
    "LIMITED_EVIDENCE": ("CONCERN", "LOW"),
    "CONTRADICTORY_EVIDENCE": ("CONCERN", "HIGH"),
    "NOT_OBSERVED": ("INSUFFICIENT_EVIDENCE", "LOW"),
}


def _ids(events: list[dict[str, Any]], predicate) -> list[str]:
    return [str(e["id"]) for e in events if predicate(e)]


def _fact_seq(events: list[dict[str, Any]], fact_id: str) -> int | None:
    for e in events:
        if e.get("event_type") == "FACT_RELEASED" and (e.get("payload") or {}).get("fact_id") == fact_id:
            return int(e["sequence"])
    return None


def analyze(job_type: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    events: list[dict[str, Any]] = list(snapshot.get("events") or [])
    events.sort(key=lambda e: int(e.get("sequence") or 0))
    artifact = snapshot.get("artifact") or {}
    defense = snapshot.get("defense") or []
    rec = str(artifact.get("recommendation") or "")
    internal = str(artifact.get("internal_note") or "")
    customer = str(artifact.get("customer_message") or "")
    combined = f"{rec} {internal} {customer}".lower()

    auth_seq = _fact_seq(events, "AUTH_001")
    after_auth = [e for e in events if auth_seq is not None and int(e["sequence"]) > auth_seq]
    committed = any(e.get("event_type") == "DECISION_COMMITTED" for e in events)
    revised_after = any(e.get("event_type") == "ARTIFACT_REVISION" for e in after_auth)
    told_sales = any(
        (e.get("event_type") == "CANDIDATE_MESSAGE_SENT" and (e.get("payload") or {}).get("agent_id") == "sales")
        or "sales" in str((e.get("payload") or {}).get("informed") or "")
        for e in after_auth
    )
    rewrote_all = any((e.get("payload") or {}).get("rewrote_all") for e in after_auth) or (
        "throw away" in combined or "rebuild crm" in combined
    )
    ignored = auth_seq is not None and not revised_after and "original endpoint" in combined
    preserved = "preserve" in combined or "mapping" in combined or "account payload" in combined

    auth_event_ids = _ids(events, lambda e: e.get("event_type") == "FACT_RELEASED")
    revision_ids = _ids(after_auth, lambda e: e.get("event_type") == "ARTIFACT_REVISION")
    sales_ids = _ids(after_auth, lambda e: e.get("event_type") == "CANDIDATE_MESSAGE_SENT")
    decision_ids = _ids(events, lambda e: e.get("event_type") == "DECISION_COMMITTED")

    def claim(text: str, competency: str, rating: str, support: list[str], counter: list[str]) -> dict[str, Any]:
        if rating != "NOT_OBSERVED" and not support:
            support = decision_ids or auth_event_ids or [str(events[0]["id"])] if events else []
        direction, confidence = RATING_AXES[rating]
        return {
            "claim": text,
            "competency": competency,
            "direction": direction,
            "confidence": confidence,
            "supporting_event_ids": support,
            "counterevidence_event_ids": counter,
            "rubric_version": "adaptability_v1",
            "prompt_version": "evidence_extract_v1",
            "model_version": "rules_v1",
        }

    adapt_dir = "NOT_OBSERVED"
    adapt_support = auth_event_ids + revision_ids
    adapt_counter: list[str] = []
    if ignored:
        adapt_dir = "LIMITED_EVIDENCE"
        adapt_support = auth_event_ids
        adapt_counter = decision_ids
    elif rewrote_all:
        adapt_dir = "CONTRADICTORY_EVIDENCE"
        adapt_support = revision_ids or auth_event_ids
    elif revised_after and preserved:
        adapt_dir = "STRONG_EVIDENCE"
    elif revised_after:
        adapt_dir = "MODERATE_EVIDENCE"

    stake_dir = "NOT_OBSERVED"
    if told_sales:
        stake_dir = "STRONG_EVIDENCE"
    elif revised_after:
        stake_dir = "LIMITED_EVIDENCE"

    comm_dir = "MODERATE_EVIDENCE" if customer else "LIMITED_EVIDENCE"
    if "looking into it" in customer.lower() and revised_after:
        comm_dir = "LIMITED_EVIDENCE"
    if "friday is at risk" in customer.lower() or "auth constraint" in customer.lower():
        comm_dir = "STRONG_EVIDENCE"

    tech_dir = "STRONG_EVIDENCE" if ("compatible" in combined or "token exchange" in combined or "auth" in combined) else "MODERATE_EVIDENCE"
    if ignored:
        tech_dir = "LIMITED_EVIDENCE"

    claims = [
        claim(
            "Candidate showed evidence of adaptation after the authentication constraint changed."
            if adapt_dir != "LIMITED_EVIDENCE"
            else "Candidate did not update the plan after AUTH_001.",
            "adaptability",
            adapt_dir,
            adapt_support,
            adapt_counter,
        ),
        claim(
            "Candidate communicated the material delivery risk to sales."
            if told_sales
            else "Candidate did not inform sales after AUTH_001.",
            "stakeholder_escalation",
            stake_dir,
            sales_ids or adapt_support,
            [] if told_sales else revision_ids,
        ),
        claim(
            "Candidate produced a technical recommendation that engages the auth constraint.",
            "technical_reasoning",
            tech_dir,
            decision_ids or adapt_support,
            [],
        ),
        claim(
            "Candidate's customer communication after the fact.",
            "customer_communication",
            comm_dir,
            sales_ids or adapt_support,
            [],
        ),
    ]

    observations = [
        f"AUTH_001 sequence={auth_seq}",
        f"revised_after={revised_after}",
        f"told_sales={told_sales}",
        f"rewrote_all={rewrote_all}",
        f"ignored={ignored}",
        f"committed={committed}",
    ]
    contradictions = []
    if revised_after and ignored:
        contradictions.append("Revision events exist but recommendation still asserts the original endpoint.")
    if defense and ignored:
        contradictions.append("Defense may conflict with an unchanged recommendation.")

    uncertainties = []
    if revised_after and not told_sales:
        uncertainties.append("Technical update occurred without evidence of internal escalation.")
    if not defense and job_type == "EXTRACT_EVIDENCE_INITIAL":
        uncertainties.append("No oral defense yet; confidence in intent is limited.")

    if job_type == "EXTRACT_EVIDENCE_FINAL" and defense:
        joined = " ".join(d.get("response", "") for d in defense).lower()
        if "mapping was not invalidated" in joined or "only the auth path" in joined:
            claims[0]["direction"] = "STRENGTH"
            claims[0]["confidence"] = "HIGH"
        if "did not need to tell sales" in joined:
            claims[1]["direction"] = "CONCERN"
            claims[1]["confidence"] = "LOW"
            claims[1]["counterevidence_event_ids"] = sales_ids

    questions = []
    if revised_after and not told_sales:
        questions.append(
            {
                "prompt": "You changed the implementation after the authentication restriction, but there is no record that you informed sales. Why?",
                "target": "missing_communication",
            }
        )
    elif rewrote_all:
        questions.append(
            {
                "prompt": "After AUTH_001 you replaced far more than the invalidated endpoint. What did you believe had to change, and what could stay?",
                "target": "unexpected_revision",
            }
        )
    elif ignored:
        questions.append(
            {
                "prompt": "Engineering reported that the selected endpoint is incompatible with the customer's authentication. Your recommendation still uses the original path. Why?",
                "target": "ignored_fact",
            }
        )
    else:
        questions.append(
            {
                "prompt": "You changed the endpoint after AUTH_001. Why keep the rest of the original design?",
                "target": "preservation",
            }
        )
    questions.append(
        {
            "prompt": "If Friday is no longer honest, what exactly would you tell the customer versus sales?",
            "target": "stakeholder_conflict",
        }
    )

    strengths = [
        c["claim"]
        for c in claims
        if c["direction"] == "STRENGTH" and c["confidence"] == "HIGH"
    ][:3]
    concerns = [c["claim"] for c in claims if c["direction"] == "CONCERN"][:2]
    if not strengths:
        strengths = [c["claim"] for c in claims if c["direction"] == "STRENGTH"][:3]
    recommendation = "HOLD"
    if ignored or rewrote_all:
        recommendation = "HOLD"
    elif any(
        c["direction"] == "STRENGTH" and c["confidence"] == "HIGH"
        for c in claims
    ) and told_sales:
        recommendation = "STRONG_INTERVIEW"
    elif revised_after:
        recommendation = "INTERVIEW"
    else:
        recommendation = "INSUFFICIENT_EVIDENCE"

    brief = {
        "recommendation": recommendation,
        "why": "; ".join(observations[:3]),
        "strengths": strengths or ["Technical engagement with the scenario."],
        "concerns": concerns or uncertainties or ["Coverage is thin."],
        "probes": [q["prompt"] for q in questions[:3]],
    }

    if job_type == "GENERATE_DEFENSE":
        return {"job_type": job_type, "observations": observations, "contradictions": contradictions, "uncertainties": uncertainties, "defense_questions": questions[:5]}
    if job_type == "GENERATE_DECISION_BRIEF":
        return {"job_type": job_type, "brief": brief}
    return {
        "job_type": job_type,
        "observations": observations,
        "contradictions": contradictions,
        "uncertainties": uncertainties,
        "claims": claims,
        "defense_questions": questions if job_type == "EXTRACT_EVIDENCE_INITIAL" else [],
        "brief": brief if job_type == "EXTRACT_EVIDENCE_FINAL" else None,
    }
