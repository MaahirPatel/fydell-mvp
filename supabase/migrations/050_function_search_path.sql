-- Pin search_path on trigger and helper functions so a role that can create
-- objects in another schema cannot shadow the tables these functions touch.
-- Configuration only: no function bodies, tables, or data change.

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'set_updated_at',
        'generate_pilot_public_reference',
        'pilot_requests_set_reference',
        'reject_decision_lock_mutation',
        'sim_submission_guard',
        'proof_events_assign_sequence',
        'submit_transfer_transition',
        'prevent_snapshot_mutation',
        'submit_session_atomic',
        'sim_test_runs_guard'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn.signature);
  end loop;
end
$$;
