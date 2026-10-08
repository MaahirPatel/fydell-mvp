"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/Field";
import { send } from "@/components/hiring/send";
import { DEADLINE_WINDOW, GAP_ANSWER } from "@/lib/hiring/evidence-gap";
import type { ReviewRequirement } from "./types";
import type { WorkSampleOption } from "@/lib/hiring/work-samples";

function defaultDeadline(): string {
  const d = new Date(Date.now() + 7 * 86400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T17:00`;
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function zoneList(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  try {
    return intl.supportedValuesOf ? intl.supportedValuesOf("timeZone") : [];
  } catch {
    return [];
  }
}

/**
 * Only mounted after a reviewer chooses this path, so browser-only defaults
 * (time zone, local deadline) are read in state initializers.
 *
 * Invite the applicant to a work sample for one requirement. The three gap
 * questions are required so the invitation names what it is for; the
 * existing evidence sits beside this form to avoid asking for it again.
 */
export default function WorkSampleInviteForm({
  roleId,
  applicationId,
  requirement,
  options,
  policyNote,
  onDone,
}: {
  roleId: string;
  applicationId: string;
  requirement: ReviewRequirement;
  options: WorkSampleOption[];
  policyNote: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [scenarioVersionId, setScenarioVersionId] = useState(options[0]?.scenarioVersionId ?? "");
  const [uncertain, setUncertain] = useState("");
  const [why, setWhy] = useState("");
  const [observable, setObservable] = useState("");
  const [deadlineLocal, setDeadlineLocal] = useState(defaultDeadline);
  const [timeZone, setTimeZone] = useState(browserTimeZone);
  const [zones] = useState(zoneList);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <p className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        No published work samples are available to your workspace yet. Ask a targeted question or request a permitted artifact instead.
      </p>
    );
  }

  const ready = uncertain.trim().length >= GAP_ANSWER.min && why.trim().length >= GAP_ANSWER.min && observable.trim().length >= GAP_ANSWER.min && !!deadlineLocal && !!timeZone;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    const result = await send<{ invitationId: string; created: boolean }>(`/api/employer/applications/${applicationId}/work-sample`, "POST", {
      roleId,
      scenarioVersionId,
      requirementId: requirement.id,
      uncertainCapability: uncertain,
      whyItMatters: why,
      observableWork: observable,
      deadlineLocal,
      timeZone,
    });
    setBusy(false);
    if (result.ok === false) return setError(result.error);
    setDone(result.data.created ? "Invitation sent. Its status is listed with this application." : "This applicant already has an open invitation to this work sample, so no second one was sent.");
    router.refresh();
  }

  if (done) {
    return (
      <div className="grid gap-3">
        <FormSuccess>{done}</FormSuccess>
        <div>
          <Button size="sm" onClick={onDone}>
            Back to paths
          </Button>
        </div>
      </div>
    );
  }

  const selected = options.find((o) => o.scenarioVersionId === scenarioVersionId);
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {policyNote ? <p className="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-app-meta text-[var(--text-secondary)]">{policyNote}</p> : null}
      <Field label="What capability remains uncertain?" htmlFor={`gap-uncertain-${requirement.id}`} help="Name what the existing evidence does not show.">
        <Textarea id={`gap-uncertain-${requirement.id}`} value={uncertain} onChange={(e) => setUncertain(e.target.value)} maxLength={GAP_ANSWER.max} rows={2} placeholder="Their projects show retries, but not how they keep a retried request from charging twice." />
      </Field>
      <Field label="Why does it matter for this role?" htmlFor={`gap-why-${requirement.id}`}>
        <Textarea id={`gap-why-${requirement.id}`} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={GAP_ANSWER.max} rows={2} placeholder="The role owns payment webhooks, where duplicate deliveries are routine." />
      </Field>
      <Field label="What observable work would address it?" htmlFor={`gap-observable-${requirement.id}`}>
        <Textarea id={`gap-observable-${requirement.id}`} value={observable} onChange={(e) => setObservable(e.target.value)} maxLength={GAP_ANSWER.max} rows={2} placeholder="A change that makes webhook processing idempotent, with tests for duplicate and out-of-order delivery." />
      </Field>
      <Field label="Work sample" htmlFor={`gap-scenario-${requirement.id}`} help={selected && selected.taskFamilies.length > 0 ? `Covers: ${selected.taskFamilies.join("; ")}.` : undefined}>
        <Select id={`gap-scenario-${requirement.id}`} value={scenarioVersionId} onChange={(e) => setScenarioVersionId(e.target.value)}>
          {options.map((o) => (
            <option key={o.scenarioVersionId} value={o.scenarioVersionId}>
              {o.title} (version {o.version})
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deadline" htmlFor={`gap-deadline-${requirement.id}`} help={`Between ${DEADLINE_WINDOW.minHours} hours and ${DEADLINE_WINDOW.maxDays} days from now.`}>
          <Input id={`gap-deadline-${requirement.id}`} type="datetime-local" value={deadlineLocal} onChange={(e) => setDeadlineLocal(e.target.value)} />
        </Field>
        <Field label="Time zone" htmlFor={`gap-tz-${requirement.id}`} help="Defaults to your browser's time zone.">
          <Input id={`gap-tz-${requirement.id}`} list={`gap-tz-list-${requirement.id}`} value={timeZone} onChange={(e) => setTimeZone(e.target.value.trim())} maxLength={64} />
          <datalist id={`gap-tz-list-${requirement.id}`}>
            {zones.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </Field>
      </div>
      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" loading={busy} disabled={!ready}>
          Send invitation
        </Button>
        <Button size="sm" variant="quiet" onClick={onDone}>
          Cancel
        </Button>
        <span className="text-app-meta text-[var(--text-tertiary)]">The applicant receives the invitation the same way as other Fydell work samples.</span>
      </div>
    </form>
  );
}
