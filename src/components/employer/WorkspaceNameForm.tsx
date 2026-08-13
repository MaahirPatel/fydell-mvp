"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

/**
 * Inline save rather than a modal: renaming is a one-field change and the
 * result is visible in the sidebar immediately after the refresh.
 */
export default function WorkspaceNameForm({
  initialName,
  canEdit,
}: {
  initialName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = name.trim() !== initialName.trim();

  if (!canEdit) {
    return (
      <p className="text-[13.5px] text-[var(--text-primary)]">
        {initialName}
        <span className="mt-1 block text-[12.5px] text-[var(--text-tertiary)]">
          Only an owner or admin can change this.
        </span>
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not save.");
        return;
      }
      notify("Workspace name saved", "good");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <Input
          id="workspace-name"
          name="workspace-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workspace name"
          aria-describedby={error ? "workspace-name-error" : undefined}
          invalid={Boolean(error)}
          maxLength={80}
        />
        {error ? (
          <p
            id="workspace-name-error"
            role="alert"
            className="mt-1.5 text-[12.5px] text-[var(--fydell-risk)]"
          >
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" variant="secondary" loading={saving} disabled={!dirty}>
        Save
      </Button>
    </form>
  );
}
