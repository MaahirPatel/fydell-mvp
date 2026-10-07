"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import type { RoleInput } from "@/lib/hiring/role-contract";
import { send } from "./send";

type Draft = Record<keyof RoleInput, string>;

function toDraft(role: RoleInput | null): Draft {
  return {
    title: role?.title ?? "",
    description: role?.description ?? "",
    seniority: role?.seniority ?? "",
    location: role?.location ?? "",
    remotePolicy: role?.remotePolicy ?? "",
    employmentType: role?.employmentType ?? "",
    compensation: role?.compensation ?? "",
    required: (role?.required ?? []).join("\n"),
    preferred: (role?.preferred ?? []).join("\n"),
    hiringSteps: (role?.hiringSteps ?? []).join("\n"),
    expectedEffort: role?.expectedEffort ?? "",
    applicationDeadline: role?.applicationDeadline ?? "",
    contactEmail: role?.contactEmail ?? "",
  };
}

/**
 * Create or edit a role. Required capabilities become the review rubric, so
 * changing them on a published role starts a new requirements version.
 */
export default function RoleForm({ roleId, initial, published }: { roleId?: string; initial: RoleInput | null; published?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await send<{ role: { id: string } }>(roleId ? `/api/hiring/roles/${roleId}` : "/api/hiring/roles", roleId ? "PATCH" : "POST", draft);
    setBusy(false);
    if ("error" in result) return setError(result.error);
    router.push(`/app/employer/openings/${result.data.role.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-8" noValidate>
      <fieldset className="grid gap-5">
        <legend className="mb-1 text-app-section text-[var(--text-primary)]">The role</legend>
        <Field label="Title" htmlFor="role-title">
          <Input id="role-title" value={draft.title} onChange={set("title")} maxLength={120} required placeholder="Backend engineer, payments" />
        </Field>
        <Field label="The work" htmlFor="role-description" help="What will this person build, own or fix in their first months? Applicants read this first.">
          <Textarea id="role-description" value={draft.description} onChange={set("description")} maxLength={4000} rows={6} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Level" htmlFor="role-seniority" optional>
            <Input id="role-seniority" value={draft.seniority} onChange={set("seniority")} maxLength={60} placeholder="Senior" />
          </Field>
          <Field label="Employment type" htmlFor="role-type" optional>
            <Input id="role-type" value={draft.employmentType} onChange={set("employmentType")} maxLength={60} placeholder="Full-time" />
          </Field>
          <Field label="Location" htmlFor="role-location" optional>
            <Input id="role-location" value={draft.location} onChange={set("location")} maxLength={120} placeholder="London or Berlin" />
          </Field>
          <Field label="Working arrangement" htmlFor="role-remote" optional>
            <Select id="role-remote" value={draft.remotePolicy} onChange={set("remotePolicy")}>
              <option value="">Not stated</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </Field>
          <Field label="Compensation" htmlFor="role-comp" optional help="A range is enough. Applicants see exactly what you write.">
            <Input id="role-comp" value={draft.compensation} onChange={set("compensation")} maxLength={200} placeholder="£85,000 – £105,000 plus equity" />
          </Field>
          <Field label="Application deadline" htmlFor="role-deadline" optional>
            <Input id="role-deadline" type="date" value={draft.applicationDeadline} onChange={set("applicationDeadline")} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-1 text-app-section text-[var(--text-primary)]">What you&apos;re looking for</legend>
        <Field
          label="Required capabilities"
          htmlFor="role-required"
          help={
            published
              ? "One per line. Reviewers map evidence to each line. Changing this list starts a new requirements version; earlier applications keep the version they saw."
              : "One per line, written as something a person can show. Reviewers map evidence to each line."
          }
        >
          <Textarea id="role-required" value={draft.required} onChange={set("required")} rows={4} placeholder={"Designs retries and idempotency for external calls\nWrites tests for failure paths"} />
        </Field>
        <Field label="Preferred capabilities" htmlFor="role-preferred" optional help="One per line. Shown to applicants as nice to have.">
          <Textarea id="role-preferred" value={draft.preferred} onChange={set("preferred")} rows={3} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5">
        <legend className="mb-1 text-app-section text-[var(--text-primary)]">The process</legend>
        <Field label="Hiring steps" htmlFor="role-steps" optional help="One per line, in order. Tell applicants what happens after they apply.">
          <Textarea id="role-steps" value={draft.hiringSteps} onChange={set("hiringSteps")} rows={3} placeholder={"Application review within a week\nOne technical conversation\nTeam conversation"} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Expected effort from applicants" htmlFor="role-effort" optional>
            <Input id="role-effort" value={draft.expectedEffort} onChange={set("expectedEffort")} maxLength={200} placeholder="About 3 hours across the process" />
          </Field>
          <Field label="Contact email" htmlFor="role-contact" optional help="Shown on the role page for questions.">
            <Input id="role-contact" type="email" value={draft.contactEmail} onChange={set("contactEmail")} maxLength={254} />
          </Field>
        </div>
      </fieldset>

      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={busy} disabled={!draft.title.trim()}>
          {roleId ? "Save changes" : "Save draft"}
        </Button>
        <ButtonLink href={roleId ? `/app/employer/openings/${roleId}` : "/app/employer/openings"} variant="quiet">
          Cancel
        </ButtonLink>
        {!roleId ? <p className="text-app-meta text-[var(--text-secondary)]">Nothing is public until you publish.</p> : null}
      </div>
    </form>
  );
}
