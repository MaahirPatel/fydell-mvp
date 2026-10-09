"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { engFetch } from "@/components/eng/api";
import CreateRoleForm from "@/components/eng/CreateRoleForm";

function humanizeWorkspaceError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("reserved")) return "That name is reserved. Choose a different workspace name.";
  if (lower.includes("unauthorized") || lower.includes("401")) return "Your session expired. Log in again to finish setting up your workspace.";
  if (lower.includes("not configured") || lower.includes("503")) return "Workspace creation is temporarily unavailable. Try again shortly.";
  if (lower.includes("network") || lower.includes("fetch")) return "We could not reach Fydell. Check your connection and try again.";
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) return "We could not create your workspace. Try again.";
  return raw;
}

/** Creates the organization and owner membership through the existing employer role endpoint. */
export function WorkspaceForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialName);
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const name = companyName.trim();
    if (!name) {
      setFieldError("Enter your company name.");
      return;
    }
    setFieldError(null);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "employer", companyName: name, companyWebsite: companyWebsite.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Request failed");
      router.refresh();
    } catch (err) {
      setError(humanizeWorkspaceError(err instanceof Error ? err.message : "Something went wrong"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" htmlFor="workspace-name" error={fieldError} help="Your team and your candidates see this.">
          <Input
            id="workspace-name"
            name="organization"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setFieldError(null);
            }}
            autoComplete="organization"
            invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "workspace-name-error" : "workspace-name-help"}
            disabled={busy}
            required
          />
        </Field>
        <Field label="Company website" htmlFor="workspace-website" optional>
          <Input
            id="workspace-website"
            name="url"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            autoComplete="url"
            inputMode="url"
            placeholder="https://"
            disabled={busy}
          />
        </Field>
      </div>
      {error ? <FormError>{error}</FormError> : null}
      <div>
        <Button type="submit" variant="primary" size="md" loading={busy}>
          {busy ? "Creating workspace" : "Create workspace"}
        </Button>
      </div>
    </form>
  );
}

/** Creates the draft role in place; the page re-reads it and moves on to publishing. */
export function CreateRoleStep({ focusOptions }: { focusOptions: ComponentProps<typeof CreateRoleForm>["focusOptions"] }) {
  return <CreateRoleForm focusOptions={focusOptions} onCreated={() => undefined} />;
}

/** Publishes a draft role. Publishing freezes its details, which the copy beside the button says plainly. */
export function PublishRole({ roleId }: { roleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await engFetch(`/api/eng/roles/${roleId}`, { method: "PATCH", body: { status: "published" } });
    if (res.ok === false) {
      setError(res.error);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <p className="max-w-[60ch] text-app-meta leading-[1.55] text-[var(--text-secondary)]">
        Publishing freezes the role&apos;s details and task version, so every candidate you invite gets the same work. You can
        still edit the draft from the role page first.
      </p>
      {error ? <FormError>{error}</FormError> : null}
      <div>
        <Button variant="primary" size="md" loading={busy} onClick={() => void publish()}>
          {busy ? "Publishing" : "Publish role"}
        </Button>
      </div>
    </div>
  );
}
