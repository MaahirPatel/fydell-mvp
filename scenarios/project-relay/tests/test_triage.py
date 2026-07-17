import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from triage import classify, triage


def test_outage_is_p0():
    assert classify("Production API is down") == "incident_p0"


def test_security_detected():
    assert classify("credential stuffing unauthorized") == "security"


def test_sensitive_low_confidence_abstains():
    result = triage("Please refund this charge immediately")
    assert result["action"] == "abstain" or result["human_approval_required"] is True


def test_general_reply():
    result = triage("How do I reset my password?")
    assert result["category"] == "general"
    assert result["action"] in ("reply_template", "request_info", "abstain")
