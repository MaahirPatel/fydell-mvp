"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { engFetch } from "./api";

type FocusKey = "correctness" | "engineering_judgment" | "requirement_response" | "work_communication";

export interface RoleFormValues {
  title: string;
  stack: string[];
  responsibilities: string;
  evaluationFocus: FocusKey[];
  companyContext: string;
}

export default function CreateRoleForm({
  focusOptions,
  initial,
  roleId,
  onDone,
}: {
  focusOptions: { key: FocusKey; label: string }[];
  initial?: RoleFormValues;
  roleId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [stack, setStack] = useState((initial?.stack ?? ["Python"]).join(", "));
  const [responsibilities, setResponsibilities] = useState(initial?.responsibilities ?? "");
  const [companyContext, setCompanyContext] = useState(initial?.companyContext ?? "");
  const [focus, setFocus] = useState<FocusKey[]>(initial?.evaluationFocus ?? focusOptions.map((f) => f.key));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      title,
      stack: stack.split(",").map((s) => s.trim()).filter(Boolean),
      responsibilities,
      companyContext,
      evaluationFocus: focus,
    };
    const res = roleId
      ? await engFetch<{ role: { id: string } }>(`/api/eng/roles/${roleId}`, { method: "PATCH", body })
      : await engFetch<{ role: { id: string } }>("/api/eng/roles", { body });
    setSaving(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    if (roleId) {
      onDone?.();
      router.refresh();
    } else {
      router.push(`/app/employer/engineering/roles/${res.data.role.id}`);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <FormError>{error}</FormError>
      <Field label="Role title" htmlFor="role-title">
        <Input id="role-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Backend engineer, payments" />
      </Field>
      <Field label="Stack" htmlFor="role-stack" help="Comma separated. Shown to reviewers as context; the task itself is Python.">
        <Input id="role-stack" value={stack} onChange={(e) => setStack(e.target.value)} />
      </Field>
      <Field label="Responsibilities" htmlFor="role-resp" optional>
        <Textarea id="role-resp" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} maxLength={2000} rows={3} />
      </Field>
      <Field label="Company context shown to candidates" htmlFor="role-context" optional help="One or two sentences about your team. Candidates see this on the invitation.">
        <Textarea id="role-context" value={companyContext} onChange={(e) => setCompanyContext(e.target.value)} maxLength={1500} rows={3} />
      </Field>
      <fieldset>
        <legend className="text-[13px] font-medium text-[var(--text-primary)]">What the assessment should show</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {focusOptions.map((option) => (
            <label key={option.key} className="flex items-center gap-2 text-app-body text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={focus.includes(option.key)}
                onChange={(e) => setFocus((prev) => (e.target.checked ? [...prev, option.key] : prev.filter((k) => k !== option.key)))}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Button type="submit" variant="primary" loading={saving}>
          {roleId ? "Save changes" : "Create draft role"}
        </Button>
      </div>
    </form>
  );
}
