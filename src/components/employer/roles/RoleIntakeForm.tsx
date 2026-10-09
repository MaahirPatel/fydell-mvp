"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/Field";
import { send } from "@/components/hiring/send";
import {
  EVIDENCE_KINDS,
  EVIDENCE_LABEL,
  FAMILY_LABEL,
  FAMILY_SPECIALIZATIONS,
  LEVEL_LABEL,
  LEVEL_SCOPE,
  LEVELS,
  ROLE_FAMILIES,
  SPECIALIZATION_LABEL,
  SPECIALIZATIONS,
  WORK_SAMPLE_POLICY_LABEL,
  isLevel,
  isRoleFamily,
  isSpecialization,
  type WorkSamplePolicy,
} from "@/lib/eng/taxonomy";
import { specializationNote, VISIBILITY_LABEL, type Visibility } from "@/lib/hiring/intake-contract";
import { requirementsChanged, savableRequirementsProblem } from "@/lib/hiring/requirements";
import { TECHNOLOGY_SUGGESTIONS } from "@/lib/hiring/jd-extract";
import type { MemberOption } from "@/lib/hiring/members";
import CoveragePanel from "./CoveragePanel";
import JobDescriptionPaste from "./JobDescriptionPaste";
import ListEditor from "./ListEditor";
import RequirementsEditor from "./RequirementsEditor";
import TagInput from "./TagInput";
import type { IntakeDraft } from "./draft";
import { clearLocalDraft, readLocalDraft, useHydrated, useKeepLocalDraft } from "./useLocalDraft";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 lg:p-6">
      <h2 id={id} className="text-[15px] font-semibold leading-[1.4] text-[var(--text-primary)]">
        {title}
      </h2>
      {description ? <p className="mt-1 max-w-[72ch] text-app-meta leading-[1.5] text-[var(--text-secondary)]">{description}</p> : null}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

function Radio<T extends string>({ name, value, checked, onChange, label, help }: { name: string; value: T; checked: boolean; onChange: (v: T) => void; label: string; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] border border-[var(--border-subtle)] p-3 hover:bg-[var(--surface-hover)] has-[:checked]:border-[var(--border-strong)] has-[:checked]:bg-[var(--surface-selected)]">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--control-solid)]" />
      <span className="grid gap-0.5">
        <span className="text-app-meta font-medium text-[var(--text-primary)]">{label}</span>
        {help ? <span className="text-app-meta leading-[1.45] text-[var(--text-secondary)]">{help}</span> : null}
      </span>
    </label>
  );
}

type FormProps = {
  roleId?: string;
  initial: IntakeDraft;
  members: MemberOption[];
  expectedUpdatedAt?: string;
  requirementsVersion?: number;
  stateLabel?: string;
};

/** Renders once for hydration, then again on the client with any draft kept in this browser. */
export default function RoleIntakeForm(props: FormProps) {
  const hydrated = useHydrated();
  return <IntakeForm key={hydrated ? "client" : "server"} {...props} hydrated={hydrated} />;
}

function IntakeForm({ roleId, initial, members, expectedUpdatedAt, requirementsVersion, stateLabel, hydrated }: FormProps & { hydrated: boolean }) {
  const router = useRouter();
  const draftKey = `fydell-role-draft:${roleId ?? "new"}:${initial.hiringOwner}`;
  const base = expectedUpdatedAt ?? null;
  const [stored] = useState(() => (hydrated ? readLocalDraft<IntakeDraft>(draftKey, base) : null));
  const [restoredAt, setRestoredAt] = useState(stored?.savedAt ?? null);
  const [draft, setDraft] = useState<IntakeDraft>(stored?.value ?? initial);
  const [changeReason, setChangeReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useKeepLocalDraft(draftKey, base, draft, initial, hydrated);
  const set = <K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: "title" | "description" | "ownership" | "teamContext" | "location" | "employmentType" | "compensation" | "expectedEffort" | "applicationDeadline" | "contactEmail") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value);

  const pendingProblem = savableRequirementsProblem(draft.requirements);
  const reqChanged = useMemo(() => !!roleId && requirementsChanged(initial.requirements, draft.requirements), [roleId, initial.requirements, draft.requirements]);
  const specNote = specializationNote(draft.family, draft.specialization);
  const scope = LEVEL_SCOPE[draft.level];
  const typical = FAMILY_SPECIALIZATIONS[draft.family];
  const other = SPECIALIZATIONS.filter((s) => !typical.includes(s));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (pendingProblem) return setError(pendingProblem);
    setBusy(true);
    setError(null);
    const body = {
      ...draft,
      remotePolicy: draft.remotePolicy || null,
      hiringOwner: draft.hiringOwner || null,
      applicationDeadline: draft.applicationDeadline || null,
      sourceDescription: draft.sourceDescription || null,
      changeReason,
      expectedUpdatedAt,
    };
    const result = await send<{ role: { id: string } }>(roleId ? `/api/employer/roles/${roleId}` : "/api/employer/roles/intake", roleId ? "PATCH" : "POST", body);
    setBusy(false);
    if (result.ok === false) return setError(result.error);
    clearLocalDraft(draftKey);
    router.push(`/app/employer/openings/${result.data.role.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      {restoredAt ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-3 text-app-meta text-[var(--text-secondary)]">
          <span>
            Restored what you entered on {new Date(restoredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. It is kept in this browser until you save.
          </span>
          <Button
            size="sm"
            variant="quiet"
            onClick={() => {
              setDraft(initial);
              setRestoredAt(null);
              clearLocalDraft(draftKey);
            }}
          >
            Discard
          </Button>
        </div>
      ) : null}
      <JobDescriptionPaste key={restoredAt ?? "fresh"} draft={draft} onApply={setDraft} />

      <Section id="sec-role" title="The role" description="The title is what applicants see. It does not decide what reviewers look for; the requirements further down do.">
        <Field label="Role title" htmlFor="role-title">
          <Input id="role-title" value={draft.title} onChange={text("title")} maxLength={120} required placeholder="Backend Engineer, Payments" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Role family" htmlFor="role-family">
            <Select
              id="role-family"
              value={draft.family}
              onChange={(e) => {
                if (isRoleFamily(e.target.value)) set("family", e.target.value);
              }}
            >
              {ROLE_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {FAMILY_LABEL[f]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Specialization" htmlFor="role-specialization" help={specNote ?? undefined}>
            <Select
              id="role-specialization"
              value={draft.specialization}
              onChange={(e) => {
                if (isSpecialization(e.target.value)) set("specialization", e.target.value);
              }}
            >
              <optgroup label={`Typical for ${FAMILY_LABEL[draft.family]}`}>
                {typical.map((s) => (
                  <option key={s} value={s}>
                    {SPECIALIZATION_LABEL[s]}
                  </option>
                ))}
              </optgroup>
              {other.length > 0 ? (
                <optgroup label="Other specializations">
                  {other.map((s) => (
                    <option key={s} value={s}>
                      {SPECIALIZATION_LABEL[s]}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </Select>
          </Field>
          <Field label="Level" htmlFor="role-level">
            <Select
              id="role-level"
              value={draft.level}
              onChange={(e) => {
                if (isLevel(e.target.value)) set("level", e.target.value);
              }}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Employment type" htmlFor="role-type" optional>
            <Input id="role-type" value={draft.employmentType} onChange={text("employmentType")} maxLength={60} placeholder="Full-time" />
          </Field>
        </div>
        <dl className="grid gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-4 text-app-meta sm:grid-cols-[120px_minmax(0,1fr)]">
          <dt className="font-medium text-[var(--text-primary)]">{LEVEL_LABEL[draft.level]} scope</dt>
          <dd className="text-[var(--text-secondary)]">Seniority changes what the work asks for, not how much code or how little time.</dd>
          <dt className="text-[var(--text-tertiary)]">Ambiguity</dt>
          <dd className="text-[var(--text-body)]">{scope.ambiguity}</dd>
          <dt className="text-[var(--text-tertiary)]">Ownership</dt>
          <dd className="text-[var(--text-body)]">{scope.ownership}</dd>
          <dt className="text-[var(--text-tertiary)]">Expectation</dt>
          <dd className="text-[var(--text-body)]">{scope.expectation}</dd>
        </dl>
        <Field label="Expected ownership" htmlFor="role-ownership" optional help="What this person will own: a service, a surface, an on-call rotation, a migration.">
          <Textarea id="role-ownership" value={draft.ownership} onChange={text("ownership")} maxLength={1000} rows={2} placeholder="Owns the payments webhook service end to end, including its on-call rotation." />
        </Field>
        <CoveragePanel family={draft.family} specialization={draft.specialization} />
      </Section>

      <Section id="sec-work" title="The work" description="Applicants read this first. Describe what they will actually build, fix and own.">
        <Field label="Summary of the work" htmlFor="role-description" help="A few sentences. Needed before publishing.">
          <Textarea id="role-description" value={draft.description} onChange={text("description")} maxLength={4000} rows={5} />
        </Field>
        <Field label="Responsibilities" htmlFor="role-responsibilities" optional help="Actual responsibilities, one per line. These describe the job; they are not screening criteria.">
          <ListEditor
            id="role-responsibilities"
            items={draft.responsibilities}
            onChange={(v) => set("responsibilities", v)}
            maxItems={15}
            maxLength={300}
            placeholder="Run the retry and reconciliation path for payment webhooks"
            addLabel="Add"
          />
        </Field>
      </Section>

      <Section
        id="sec-requirements"
        title="What reviewers look for"
        description="These criteria define what reviewers look for in each applicant's evidence. Write each as something a person can show, not a credential."
      >
        <RequirementsEditor value={draft.requirements} onChange={(v) => set("requirements", v)} />
        {reqChanged ? (
          <Field label="Why the requirements changed" htmlFor="role-change-reason" optional help={`Saving starts requirements version ${(requirementsVersion ?? 0) + 1}. Earlier applications keep the version they saw.`}>
            <Input id="role-change-reason" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} maxLength={500} placeholder="Added an on-call requirement after the team review" />
          </Field>
        ) : null}
        <Field label="Languages and technologies" htmlFor="role-languages" optional help="What the team works in day to day. Up to 20.">
          <TagInput id="role-languages" tags={draft.languages} onChange={(v) => set("languages", v)} suggestions={TECHNOLOGY_SUGGESTIONS} maxTags={20} maxLength={40} />
        </Field>
      </Section>

      <Section id="sec-team" title="Team and working arrangement">
        <Field label="Team and product context" htmlFor="role-team" optional help="Who they work with and what the product does. Helps applicants pick relevant projects.">
          <Textarea id="role-team" value={draft.teamContext} onChange={text("teamContext")} maxLength={2000} rows={3} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location" htmlFor="role-location" optional>
            <Input id="role-location" value={draft.location} onChange={text("location")} maxLength={120} placeholder="London or Berlin" />
          </Field>
          <Field label="Working arrangement" htmlFor="role-remote" optional>
            <Select id="role-remote" value={draft.remotePolicy} onChange={(e) => set("remotePolicy", e.target.value === "onsite" || e.target.value === "hybrid" || e.target.value === "remote" ? e.target.value : "")}>
              <option value="">Not stated</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </Field>
          <Field label="Compensation" htmlFor="role-comp" optional help="A range is enough. Applicants see exactly what you write.">
            <Input id="role-comp" value={draft.compensation} onChange={text("compensation")} maxLength={200} placeholder="£85,000 to £105,000 plus equity" />
          </Field>
        </div>
      </Section>

      <Section id="sec-people" title="People" description="Choose from active members of your workspace.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Hiring owner" htmlFor="role-owner" optional>
            <Select id="role-owner" value={draft.hiringOwner} onChange={(e) => set("hiringOwner", e.target.value)}>
              <option value="">No owner yet</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">Reviewers</legend>
          {members.length === 0 ? (
            <p className="text-app-meta text-[var(--text-secondary)]">No other active members yet. Invite teammates from Team settings.</p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {members.map((m) => (
                <label key={m.userId} className="flex items-center gap-2.5 text-app-meta text-[var(--text-body)]">
                  <input
                    type="checkbox"
                    checked={draft.reviewerIds.includes(m.userId)}
                    onChange={(e) => set("reviewerIds", e.target.checked ? [...draft.reviewerIds, m.userId] : draft.reviewerIds.filter((id) => id !== m.userId))}
                    className="h-4 w-4 shrink-0 accent-[var(--control-solid)]"
                  />
                  <span className="min-w-0 truncate">{m.label}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </Section>

      <Section id="sec-process" title="Process and evidence" description="Applicants send existing work from their Passport. A work sample is only one way to fill a gap, never the default.">
        <Field label="Application process" htmlFor="role-steps" optional help="Steps in order, so applicants know what happens after they apply.">
          <ListEditor
            id="role-steps"
            items={draft.hiringSteps}
            onChange={(v) => set("hiringSteps", v)}
            maxItems={8}
            maxLength={160}
            placeholder="Evidence review within a week"
            addLabel="Add step"
          />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">Evidence you accept</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {EVIDENCE_KINDS.map((k) => (
              <label key={k} className="flex items-center gap-2.5 text-app-meta text-[var(--text-body)]">
                <input
                  type="checkbox"
                  checked={draft.acceptedEvidence.includes(k)}
                  onChange={(e) => set("acceptedEvidence", e.target.checked ? [...draft.acceptedEvidence, k] : draft.acceptedEvidence.filter((x) => x !== k))}
                  className="h-4 w-4 shrink-0 accent-[var(--control-solid)]"
                />
                {EVIDENCE_LABEL[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-app-meta font-medium text-[var(--text-primary)]">When to use a work sample</legend>
          <div className="grid gap-2">
            {(Object.keys(WORK_SAMPLE_POLICY_LABEL) as WorkSamplePolicy[]).map((p) => (
              <Radio key={p} name="work-sample-policy" value={p} checked={draft.workSamplePolicy === p} onChange={(v) => set("workSamplePolicy", v)} label={WORK_SAMPLE_POLICY_LABEL[p]} />
            ))}
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Expected effort from applicants" htmlFor="role-effort" optional>
            <Input id="role-effort" value={draft.expectedEffort} onChange={text("expectedEffort")} maxLength={200} placeholder="About 2 hours across the process" />
          </Field>
          <Field label="Application deadline" htmlFor="role-deadline" optional>
            <Input id="role-deadline" type="date" value={draft.applicationDeadline} onChange={text("applicationDeadline")} />
          </Field>
          <Field label="Contact email" htmlFor="role-contact" optional help="Shown on the role page for questions.">
            <Input id="role-contact" type="email" value={draft.contactEmail} onChange={text("contactEmail")} maxLength={254} />
          </Field>
        </div>
      </Section>

      <Section id="sec-visibility" title="Visibility and status">
        <fieldset className="grid gap-2">
          <legend className="sr-only">Visibility</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(VISIBILITY_LABEL) as Visibility[]).map((v) => (
              <Radio key={v} name="visibility" value={v} checked={draft.visibility === v} onChange={(x) => set("visibility", x)} label={VISIBILITY_LABEL[v].label} help={VISIBILITY_LABEL[v].help} />
            ))}
          </div>
        </fieldset>
        <p className="text-app-meta text-[var(--text-secondary)]">
          {roleId
            ? `Application status: ${stateLabel ?? "Draft"}. Publish, pause or close applications from the role page.`
            : "Saved as a draft. Applications open only when you publish from the role page and confirm it's a genuine opening."}
        </p>
      </Section>

      <FormError>{error}</FormError>
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-1 py-3">
        <Button type="submit" variant="primary" loading={busy} disabled={!draft.title.trim() || !!pendingProblem}>
          {roleId ? "Save changes" : "Save draft"}
        </Button>
        <ButtonLink href={roleId ? `/app/employer/openings/${roleId}` : "/app/employer/openings"} variant="quiet">
          Cancel
        </ButtonLink>
        {pendingProblem ? <p className="text-app-meta text-[var(--status-attention-ink)]">{pendingProblem}</p> : null}
      </div>
    </form>
  );
}
