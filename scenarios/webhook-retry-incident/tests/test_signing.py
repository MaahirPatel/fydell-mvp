from webhooks.signing import sign, verify


def test_signature_round_trips():
    header = sign("whsec_1", 1_700_000_000, b'{"id":"evt_1"}')
    assert header.startswith("t=1700000000,v1=")
    assert verify("whsec_1", header, b'{"id":"evt_1"}')


def test_signature_rejects_tampered_body_or_wrong_secret():
    header = sign("whsec_1", 1_700_000_000, b'{"id":"evt_1"}')
    assert not verify("whsec_1", header, b'{"id":"evt_2"}')
    assert not verify("whsec_other", header, b'{"id":"evt_1"}')


def test_signature_rejects_malformed_header():
    assert not verify("whsec_1", "garbage", b"{}")
