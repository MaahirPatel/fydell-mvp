"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { FAMILY_LABEL, LEVEL_LABEL, SPECIALIZATION_LABEL } from "@/lib/eng/taxonomy";
import { extractJobDescription, JD_MAX_LENGTH } from "@/lib/hiring/jd-extract";
import type { IntakeDraft } from "./draft";

/**
 * Paste an existing job description to start an editable draft. Extraction
 * runs in the browser with fixed rules. It only fills empty fields, and every
 * requirement it finds arrives as an unconfirmed suggestion.
 */
export default function JobDescriptionPaste({ draft, onApply }: { draft: IntakeDraft; onApply: (next: IntakeDraft) => void }) {
  const [open, setOpen] = useState(!draft.title && !draft.sourceDescription);
  const [text, setText] = useState(draft.sourceDescription);
  const [summary, setSummary] = useState<string[] | null>(null);

  function extract() {
    const x = extractJobDescription(text);
    const filled: string[] = [];
    const next: IntakeDraft = { ...draft, sourceDescription: text.trim() };
    if (x.title && !draft.title.trim()) {
      next.title = x.title;
      filled.push(`title "${x.title}"`);
    }
    if (x.family) {
      next.family = x.family;
      filled.push(`family ${FAMILY_LABEL[x.family]}`);
    }
    if (x.specialization) {
      next.specialization = x.specialization;
      filled.push(`specialization ${SPECIALIZATION_LABEL[x.specialization]}`);
    }
    if (x.level) {
      next.level = x.level;
      filled.push(`level ${LEVEL_LABEL[x.level]}`);
    }
    const resp = x.responsibilities.filter((r) => !draft.responsibilities.some((d) => d.toLowerCase() === r.toLowerCase()));
    if (resp.length > 0) {
      next.responsibilities = [...draft.responsibilities, ...resp].slice(0, 15);
      filled.push(`${resp.length} responsibilit${resp.length === 1 ? "y" : "ies"}`);
    }
    const reqs = x.requirements.filter((r) => !draft.requirements.some((d) => d.text.toLowerCase() === r.text.toLowerCase()));
    if (reqs.length > 0) {
      next.requirements = [...draft.requirements, ...reqs].slice(0, 40);
      filled.push(`${reqs.length} suggested requirement${reqs.length === 1 ? "" : "s"} to review`);
    }
    const langs = x.languages.filter((l) => !draft.languages.some((d) => d.toLowerCase() === l.toLowerCase()));
    if (langs.length > 0) {
      next.languages = [...draft.languages, ...langs].slice(0, 20);
      filled.push(`${langs.length} language${langs.length === 1 ? "" : "s"} and technolog${langs.length === 1 ? "y" : "ies"}`);
    }
    if (x.location && !draft.location) {
      next.location = x.location;
      filled.push("location");
    }
    if (x.remotePolicy && !draft.remotePolicy) {
      next.remotePolicy = x.remotePolicy;
      filled.push("working arrangement");
    }
    if (x.compensation && !draft.compensation) {
      next.compensation = x.compensation;
      filled.push("compensation");
    }
    onApply(next);
    setSummary(filled);
  }

  return (
    <section aria-labelledby="sec-paste" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sec-paste" className="text-[15px] font-semibold leading-[1.4] text-[var(--text-primary)]">
            Start from an existing job description
          </h2>
          <p className="mt-1 max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">
            Paste only text you are authorized to use, such as your own team&apos;s posting. Fydell drafts the fields below from it; you review everything before saving.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="jd-panel">
          {open ? "Hide" : "Paste a description"}
        </Button>
      </div>
      {open ? (
        <div id="jd-panel" className="mt-4 grid gap-3">
          <Field label="Job description" htmlFor="jd-text" help={`${text.length.toLocaleString()} of ${JD_MAX_LENGTH.toLocaleString()} characters. Kept with the role so reviewers can see where requirements came from.`}>
            <Textarea id="jd-text" value={text} onChange={(e) => setText(e.target.value.slice(0, JD_MAX_LENGTH))} rows={8} placeholder={"Senior Backend Engineer, Payments\n\nWhat you'll do\n- Own the webhook delivery service\n\nRequirements\n- 5+ years building production APIs in Go or Python"} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={extract} disabled={text.trim().length < 40}>
              Extract draft
            </Button>
            {text.trim().length > 0 && text.trim().length < 40 ? <span className="text-app-meta text-[var(--text-tertiary)]">Paste a little more text to extract from.</span> : null}
          </div>
          {summary ? (
            <div role="status" className="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3.5 py-2.5 text-app-meta leading-[1.5] text-[var(--text-body)]">
              {summary.length === 0
                ? "Nothing new was found to fill in. The fields below are unchanged."
                : `Drafted ${summary.join(", ")}. These are guesses: check each field, and review every suggested requirement before saving.`}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
