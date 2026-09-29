import { z } from 'zod';

export const executionResultSchema = z.object({
  executionId: z.string().uuid(),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  suiteVersion: z.literal('workflow-handler-v1'),
  environmentVersion: z.string().max(250),
  completedAt: z.string().datetime(),
  status: z.enum(['completed', 'runtime_error', 'timeout', 'output_limit', 'infrastructure_error']),
  tests: z.array(z.object({ id: z.string().max(50), title: z.string().max(150), passed: z.boolean() })).max(20),
});
export type ExecutionResult = z.infer<typeof executionResultSchema>;

export const STARTER_CODE = `def handle_events(events):
    """Return an outcome for each request, in order."""
    outcomes = []
    for event in events:
        # TODO: validate authorization and amount, and prevent duplicate writes.
        outcomes.append({"id": event["id"], "status": "accepted"})
    return outcomes
`;
