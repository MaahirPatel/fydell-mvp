# Evidence worker

Next.js owns product state. This service only analyzes a run snapshot.

```text
POST /analyze
Authorization: Bearer $EVIDENCE_ENGINE_SECRET
{ "job_type": "EXTRACT_EVIDENCE_INITIAL", "snapshot": { ... } }
```

Local/tests without HTTP:

```text
python -m evidence_engine   # stdin JSON, stdout JSON
```

Job types: EXTRACT_EVIDENCE_INITIAL, GENERATE_DEFENSE, EXTRACT_EVIDENCE_FINAL, GENERATE_DECISION_BRIEF.

The worker must not write to roles, employers, runs, or authorization tables.
