import "server-only";
import type { Exemplar } from "../../exemplars/types";
import { buildEvalHarnessPackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "eval-harness-integrity",
  version: "1.0.0",
  track: "applied_ai",
  taskFamily: "ai.evaluation",
  level: "mid",
  difficulty: "moderate",
  businessContext: "A customer support team deciding whether its ticket triage classifier can route tickets on its own, based on an evaluation over recorded predictions.",
  stack: { language: "python", label: "Python 3.12, standard library, recorded JSON predictions" },
  summary: "Fix an evaluation harness that overstates a classifier: few-shot leakage, dropped abstentions and failures, pooled macro F1 and undefined per-label metrics.",
  browserPreview: false,
  pattern: {
    problem:
      "An offline evaluation over recorded model outputs reports inflated quality because of four independent integrity defects: prompt examples leaking into the eval set under new ids, non-answers silently leaving the denominator, the wrong averaging definition, and undefined per-label metrics. Each fix is small; the skill is recognizing that each one changes the decision the number supports.",
    assesses: [
      "Treating evaluation data hygiene (contamination) as a correctness problem",
      "Precise metric definitions: macro versus micro versus weighted averaging, and undefined values",
      "Counting abstentions, failures and missing records honestly",
      "Making a report state what it excluded and why",
      "Writing tests whose expected values can be worked out by hand",
    ],
    invariants: [
      "No model is called; everything runs over recorded predictions in JSON with the standard library.",
      "The leakage must survive id-only and naive text matching, so the held-out cases include a copy that differs in character width, case and spacing, and a near-duplicate that must be kept.",
      "The recorded run includes an abstention, a failed call, unparseable output, an unknown label and a missing record.",
      "Protected tests use held-out cases, not the shipped fixtures, so hard-coding the fixture ids or values fails.",
      "Undefined metrics are a distinct value (None) rather than 0.0, and a label without examples is excluded from the macro average; tests distinguish both.",
      "The parsing module is correct and stays unchanged, so the defects are in how results are used, not how they are read.",
    ],
    variationAxes: [
      "Business domain and the classification task (ticket triage, document routing, content moderation queues, intent detection)",
      "Label set and its imbalance",
      "The source of contamination (few-shot prompt, fine-tuning sample, cached retrieval examples)",
      "How copies differ from the original text (width, case, spacing, punctuation)",
      "The kinds of recorded failures and the decision threshold the metric gates",
      "Coworker names, roles and how the numbers are used",
    ],
  },
  build: buildEvalHarnessPackage,
};
