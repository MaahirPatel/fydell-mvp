import "server-only";
import type { Exemplar } from "../../exemplars/types";
import { buildAppointmentBookingPackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "appointment-booking-consistency",
  version: "1.0.0",
  track: "backend_api",
  taskFamily: "backend.consistency",
  level: "senior",
  difficulty: "challenging",
  businessContext: "A multi-location physiotherapy clinic's booking service, run as several worker processes over one shared SQLite file.",
  stack: { language: "python", label: "Python 3.12, standard library, sqlite3" },
  summary: "Make slot booking atomic across worker processes, keep the booking and its reminder together, and keep cancellation and rebooking correct on a database that already holds double bookings.",
  browserPreview: false,
  pattern: {
    problem:
      "A check-then-insert race on a shared resource across independent processes, combined with a multi-step write that is not atomic and an idempotency gap on the reverse operation. The obvious constraint-based fix is blocked by existing dirty data, and the obvious transaction-based fix turns the race loser into the wrong error.",
    assesses: [
      "Reasoning about isolation across processes rather than threads",
      "Choosing a locking or constraint strategy that the existing data permits",
      "Keeping multi-step writes atomic and mapping conflicts to the right outcome",
      "Writing a regression test that reproduces a real race deterministically",
      "Explaining trade-offs and remaining risk in a handoff",
    ],
    invariants: [
      "The race must be reproduced in separate processes against one database file, gated so the overlap is identical on every run; no sleeps.",
      "Several valid designs (write lock before the check, or a constraint on a new safely backfilled table) must all pass; tests assert on outcomes and stored rows, never on SQL text.",
      "The starter's existing data must make the naive unique constraint fail at startup, so the candidate has to account for production data.",
      "Losing a race and failing for another reason are distinct outcomes the caller depends on, and tests distinguish them.",
      "The secondary write (reminder) has a realistic failure mode that does not depend on mocking the candidate's code.",
      "The reverse operation (cancel) must be idempotent and scoped to its own record, tested against a slot that was rebooked.",
      "Protected tests build the database with their own copy of the original schema and seed data, and read rows with raw sqlite3.",
    ],
    variationAxes: [
      "Business domain and the contested resource (practitioner slots, seats, rooms, inventory units, shift assignments)",
      "The secondary write that must stay atomic with the claim (reminder, invoice line, audit record, notification outbox)",
      "The configuration gap that makes the secondary write fail (missing time zone, missing tax rate, missing template)",
      "Shape of the pre-existing dirty data that blocks the naive constraint",
      "Number of workers in the incident and the exact request log",
      "Coworker names, roles and incident timelines",
    ],
  },
  build: buildAppointmentBookingPackage,
};
