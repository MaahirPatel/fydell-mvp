"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";

export type ProfileBasics = { displayName: string; handle: string; headline: string; location: string };

/**
 * Name, @handle, headline and location: the fields an employer sees first and
 * the handle they invite by. Saves through the same endpoint as the full
 * profile editor.
 */
export default function ProfileBasicsForm({ initial, complete }: { initial: ProfileBasics; complete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!complete);
  const [values, setValues] = useState<ProfileBasics>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileBasics, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = saving || refreshing;

  function set<K extends keyof ProfileBasics>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: Partial<Record<keyof ProfileBasics, string>> = {};
    if (!values.displayName.trim()) next.displayName = "Enter the name employers should see.";
    if (!values.handle.trim().replace(/^@/, "")) next.handle = "Choose a handle. Employers invite you by it.";
    if (!values.headline.trim()) next.headline = "Add a one-line headline.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: values.displayName.trim(),
          handle: values.handle.trim().replace(/^@/, ""),
          headline: values.headline.trim(),
          location: values.location.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; profile?: { handle?: string } };
      if (!res.ok) {
        const message = data.error ?? "Could not save your profile. Try again.";
        if (/handle/i.test(message)) setErrors({ handle: message });
        else setError(message);
        return;
      }
      if (data.profile?.handle) setValues((v) => ({ ...v, handle: data.profile?.handle ?? v.handle }));
      // Close the form in the same transition as the refreshed checklist, so
      // the step never shows "Next" with the form already gone.
      startRefresh(() => {
        router.refresh();
        setEditing(false);
      });
    } catch {
      setError("Fydell could not be reached. Your changes are kept; try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Button variant="quiet" size="sm" className="-ml-3" onClick={() => setEditing(true)}>
        Edit basics
      </Button>
    );
  }

  return (
    <form onSubmit={save} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ob-name" error={errors.displayName}>
          <Input
            id="ob-name"
            value={values.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            autoComplete="name"
            maxLength={120}
            invalid={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? "ob-name-error" : undefined}
            disabled={busy}
          />
        </Field>
        <Field label="Handle" htmlFor="ob-handle" error={errors.handle} help="Employers can invite you by @handle without seeing your email.">
          <Input
            id="ob-handle"
            value={values.handle}
            onChange={(e) => set("handle", e.target.value)}
            autoComplete="username"
            spellCheck={false}
            maxLength={31}
            placeholder="@maya"
            invalid={Boolean(errors.handle)}
            aria-describedby={errors.handle ? "ob-handle-error" : "ob-handle-help"}
            disabled={busy}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
        <Field label="Headline" htmlFor="ob-headline" error={errors.headline}>
          <Input
            id="ob-headline"
            value={values.headline}
            onChange={(e) => set("headline", e.target.value)}
            maxLength={160}
            placeholder="Backend engineer, payments and data pipelines"
            invalid={Boolean(errors.headline)}
            aria-describedby={errors.headline ? "ob-headline-error" : undefined}
            disabled={busy}
          />
        </Field>
        <Field label="Location" htmlFor="ob-location" optional>
          <Input
            id="ob-location"
            value={values.location}
            onChange={(e) => set("location", e.target.value)}
            maxLength={120}
            autoComplete="address-level2"
            placeholder="Berlin, remote"
            disabled={busy}
          />
        </Field>
      </div>
      {error ? <FormError>{error}</FormError> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="md" loading={busy}>
          {busy ? "Saving" : "Save basics"}
        </Button>
        {complete ? (
          <Button variant="quiet" size="md" disabled={busy} onClick={() => setEditing(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
