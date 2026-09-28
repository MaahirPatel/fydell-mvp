import json

import pytest

from webhooks import DeliveryStatus, DeliveryStore, Dispatcher
from webhooks.retry import MAX_ATTEMPTS, backoff_delay
from webhooks.signing import verify

from tests.fakes import FakeClock, FakeTransport, connection_refused, make_endpoint, make_event


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def transport():
    return FakeTransport()


@pytest.fixture
def store():
    return DeliveryStore()


@pytest.fixture
def dispatcher(store, transport, clock):
    return Dispatcher(store, transport, clock)


def run_until_settled(dispatcher, store, clock, max_steps=50):
    """Advance time and process deliveries until nothing is pending."""
    for _ in range(max_steps):
        dispatcher.process_due()
        pending = [d for d in store.all() if d.status is DeliveryStatus.PENDING]
        if not pending:
            return
        clock.set(min(d.next_attempt_at for d in pending))
    raise AssertionError("deliveries did not settle")


# --- existing behaviour ---------------------------------------------------


def test_successful_delivery_is_marked_delivered(dispatcher, transport):
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.DELIVERED
    assert len(transport.sent) == 1


def test_request_is_signed_and_identified(dispatcher, transport):
    endpoint = make_endpoint()
    dispatcher.enqueue(make_event("evt_42"), endpoint)
    dispatcher.process_due()
    request = transport.sent[0]
    assert request.headers["Kestrel-Event-Id"] == "evt_42"
    assert request.headers["Kestrel-Delivery-Attempt"] == "1"
    assert verify(endpoint.secret, request.headers["Kestrel-Signature"], request.body)
    assert json.loads(request.body)["id"] == "evt_42"


def test_server_error_is_retried_after_backoff(dispatcher, transport, clock):
    transport.respond_with(500)
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    start = clock.now()
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.PENDING
    assert delivery.next_attempt_at == start + backoff_delay(1)

    clock.set(delivery.next_attempt_at)
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.DELIVERED
    assert [a.status_code for a in delivery.attempts] == [500, 200]


def test_connection_failure_is_retried(dispatcher, store, transport, clock):
    transport.respond_with(connection_refused())
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    dispatcher.process_due()
    assert delivery.status is DeliveryStatus.PENDING
    assert delivery.attempts[0].status_code is None
    run_until_settled(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.DELIVERED


def test_attempts_are_capped(dispatcher, store, transport, clock):
    transport.default = 503
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    run_until_settled(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.FAILED
    assert delivery.failure_reason == "attempts_exhausted"
    assert len(delivery.attempts) == MAX_ATTEMPTS


def test_backoff_doubles_and_is_capped():
    assert [backoff_delay(n) for n in (1, 2, 3, 4)] == [30, 60, 120, 240]
    assert backoff_delay(20) == 3600


def test_deliveries_are_only_attempted_when_due(dispatcher, transport, clock):
    transport.respond_with(500)
    delivery = dispatcher.enqueue(make_event(), make_endpoint())
    dispatcher.process_due()
    clock.advance(5)
    dispatcher.process_due()
    assert len(delivery.attempts) == 1


# --- INC-2291 reproductions -------------------------------------------------


def test_gone_endpoint_is_not_retried(dispatcher, store, transport, clock):
    """Harbor & Pine: an endpoint answering 410 Gone must not be retried."""
    transport.default = 410
    delivery = dispatcher.enqueue(make_event(), make_endpoint("ep_harborpine_legacy"))
    run_until_settled(dispatcher, store, clock)
    assert delivery.status is DeliveryStatus.FAILED
    assert len(delivery.attempts) == 1


def test_republished_event_is_delivered_once(dispatcher, store, transport, clock):
    """Tidewater: the bus republishes evt_7QK2; the endpoint must receive it once."""
    event = make_event("evt_7QK2")
    endpoint = make_endpoint("ep_tidewater_main")
    dispatcher.enqueue(event, endpoint)
    dispatcher.process_due()
    dispatcher.enqueue(event, endpoint)  # republished after an ack timeout
    run_until_settled(dispatcher, store, clock)
    assert len(transport.sent_to(endpoint.url)) == 1
