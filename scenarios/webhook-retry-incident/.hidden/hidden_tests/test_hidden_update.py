"""Hidden evaluation: the mid-session requirement update (Retry-After).

INTERNAL. Never packaged for candidates. The update is delivered in the team
thread during the attempt (see the scenario content); these tests assert only
what that message states.
"""

import pytest

from webhooks import DeliveryStatus, DeliveryStore, Dispatcher
from webhooks.retry import MAX_ATTEMPTS, MAX_DELAY_SECONDS, backoff_delay
from webhooks.transport import Response

from tests.fakes import FakeClock, FakeTransport, make_endpoint, make_event


@pytest.fixture
def env():
    clock, transport, store = FakeClock(), FakeTransport(), DeliveryStore()
    return clock, transport, store, Dispatcher(store, transport, clock)


def first_attempt(env, response):
    clock, transport, store, dispatcher = env
    transport.respond_with(response)
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    start = clock.now()
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.PENDING
    return delivery, start


@pytest.mark.parametrize("status", [429, 503])
def test_retry_after_seconds_is_honoured(env, status):
    delivery, start = first_attempt(env, Response(status, {"Retry-After": "120"}))
    assert delivery.next_attempt_at == start + 120


def test_retry_after_header_name_is_case_insensitive(env):
    delivery, start = first_attempt(env, Response(429, {"retry-after": "45"}))
    assert delivery.next_attempt_at == start + 45


def test_retry_after_is_capped_at_the_maximum_delay(env):
    delivery, start = first_attempt(env, Response(429, {"Retry-After": "86400"}))
    assert delivery.next_attempt_at == start + MAX_DELAY_SECONDS


@pytest.mark.parametrize("value", ["soon", "-5", "", "Wed, 21 Oct 2026 07:28:00 GMT"])
def test_unusable_retry_after_falls_back_to_backoff(env, value):
    delivery, start = first_attempt(env, Response(429, {"Retry-After": value}))
    assert delivery.next_attempt_at == start + backoff_delay(1)


def test_missing_retry_after_uses_backoff(env):
    delivery, start = first_attempt(env, Response(429, {}))
    assert delivery.next_attempt_at == start + backoff_delay(1)


def test_retry_after_does_not_extend_the_attempt_cap(env):
    clock, transport, store, dispatcher = env
    transport.default = Response(429, {"Retry-After": "5"})
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    for _ in range(MAX_ATTEMPTS + 5):
        dispatcher.process_due()
        if delivery.status is not DeliveryStatus.PENDING:
            break
        clock.set(delivery.next_attempt_at)
    assert delivery.status is DeliveryStatus.FAILED
    assert len(delivery.attempts) == MAX_ATTEMPTS
