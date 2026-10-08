import type { Exemplar } from "../../exemplars/types";
import { buildSupportRetrievalPackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "support-retrieval-quality",
  version: "1.0.0",
  track: "applied_ai",
  taskFamily: "ai.retrieval",
  level: "mid",
  difficulty: "moderate",
  businessContext:
    "A B2B workforce scheduling company whose support assistant answers customer questions from the three help-center passages a lexical retrieval step selects for the question and the customer's plan.",
  stack: { language: "javascript", label: "Node.js 22, standard library only (BM25 over an in-memory index)" },
  summary: "Diagnose why a support assistant's retrieval returns stale, off-plan or headless passages, using a recorded eval set, and fix it so it holds on held-out articles and questions.",
  browserPreview: true,
  pattern: {
    problem:
      "A retrieval step feeding a model returns the wrong context for three independent reasons: superseded document versions are indexed alongside live ones, a metadata filter is applied after a fixed top-n cut so it removes the right documents, and fixed-size chunking separates answers from the headings that identify them. A small recorded eval set exposes the symptoms; the fix must be general rather than tuned to that set.",
    assesses: [
      "Diagnosing retrieval failures from a recorded eval set and tracing each failed question to a cause in versioning, filtering or chunking.",
      "Choosing a source of truth from the data contract (highest version per slug) over an unreliable field (state) or a hand-made list (the eval file's superseded ids).",
      "Applying a hard metadata filter before ranking rather than after a top-n cut, and returning fewer results rather than off-plan ones.",
      "Structure-aware chunking that keeps each section's heading with its text.",
      "Avoiding overfitting: changes that pass the visible eval must also pass held-out articles and questions.",
      "Writing regression tests with small purpose-built corpora, and explaining causes and tradeoffs in a handoff.",
    ],
    invariants: [
      "The public reproduction (the recorded eval test) fails on the starter, and running the eval script shows a distinct failure for each defect.",
      "Every acceptance criterion is checked by at least one protected test that runs on held-out documents and questions written inline in the protected test file, never on the candidate's fixtures or helpers.",
      "Each incorrect solution is caught by a specific protected test, and at least two of them pass every public test, so the scenario measures generalization beyond the visible eval.",
      "Every behavior a protected test checks is stated in the brief: the version rule, the missing state field, the plan rule including returning fewer results, the heading rule and the ban on special-casing.",
      "Only recorded and synthetic data: no model calls, no embeddings service, no network; scoring is deterministic and ties are broken by id.",
      "The overfitting traps stay plausible: the eval file lists today's superseded ids, older records lack the state field, and a larger candidate pool makes the public eval pass.",
    ],
    variationAxes: [
      "Business domain and corpus: help center, internal policy wiki, product documentation, legal clauses, runbooks.",
      "Document types and their metadata: article versions, policy revisions, product line, region, customer tier, language.",
      "Which retrieval defects appear (at least two of: stale versions, filter after top-n, chunking that drops headings or titles, duplicate chunks across sources, wrong tie-breaking) and how the eval set exposes them.",
      "Scoring method: BM25 over tokens, or precomputed embedding vectors stored in a fixture with cosine similarity.",
      "Field names and shapes of records, chunks and results, the default k, and the eval set's format.",
      "Coworker roles and names, the incident tickets, and the company's plan or tier names.",
    ],
  },
  build: buildSupportRetrievalPackage,
};
