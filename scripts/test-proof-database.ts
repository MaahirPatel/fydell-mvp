/**
 * Destructive live test for fydell-dev only.
 *
 * This script intentionally ignores DATABASE_URL, SUPABASE_DB_URL, and every
 * normal app variable because this repository's .env.local targets production.
 * It runs only with FYDELL_DEV_DB_URL and refuses any connection string that
 * is not visibly bound to the fydell-dev project reference.
 */
import assert from "node:assert/strict";
import postgres, { type Sql, type TransactionSql } from "postgres";

const PROJECT_REF = "btbmvrvynnrhapjdkunz";
const databaseUrl = process.env.FYDELL_DEV_DB_URL;

if (!databaseUrl) {
  const message = "SKIP live proof database: FYDELL_DEV_DB_URL is not configured.";
  if (process.env.REQUIRE_PROOF_DATABASE_TESTS === "true") throw new Error(message);
  console.log(message);
  process.exit(0);
}
let databaseTarget: URL;
try {
  databaseTarget = new URL(databaseUrl);
} catch {
  throw new Error("Refusing live proof tests: FYDELL_DEV_DB_URL is not a valid connection URL.");
}
const targetIdentity = `${databaseTarget.hostname} ${decodeURIComponent(databaseTarget.username)}`;
if (!targetIdentity.includes(PROJECT_REF)) {
  throw new Error(
    `Refusing to run destructive tests against non-dev project; FYDELL_DEV_DB_URL must target ${PROJECT_REF}.`
  );
}

const sql = postgres(databaseUrl, { max: 8, idle_timeout: 5 });
const runId = "f1000000-0000-4000-a000-000000000001";
const invitationId = "f1000000-0000-4000-a000-000000000002";
const organizationId = "f1000000-0000-4000-a000-000000000003";

async function cleanupSequenceFixture(client: Sql): Promise<void> {
  await client`delete from public.proof_runs where id = ${runId}`;
  await client`delete from public.proof_invitations where id = ${invitationId}`;
  await client`delete from public.organizations where id = ${organizationId}`;
}

async function testSequence(): Promise<void> {
  await cleanupSequenceFixture(sql);
  await sql`
    insert into public.organizations (id, name, status, pilot_stage)
    values (${organizationId}, 'proof sequence test', 'active', 'setup')
  `;
  await sql`
    insert into public.proof_invitations
      (id, organization_id, role_id, simulation_version_id, email, token)
    values (
      ${invitationId},
      ${organizationId},
      '00000000-0000-4000-a000-000000000001',
      '00000000-0000-4000-a000-000000000010',
      'sequence-test@example.invalid',
      'proof-sequence-test-token'
    )
  `;
  await sql`
    insert into public.proof_runs
      (id, invitation_id, organization_id, simulation_version_id, rubric_version, prompt_version)
    values (
      ${runId},
      ${invitationId},
      ${organizationId},
      '00000000-0000-4000-a000-000000000010',
      'test-rubric',
      'test-prompt'
    )
  `;

  const supplied = await sql`
    insert into public.proof_events
      (run_id, sequence, event_type, source, actor_type, payload)
    values (${runId}, 999999, 'TEST_SEQUENCE_OVERRIDE', 'SYSTEM', 'system', '{"writer":0}')
    returning sequence
  `;
  assert.equal(supplied[0]?.sequence, 1);
  console.log("  ok   client sequence 999999 overwritten with 1");

  await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      sql.begin(async (connection) => {
        await connection`
          insert into public.proof_events
            (run_id, sequence, event_type, source, actor_type, payload)
          values (
            ${runId},
            ${-(index + 1)},
            'TEST_CONCURRENT',
            'SYSTEM',
            'system',
            ${connection.json({ writer: index + 1 })}
          )
        `;
        await connection`select pg_sleep(0.25)`;
      })
    )
  );

  const rows = await sql`
    select sequence
    from public.proof_events
    where run_id = ${runId}
    order by sequence
  `;
  const sequences = rows.map((row) => Number(row.sequence));
  assert.deepStrictEqual(sequences, [1, 2, 3, 4, 5, 6]);
  assert.equal(new Set(sequences).size, sequences.length);
  console.log("  ok   five parallel connections produced [1,2,3,4,5,6]");
}

const rollback = new Error("ROLLBACK_RLS_TEST");

async function denied(
  transaction: TransactionSql,
  statement: string,
  label: string
): Promise<void> {
  await assert.rejects(
    () =>
      transaction.savepoint(async (savepoint) => {
        await savepoint.unsafe(statement);
      }),
    /permission denied|row-level security/i
  );
  console.log(`  ok   ${label}`);
}

async function testRls(): Promise<void> {
  try {
    await sql.begin(async (transaction) => {
      await transaction.unsafe(`
        insert into auth.users (id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
        values
          ('a1000000-0000-4000-a000-000000000001','authenticated','authenticated','rls-a@example.invalid','{}','{}',now(),now()),
          ('b1000000-0000-4000-a000-000000000002','authenticated','authenticated','rls-b@example.invalid','{}','{}',now(),now()),
          ('c1000000-0000-4000-a000-000000000003','authenticated','authenticated','rls-candidate@example.invalid','{}','{}',now(),now());
        insert into public.organizations (id,name,status,pilot_stage) values
          ('a2000000-0000-4000-a000-000000000001','RLS Org A','active','setup'),
          ('b2000000-0000-4000-a000-000000000002','RLS Org B','active','setup');
        insert into public.organization_members (organization_id,user_id,role,status) values
          ('a2000000-0000-4000-a000-000000000001','a1000000-0000-4000-a000-000000000001','owner','active'),
          ('b2000000-0000-4000-a000-000000000002','b1000000-0000-4000-a000-000000000002','owner','active');
        insert into public.proof_invitations
          (id,organization_id,role_id,simulation_version_id,email,token,candidate_user_id)
        values
          ('a3000000-0000-4000-a000-000000000001','a2000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000010','run-a@example.invalid','rls-run-a','a1000000-0000-4000-a000-000000000001'),
          ('b3000000-0000-4000-a000-000000000002','b2000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000010','run-b@example.invalid','rls-run-b','c1000000-0000-4000-a000-000000000003');
        insert into public.proof_runs
          (id,invitation_id,organization_id,candidate_user_id,simulation_version_id,rubric_version,prompt_version)
        values
          ('a4000000-0000-4000-a000-000000000001','a3000000-0000-4000-a000-000000000001','a2000000-0000-4000-a000-000000000001','a1000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000010','r','p'),
          ('b4000000-0000-4000-a000-000000000002','b3000000-0000-4000-a000-000000000002','b2000000-0000-4000-a000-000000000002','c1000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000010','r','p');
        insert into public.proof_events
          (id,run_id,sequence,event_type,source,actor_type,payload)
        values ('b5000000-0000-4000-a000-000000000002','b4000000-0000-4000-a000-000000000002',99,'RLS_TEST','SYSTEM','system','{}');
        insert into public.proof_artifact_versions (id,run_id,sequence_at,content)
        values ('b6000000-0000-4000-a000-000000000002','b4000000-0000-4000-a000-000000000002',1,'{"content":"secret"}');
        insert into public.proof_evidence_claims
          (id,run_id,pass,claim,competency,direction,confidence,rubric_version,prompt_version,model_version,review_status)
        values
          ('b7000000-0000-4000-a000-000000000001','b4000000-0000-4000-a000-000000000002','A','unpublished','ADAPTATION','CONCERN','MODERATE','r','p','m','GENERATED'),
          ('b7000000-0000-4000-a000-000000000002','b4000000-0000-4000-a000-000000000002','B','published','ADAPTATION','STRENGTH','HIGH','r','p','m','PUBLISHED');
      `);

      await transaction`set local role authenticated`;
      await transaction`select set_config('request.jwt.claims', '{"sub":"a1000000-0000-4000-a000-000000000001","role":"authenticated"}', true)`;
      for (const [table, predicate] of [
        ["proof_runs", "id='b4000000-0000-4000-a000-000000000002'"],
        ["proof_events", "run_id='b4000000-0000-4000-a000-000000000002'"],
        ["proof_artifact_versions", "run_id='b4000000-0000-4000-a000-000000000002'"],
      ] as const) {
        const rows = await transaction.unsafe(
          `select count(*)::integer as count from public.${table} where ${predicate}`
        );
        assert.equal(rows[0]?.count, 0);
        console.log(`  ok   org A cannot read org B ${table}`);
      }

      const writeAttempts = [
        ["INSERT proof_events", "insert into public.proof_events (run_id,sequence,event_type,source,actor_type,payload) values ('a4000000-0000-4000-a000-000000000001',1,'WRITE_TEST','SYSTEM','system','{}')"],
        ["UPDATE proof_events", "update public.proof_events set event_type=event_type where run_id='a4000000-0000-4000-a000-000000000001'"],
        ["DELETE proof_events", "delete from public.proof_events where run_id='a4000000-0000-4000-a000-000000000001'"],
        ["INSERT proof_analysis_jobs", "insert into public.proof_analysis_jobs (run_id,job_type,idempotency_key) values ('a4000000-0000-4000-a000-000000000001','EXTRACT_EVIDENCE_INITIAL','rls-write-test')"],
        ["UPDATE proof_analysis_jobs", "update public.proof_analysis_jobs set attempts=attempts where run_id='a4000000-0000-4000-a000-000000000001'"],
        ["DELETE proof_analysis_jobs", "delete from public.proof_analysis_jobs where run_id='a4000000-0000-4000-a000-000000000001'"],
        ["INSERT proof_evidence_claims", "insert into public.proof_evidence_claims (run_id,pass,claim,competency,direction,confidence,rubric_version,prompt_version,model_version) values ('a4000000-0000-4000-a000-000000000001','A','x','ADAPTATION','CONCERN','LOW','r','p','m')"],
        ["UPDATE proof_evidence_claims", "update public.proof_evidence_claims set claim=claim where run_id='b4000000-0000-4000-a000-000000000002'"],
        ["DELETE proof_evidence_claims", "delete from public.proof_evidence_claims where run_id='b4000000-0000-4000-a000-000000000002'"],
      ] as const;
      for (const [label, statement] of writeAttempts) {
        await denied(transaction, statement, `authenticated denied ${label}`);
      }

      await transaction`select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-a000-000000000003","role":"authenticated"}', true)`;
      const candidateRows = await transaction`
        select count(*)::integer as count
        from public.proof_evidence_claims
        where id='b7000000-0000-4000-a000-000000000001'
      `;
      assert.equal(candidateRows[0]?.count, 0);
      console.log("  ok   candidate cannot read own unpublished claim");

      await transaction`select set_config('request.jwt.claims', '{"sub":"b1000000-0000-4000-a000-000000000002","role":"authenticated"}', true)`;
      const employerRows = await transaction`
        select count(*)::integer as count
        from public.proof_evidence_claims
        where id='b7000000-0000-4000-a000-000000000002'
      `;
      assert.equal(employerRows[0]?.count, 1);
      console.log("  ok   org member reads published claim");

      await transaction`set local role anon`;
      await denied(transaction, "select * from public.proof_runs", "anon cannot read proof_runs");
      await transaction`reset role`;
      const grants = await transaction`
        select count(*)::integer as exposed
        from pg_tables
        where schemaname='public'
          and tablename like 'proof\\_%' escape '\\'
          and has_table_privilege('anon', format('public.%I', tablename), 'SELECT')
      `;
      assert.equal(grants[0]?.exposed, 0);
      console.log("  ok   anon has no SELECT grant on all 24 proof tables");
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function main(): Promise<void> {
  try {
    console.log("\nLive event ledger");
    await testSequence();
    console.log("\nLive RLS");
    await testRls();
    console.log("\nLive proof database tests passed.");
  } finally {
    await cleanupSequenceFixture(sql);
    await sql.end({ timeout: 5 });
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
