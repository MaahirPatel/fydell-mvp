"""Public tests. Several fail on the starter code; that is the incident.

Run from the project root:  python -m unittest -v
"""

import unittest

from webhooks.clock import FakeClock
from webhooks.dispatcher import Dispatcher
from webhooks.models import DELIVERED, FAILED, PENDING, Delivery
from webhooks.store import InMemoryDeliveryStore
from webhooks.transport import Response, ScriptedTransport


def make(script, delivery_id="dlv_001"):
    clock = FakeClock()
    store = InMemoryDeliveryStore()
    delivery = Delivery(
        id=delivery_id,
        endpoint_url="https://merchant.example/hooks",
        payload={"type": "payment.succeeded", "amount": 4200},
        next_attempt_at=clock.now(),
    )
    store.add(delivery)
    transport = ScriptedTransport(script)
    return Dispatcher(store, transport, clock), store, transport, clock


class DispatcherPublicTests(unittest.TestCase):
    def test_success_marks_delivered(self):
        dispatcher, store, _, _ = make([Response(200)])
        dispatcher.process_due()
        delivery = store.get("dlv_001")
        self.assertEqual(delivery.status, DELIVERED)
        self.assertEqual(delivery.attempts, 1)

    def test_server_error_schedules_backoff(self):
        dispatcher, store, _, clock = make([Response(500)])
        start = clock.now()
        dispatcher.process_due()
        delivery = store.get("dlv_001")
        self.assertEqual(delivery.status, PENDING)
        self.assertEqual(delivery.attempts, 1)
        self.assertAlmostEqual(delivery.next_attempt_at - start, 60, places=3)

    def test_gone_endpoint_is_not_retried(self):
        dispatcher, store, transport, clock = make([Response(410)])
        dispatcher.process_due()
        clock.advance(7200)
        dispatcher.process_due()
        delivery = store.get("dlv_001")
        self.assertEqual(delivery.status, FAILED)
        self.assertEqual(delivery.last_status_code, 410)
        self.assertEqual(len(transport.requests), 1)

    def test_idempotency_key_is_stable_across_retries(self):
        dispatcher, store, transport, clock = make(
            [Response(500), Response(500), Response(200)]
        )
        for _ in range(3):
            dispatcher.process_due()
            delivery = store.get("dlv_001")
            if delivery.next_attempt_at is not None:
                clock.set(max(clock.now(), delivery.next_attempt_at))
        keys = {headers.get("Idempotency-Key") for _, _, headers in transport.requests}
        self.assertEqual(len(transport.requests), 3)
        self.assertEqual(keys, {"dlv_001"})


if __name__ == "__main__":
    unittest.main()
