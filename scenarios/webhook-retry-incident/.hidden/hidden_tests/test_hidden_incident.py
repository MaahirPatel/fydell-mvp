"""Hidden evaluation: INC-2291 fix, beyond the two public reproductions.

INTERNAL. Never packaged for candidates. Assertions only cover behaviour the
candidate-visible runbook states unambiguously. 404 handling is deliberately
not asserted: it is a judgment call (see the rubric).
"""

import pytest

from webhooks import DeliveryStatus, DeliveryStore, Dispatcher
from webhooks.retry import MAX_ATTEMPTS

from tests.fakes import FakeClock, FakeTransport, connection_refused, make_endpoint, make_event


def settle(dispatcher, store, clock, max_steps=60):
    for _ in range(max_steps):
        dispatcher.process_due()
        pending = [d for d in store.all() if d.status is DeliveryStatus.PENDING]
        if not pending:
            return
        clock.set(min(d.next_attempt_at for d in pending))
    raise AssertionError("deliveries did not settle")


@pytest.fixture
def env():
    clock, transport, store = FakeClock(), FakeTransport(), DeliveryStore()
    return clock, transport, store, Dispatcher(store, transport, clock)


@pytest.mark.parametrize("status", [400, 401, 403, 410, 422])
def test_permanent_client_errors_fail_after_one_attempt(env, status):
    clock, transport, store, dispatcher = env
    transport.default = status
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    settle(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.FAILED
    assert len(delivery.attempts) == 1
    assert delivery.failure_reason and "attempts_exhausted" not in delivery.failure_reason


@pytest.mark.parametrize("status", [408, 429, 500, 502, 503, 504])
def test_transient_statuses_are_still_retried(env, status):
    clock, transport, store, dispatcher = env
    transport.respond_with(status)
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.PENDING
    settle(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.DELIVERED
    assert len(delivery.attempts) == 2


def test_network_failures_are_still_retried(env):
    clock, transport, store, dispatcher = env
    transport.respond_with(connection_refused(), connection_refused())
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    settle(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.DELIVERED
    assert len(delivery.attempts) == 3


@pytest.mark.parametrize("status", [200, 201, 202, 204])
def test_any_2xx_is_delivered(env, status):
    clock, transport, store, dispatcher = env
    transport.default = status
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.DELIVERED


def test_retry_cap_still_applies_to_transient_errors(env):
    clock, transport, store, dispatcher = env
    transport.default = 500
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    settle(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.FAILED
    assert len(delivery.attempts) == MAX_ATTEMPTS


def test_republish_returns_the_existing_delivery(env):
    clock, transport, store, dispatcher = env
    event, endpoint = make_event("evt_a"), make_endpoint("ep_a")
    first = dispatcher.enqueue(event, endpoint)
    second = dispatcher.enqueue(event, endpoint)
    assert second.id == first.id
    assert len(store.all()) == 1


def test_republish_after_delivery_sends_nothing(env):
    clock, transport, store, dispatcher = env
    event, endpoint = make_event("evt_b"), make_endpoint("ep_b")
    dispatcher.enqueue(event, endpoint)
    settle(dispatcher, store, clock)
    dispatcher.enqueue(event, endpoint)
    settle(dispatcher, store, clock)
    assert len(transport.sent) == 1


def test_republish_after_failure_does_not_create_a_second_delivery(env):
    clock, transport, store, dispatcher = env
    transport.default = 410
    event, endpoint = make_event("evt_c"), make_endpoint("ep_c")
    dispatcher.enqueue(event, endpoint)
    settle(dispatcher, store, clock)
    again = dispatcher.enqueue(event, endpoint)
    settle(dispatcher, store, clock)
    assert again.status is DeliveryStatus.FAILED
    assert len(store.all()) == 1
    assert len(transport.sent) == 1


def test_same_event_fans_out_to_each_endpoint(env):
    clock, transport, store, dispatcher = env
    event = make_event("evt_d")
    main, audit = make_endpoint("ep_main"), make_endpoint("ep_audit")
    a = dispatcher.enqueue(event, main)
    b = dispatcher.enqueue(event, audit)
    settle(dispatcher, store, clock)
    assert a.id != b.id
    assert len(transport.sent_to(main.url)) == 1
    assert len(transport.sent_to(audit.url)) == 1


def test_different_events_to_one_endpoint_are_separate(env):
    clock, transport, store, dispatcher = env
    endpoint = make_endpoint("ep_e")
    dispatcher.enqueue(make_event("evt_1"), endpoint)
    dispatcher.enqueue(make_event("evt_2"), endpoint)
    settle(dispatcher, store, clock)
    assert len(transport.sent_to(endpoint.url)) == 2


def test_only_due_deliveries_are_attempted(env):
    clock, transport, store, dispatcher = env
    transport.respond_with(503)
    slow = dispatcher.enqueue(make_event("evt_slow"), make_endpoint("ep_slow"))
    dispatcher.process_due()
    fresh = dispatcher.enqueue(make_event("evt_new"), make_endpoint("ep_new"))
    dispatcher.process_due()
    assert len(slow.attempts) == 1
    assert fresh.status is DeliveryStatus.DELIVERED
