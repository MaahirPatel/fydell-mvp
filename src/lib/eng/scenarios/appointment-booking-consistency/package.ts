import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  REFERENCE_BOOKING,
  REFERENCE_DB,
  STARTER_BOOKING,
  STARTER_DB,
  STARTER_FIXTURE,
  STARTER_INIT,
  STARTER_README,
  STARTER_REMINDERS,
  STARTER_REPLAY,
  TEST_EVALUATION,
  TEST_HELPERS,
  TEST_PUBLIC,
  WRONG_CANCEL_BY_SLOT_BOOKING,
  WRONG_LOCKED_AS_TAKEN_BOOKING,
  WRONG_PROCESS_LOCK_BOOKING,
  WRONG_REMINDER_AFTER_COMMIT_BOOKING,
  WRONG_UNIQUE_INDEX_BOOKING,
  WRONG_UNIQUE_INDEX_DB,
} from "./files";

const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const FIXTURE_PATH = "fixtures/incident_requests.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const APPOINTMENT_BOOKING_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "backend_api_engineer",
  specialization: "general",
  level: "senior",
  language: "python",
  framework: "none",
  database: "sqlite",
  technologies: ["concurrency", "datetime"],
  taskType: "debugging",
  capabilities: ["correctness", "reliability", "testing", "technical_judgment"],
  taskMinutes: 75,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "A physiotherapy clinic's booking service runs as several worker processes sharing one SQLite file. Under concurrent requests two patients were booked into the same practitioner slot, because availability is checked and the appointment inserted as separate statements. A reminder that fails to queue after the insert leaves a booking without a reminder, and a repeated cancel after a slot was rebooked cancels the new patient's reminder. The candidate makes booking atomic and consistent across processes, keeps cancellation and rebooking working, and adds regression tests.",
  outcomes: [
    "Concurrent requests for one slot create exactly one booking across worker processes.",
    "A booking and its reminder are committed together or not at all.",
    "A regression test fails on the original code and passes with the fix.",
  ],
  constraints: ["Standard library only.", "Keep the BookingService.book and cancel interface.", "Additive schema changes only; existing rows are not modified."],
  outOfScope: ["Rescheduling and waitlists.", "Cleaning up existing double bookings.", "Sending the SMS itself."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(APPOINTMENT_BOOKING_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`appointment-booking-consistency config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Make clinic bookings consistent under concurrent requests",
  summary:
    "Two patients were booked into the same practitioner slot, and failed or repeated requests left bookings and reminders out of step. Make booking atomic across worker processes, keep cancellation and rebooking working, and add regression coverage.",
  context: [
    "Kestrel Lane Physiotherapy runs clinics at several locations. Its booking service is called by the front desk app and the patient app. BookingService.book() in app/booking.py records an appointment for a practitioner's slot and queues an SMS reminder in the reminders table, which a separate SMS sender drains. cancel() marks an appointment cancelled and cancels its reminder. Cancelled appointments stay in the table as history, so a slot can be booked again after a cancellation.",
    "Four worker processes serve requests. They share one SQLite database file on the host, and each opens its own connection. Workers are restarted on every deploy.",
    "There were three incidents in the last two weeks. Two patients were confirmed for the same practitioner at the same time after their requests reached different workers 39 ms apart. On the morning the Riverside location opened, bookings there returned an error; the front desk retried and was told the slot was taken, and no reminder was ever sent. And after reception had cancelled a patient by phone and given her slot to someone else, the first patient also tapped the cancel link in her old confirmation SMS, and the second patient's reminder was cancelled.",
    "The request log from those incidents is in fixtures/incident_requests.json, and scripts/replay_incident.py replays it against four workers. The shared database still holds the double bookings from the first incident; the operations team is resolving them with the patients by hand.",
  ].join("\n\n"),
  task: [
    "Own booking consistency. Reproduce the problems (tests/test_public.py reproduces the race by running bookings in separate worker processes), work out the causes, and change app/booking.py and app/db.py (and app/reminders.py if you need to) so that a slot can be booked only once however requests interleave across workers, a booking and its reminder are committed together or not at all, and a cancellation affects only the appointment being cancelled.",
    "Add regression tests under tests/ that fail on the current code and pass with your change. Two simulated teammates can answer questions: Ines about the service's constraints and priorities, Marta about the incidents and the clinic's data. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "Concurrent requests for the same practitioner and slot create exactly one booking, across worker processes.",
    "A booking and its reminder are committed together, or neither is.",
    "Cancelling affects only the cancelled appointment, and a cancelled slot can be booked again.",
    "A regression test in tests/ fails on the original code and passes with your change.",
    "A short handoff explains the causes, what you changed, how you checked it, and what remains open.",
  ],
  constraints: [
    "Python standard library only.",
    "Keep BookingService.book(patient_id, practitioner_id, slot_start) -> BookingResult, BookingService.cancel(appointment_id) -> CancelResult, and the BookingResult and CancelResult dataclasses.",
    "BookingService works through the connection of the Store it is given (store.conn), and Store(path) keeps opening the shared database file.",
    "Schema changes must be additive: new tables or indexes in SCHEMA, created with IF NOT EXISTS. Do not change or drop existing columns, and do not modify or delete existing rows when a worker starts.",
    "A request that loses a race for a slot gets slot_taken, not failed. The front desk app shows \"That time was just taken\" only for slot_taken.",
    "Never guess a UTC offset for a location that has none configured. A booking there must fail.",
  ],
  outOfScope: [
    "Rescheduling, waitlists and overbooking rules.",
    "Cleaning up the existing double bookings. The operations team is resolving those by hand.",
    "Sending the SMS. The sender that drains the reminders table is a separate service.",
    "Moving to another database, or adding a queue or a lock service.",
  ],
  optionalExtensions: ["If you have time, note in your handoff what you would change once the existing double bookings are resolved."],
  interfaceSpec: [
    "app/booking.py",
    "  BookingResult(status: str, appointment_id: int | None = None, detail: str = \"\"): dataclass. status is booked, slot_taken or failed.",
    "  CancelResult(status: str): dataclass. status is cancelled, already_cancelled or not_found.",
    "  BookingService(store: Store, now: Callable[[], str]): now returns an ISO 8601 UTC timestamp.",
    "    book(patient_id, practitioner_id, slot_start) -> BookingResult: slot_start is local clinic time, such as 2026-10-12T09:00. Returns failed for an unknown practitioner or when the booking cannot be completed.",
    "    cancel(appointment_id) -> CancelResult.",
    "app/db.py",
    "  Store(path: str): opens SQLite with isolation_level=None (autocommit) and timeout=5.0, and creates SCHEMA.",
    "    Tables: locations (utc_offset_minutes may be NULL), practitioners, appointments (status booked or cancelled), reminders (status pending or cancelled).",
    "    conn: the sqlite3 connection. transaction(): context manager that runs BEGIN, then COMMIT, or ROLLBACK on an exception, and yields the connection.",
    "    add_location(), add_practitioner(), appointments_for_slot(practitioner_id, slot_start), reminders_for_patient(patient_id), close().",
    "app/reminders.py",
    "  queue_reminder(conn, appointment_id, practitioner_id, slot_start, patient_id, utc_offset_minutes): inserts a pending reminder 24 hours before the slot, in UTC. Raises ReminderError when utc_offset_minutes is None.",
    "tests/helpers.py",
    "  run_workers(db_path, requests): runs each (patient_id, practitioner_id, slot_start) booking in its own process and returns one {status, appointment_id} dict per request. Every worker pauses before its first write, so requests overlap the same way on every run.",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "correctness",
      text: "When several worker processes request the same practitioner and slot at the same time, exactly one booking is created and every other request gets slot_taken (not failed). This includes a slot whose earlier booking was cancelled.",
    },
    {
      id: "AC-2",
      capability: "reliability",
      text: "A booking is committed together with its pending reminder, or not at all. If the reminder cannot be queued (for example the location has no UTC offset configured, or the reminders insert fails), book() returns failed, no appointment or reminder is left behind, and the slot can still be booked.",
    },
    {
      id: "AC-3",
      capability: "correctness",
      text: "Cancelling a booked appointment marks it cancelled and cancels its own pending reminder and no other appointment's reminder. The slot can then be booked again, and the new booking gets its own pending reminder.",
    },
    {
      id: "AC-4",
      capability: "correctness",
      text: "Cancelling an appointment that is already cancelled returns already_cancelled and changes nothing, including after its slot has been booked by another patient.",
    },
    { id: "AC-5", capability: "correctness", text: "Concurrent requests for different practitioners, or for different slots of the same practitioner, all succeed." },
    {
      id: "AC-6",
      capability: "reliability",
      text: "Store opens the existing shared database, which still contains double bookings, without error and without modifying or removing existing rows, and a new request for one of those slots gets slot_taken.",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "tests/test_public.py", content: TEST_PUBLIC },
    tests: [
      { name: "PublicTests.test_two_workers_booking_the_same_slot_only_one_succeeds", criterionIds: ["AC-1"] },
      { name: "PublicTests.test_booking_queues_a_reminder_24_hours_before", criterionIds: ["AC-2"] },
      { name: "PublicTests.test_cancelled_slot_can_be_booked_again", criterionIds: ["AC-3"] },
    ],
  },
  evaluationTests: {
    file: { path: "tests/test_evaluation.py", content: TEST_EVALUATION },
    tests: [
      { name: "EvaluationTests.test_three_workers_racing_for_one_slot_book_exactly_once", criterionIds: ["AC-1"] },
      { name: "EvaluationTests.test_race_for_a_cancelled_slot_rebooks_it_exactly_once", criterionIds: ["AC-1", "AC-3"] },
      { name: "EvaluationTests.test_concurrent_bookings_for_different_slots_all_succeed", criterionIds: ["AC-5"] },
      { name: "EvaluationTests.test_reminder_failure_commits_nothing", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_unconfigured_location_fails_without_leaving_a_booking", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_slot_is_bookable_after_a_failed_attempt", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_rebooked_slot_has_its_own_pending_reminder", criterionIds: ["AC-3"] },
      { name: "EvaluationTests.test_cancel_changes_only_that_appointments_reminder", criterionIds: ["AC-3"] },
      { name: "EvaluationTests.test_repeated_cancel_after_rebooking_changes_nothing", criterionIds: ["AC-4"] },
      { name: "EvaluationTests.test_store_opens_database_with_existing_double_bookings", criterionIds: ["AC-6"] },
    ],
  },
  incorrectSolutions: [
    {
      description:
        "Guards book() with a module-level threading.Lock and commits the appointment and its reminder together. The lock only serializes requests inside one process, so two workers still double book.",
      files: [{ path: "app/booking.py", content: WRONG_PROCESS_LOCK_BOOKING }],
    },
    {
      description:
        "Adds a unique partial index on appointments (practitioner_id, slot_start) for booked rows and maps the IntegrityError to slot_taken. Correct on a fresh file, but SCHEMA fails on the shared database that still holds double bookings, so no worker can start.",
      files: [
        { path: "app/db.py", content: WRONG_UNIQUE_INDEX_DB },
        { path: "app/booking.py", content: WRONG_UNIQUE_INDEX_BOOKING },
      ],
    },
    {
      description:
        "Serializes booking correctly and returns already_cancelled for repeat cancels, but still cancels reminders by practitioner and slot, so cancelling one of two patients in a double-booked slot silences the other patient's reminder.",
      files: [
        { path: "app/db.py", content: REFERENCE_DB },
        { path: "app/booking.py", content: WRONG_CANCEL_BY_SLOT_BOOKING },
      ],
    },
    {
      description:
        "Serializes the availability check and the insert, then queues the reminder after the commit. When the reminder fails, book() returns failed but the appointment stays booked and blocks the slot.",
      files: [
        { path: "app/db.py", content: REFERENCE_DB },
        { path: "app/booking.py", content: WRONG_REMINDER_AFTER_COMMIT_BOOKING },
      ],
    },
    {
      description:
        "Moves the check, the insert and the reminder into the existing store.transaction(), which starts a deferred transaction. It no longer double books, but the request that loses the race fails with a locked database and gets failed instead of slot_taken.",
      files: [{ path: "app/booking.py", content: REFERENCE_BOOKING }],
    },
    {
      description:
        "Keeps the deferred transaction and reports any sqlite3.OperationalError as slot_taken. The race for one slot now looks right, but a request for a different, free slot that collides on the lock is told the slot is taken.",
      files: [{ path: "app/booking.py", content: WRONG_LOCKED_AS_TAKEN_BOOKING }],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "app/__init__.py", content: STARTER_INIT },
    { path: "app/db.py", content: STARTER_DB },
    { path: "app/reminders.py", content: STARTER_REMINDERS },
    { path: "app/booking.py", content: STARTER_BOOKING },
    { path: "scripts/replay_incident.py", content: STARTER_REPLAY },
    { path: FIXTURE_PATH, content: STARTER_FIXTURE },
    { path: "tests/helpers.py", content: TEST_HELPERS },
  ],
  referenceFiles: [
    { path: "app/db.py", content: REFERENCE_DB },
    { path: "app/booking.py", content: REFERENCE_BOOKING },
  ],
  approaches: [
    "Make Store.transaction() start with BEGIN IMMEDIATE and run the practitioner lookup, the availability check, the appointment insert and queue_reminder inside one transaction, returning slot_taken from inside it and failed on any exception (which rolls everything back). BEGIN IMMEDIATE takes the database write lock before the check, so workers in other processes wait on the busy timeout and then see the booking. In cancel(), return already_cancelled when the row is already cancelled, and cancel reminders by appointment_id.",
    "Add a slot_claims (practitioner_id, slot_start) PRIMARY KEY table, backfilled in SCHEMA with INSERT OR IGNORE ... SELECT ... MIN(id) ... WHERE status = 'booked' GROUP BY practitioner_id, slot_start so it starts on the dirty file. Insert the claim in the same transaction as the appointment and reminder, with a write as the first statement of the transaction, and map the IntegrityError to slot_taken; cancel() deletes the claim. Verified against the evaluation tests.",
    "A unique partial index on appointments cannot be created while the double bookings remain. It is a good follow-up once operations has resolved them, together with the serialized check.",
    "Starter defects: book() checks availability and inserts as separate autocommit statements, so two workers both see the slot free (AC-1); the appointment insert commits before queue_reminder runs, so a reminder failure leaves a booked appointment with no reminder (AC-2); cancel() never checks the current status and cancels reminders by practitioner and slot, so a repeated cancel after rebooking, or a cancel in a double-booked slot, cancels another patient's reminder (AC-3, AC-4). The existing store.transaction() is deferred, so wrapping book() in it turns the race loser into a locked-database failure.",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Ines Halloran",
    title: "Engineering lead, Scheduling",
    responsibilities: "Owns the booking service, its contract with the front desk and patient apps, and its deployment and schema constraints.",
    topics: ["workers and deploys", "booking contract", "reminders", "schema changes", "existing data", "scope"],
    tone: "Direct and calm. Answers the question asked and says plainly when something is a hard constraint.",
    boundaries: "Explains how the service must behave and what is allowed, but will not choose the locking approach or write the fix.",
  },
  {
    id: "support",
    name: "Marta Svensson",
    title: "Clinic operations coordinator",
    responsibilities: "Runs front desk operations across the locations, handles patient complaints and reads the request logs during incidents.",
    topics: ["incident timelines", "patient impact", "request logs", "locations", "existing double bookings"],
    tone: "Warm and specific. Describes what patients and reception staff saw, with dates and times.",
    boundaries: "Knows what happened in the clinics and in the logs. Does not know the code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "Four worker processes share one SQLite file on the host, each with its own connection. Anything held in one process's memory, a lock included, is invisible to the other three, and every deploy restarts all of them.",
      topics: ["workers", "processes", "lock", "threading", "in-memory", "deploy"],
    },
    {
      id: "lead-f2",
      text: "When book() returns slot_taken, the front desk app shows \"That time was just taken\" and offers the next free slot. On failed it shows a generic error and staff press retry. A request that lost a race has to get slot_taken.",
      topics: ["slot_taken", "failed", "error", "retry", "front desk", "race", "loser"],
    },
    {
      id: "lead-f3",
      text: "A booking without a reminder is not acceptable: no-shows are the clinic's biggest cost. If the reminder cannot be queued, the booking fails. Do not default a missing UTC offset; a reminder at the wrong hour is worse than a failed booking.",
      topics: ["reminder", "sms", "utc", "offset", "timezone", "riverside"],
    },
    {
      id: "lead-f4",
      text: "Additive changes only, inside SCHEMA in app/db.py: new tables or indexes with IF NOT EXISTS. There is no migration tool. Every worker runs SCHEMA on startup against the production file, so whatever you add has to work on the data that is there today.",
      topics: ["schema", "migration", "index", "constraint", "table", "column", "startup"],
    },
    {
      id: "lead-f5",
      text: "The production file still has the double bookings from INC-3107, three slots as of this morning. Operations is calling those patients, so nothing may cancel, merge or delete them automatically.",
      topics: ["existing data", "double bookings", "cleanup", "production data", "duplicates"],
    },
    {
      id: "lead-f6",
      text: "We take a handful of bookings per minute per location. Writes waiting on each other for a few milliseconds is fine; a booking should still answer within a couple of seconds.",
      topics: ["performance", "latency", "contention", "throughput", "busy timeout"],
    },
    {
      id: "lead-f7",
      text: "Keep the book() and cancel() signatures and result types; the front desk app and the patient app both call them. Rescheduling and waitlists are out of scope for this change.",
      topics: ["interface", "signature", "scope", "result", "api"],
    },
  ],
  support: [
    {
      id: "ops-f1",
      text: "On 22 September two patients turned up for Practitioner Aldous at 09:00 at Harbourside, both with a confirmation SMS. The log shows the two bookings 39 ms apart, one on worker-2 and one on worker-3.",
      topics: ["double booking", "race", "incident", "logs", "inc-3107", "same slot", "observed"],
    },
    {
      id: "ops-f2",
      text: "Riverside opened on 29 September before anyone had set its UTC offset. All morning, bookings there showed an error. Reception pressed retry, got \"That time was just taken\", and booked those patients elsewhere. The original appointments were still in the system, but no reminder was ever sent for them. The offset was set that afternoon.",
      topics: ["riverside", "error", "retry", "reminder", "inc-3122", "slot taken", "failure"],
    },
    {
      id: "ops-f3",
      text: "A patient phoned to cancel her 14:00 with Practitioner Brandt, and reception gave the slot to another patient. Later the first patient also tapped the cancel link in her old confirmation SMS. The second patient never got a reminder and missed the appointment.",
      topics: ["cancel", "cancellation", "rebook", "sms link", "reminder", "inc-3140", "missed"],
    },
    {
      id: "ops-f4",
      text: "Three double-booked slots are left in the database from the first incident. We are calling each pair of patients this week, and we use those rows to see who to call, so please leave them as they are.",
      topics: ["double bookings", "existing data", "cleanup", "rows", "duplicates"],
    },
    {
      id: "ops-f5",
      text: "I don't know how the code works, sorry. Ines decides how the service should behave.",
      topics: ["code", "fix", "implementation"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1":
    "Strong submissions make the availability check and the insert one atomic step for every worker: a write lock taken before the check (BEGIN IMMEDIATE), or a constraint on a new, safely backfilled table, with the conflict mapped to slot_taken. Process-local locks, deferred transactions that turn the loser into a locked-database failure, and mapping every lock error to slot_taken are the common wrong turns; the evaluation tests catch each one. Cancel must check the current status and match reminders by appointment id.",
  "CR-2":
    "Look for the appointment and its reminder in one transaction, and for a schema change that still starts on the existing file with double bookings. A unique index on appointments fails at startup on that file; an index created inside try/except and skipped silently leaves the race open.",
  "CR-3":
    "A useful regression test runs bookings in separate processes (run_workers or an equivalent) and asserts on the loser's status and the stored rows, and ideally covers the reminder failure or the repeated cancel. A test that books twice in sequence, or uses two threads with a process-local lock, passes on code that still double books.",
  "CR-4":
    "The handoff should explain why the race happens (check and insert are separate autocommit statements), why the chosen locking holds across processes, how the change behaves on the existing double bookings, and what they would add once those are resolved.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored booking consistency work sample. Deterministic: no clock or randomness. */
export function buildAppointmentBookingPackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Python 3.12 or newer. No packages are needed.",
      "Download the starter project and open it in your editor.",
      "From the project root, replay the incident log: python scripts/replay_incident.py",
      `Run the public tests: ${built.pkg.environment.testCommand} (use python instead of python3 on Windows). One public test fails on the starter project because it reproduces the double booking.`,
    ],
    fixturePaths: [FIXTURE_PATH],
    coworkers: COWORKERS,
    submission: {
      requirements: [
        "Submit the project with your changes under app/ and the tests you added.",
        "Include a regression test in tests/ that fails on the original code and passes with your change.",
        "Keep the public tests in tests/test_public.py passing.",
        "Answer the three handoff questions.",
      ],
      handoffPrompts: [
        { id: "what_changed", label: "What did you change?", help: "The causes you found, the files you changed and the behavior that changed." },
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, and anything you verified by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions and anything you would do next." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: if a worker process is killed after it has inserted the appointment but before the reminder is queued, what is left in the database with your change, and what does the next request for that slot get?",
    },
    interruptionPolicy:
      "Requirements will not change during the task. Ines may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy:
      "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code is not shared. A reviewer reads your regression tests and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = { ...built.prot, coworkerFacts: COWORKER_FACTS, rubricNotes: RUBRIC_NOTES };
  return { pkg, prot };
}
