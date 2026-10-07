"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/Field";

function requestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The short version of "Add a project without source" from the Passport page,
 * posting to the same endpoint. Everything beyond the name is optional; the
 * full editor on the Passport page can fill in the rest later.
 */
export default function ManualProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contribution, setContribution] = useState("");
  const [technologies, setTechnologies] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  // One id per intended project, so a retried request never adds it twice.
  const pending = useRef<string | null>(null);

  async function save(confirmDuplicate: boolean) {
    if (busy) return;
    if (title.trim().length === 0) {
      setTitleError("Give the project a name.");
      return;
    }
    setTitleError(null);
    setBusy(true);
    setError(null);
    setSaved(null);
    pending.current ??= requestId();
    try {
      const res = await fetch("/api/passport/presentations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientRequestId: pending.current,
          confirmDuplicate,
          presentation: {
            title: title.trim(),
            summary: summary.trim(),
            purpose: "",
            intendedUsers: "",
            contribution: contribution.trim(),
            teamContext: "unspecified",
            projectState: "unspecified",
            outcomes: "",
            technologies: technologies.split(",").map((t) => t.trim()).filter(Boolean),
            links: link.trim() ? [{ label: "", url: link.trim() }] : [],
            startedOn: null,
            endedOn: null,
            featured: false,
            visibility: "shareable",
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; duplicateOf?: unknown; presentation?: { title?: string } };
      if (res.status === 409 && data.duplicateOf) {
        setDuplicate(data.error ?? "You already have a project with this name.");
        return;
      }
      if (!res.ok || !data.presentation) {
        setError(data.error ?? "Could not add the project. Your text is kept; try again.");
        return;
      }
      setSaved(data.presentation.title ?? title.trim());
      setDuplicate(null);
      pending.current = null;
      setTitle("");
      setSummary("");
      setContribution("");
      setTechnologies("");
      setLink("");
      router.refresh();
    } catch {
      setError("Fydell could not be reached. Your text is kept; try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
      className="grid gap-4"
      noValidate
    >
      <p className="max-w-[64ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
        For work you can&apos;t share the source of. Your profile shows it as your description, and says that Fydell has not
        analyzed any code for it.
      </p>
      {saved ? (
        <FormSuccess>
          Added &ldquo;{saved}&rdquo; to your profile. Add another, or create a share link when you&apos;re ready.
        </FormSuccess>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" htmlFor="mp-title" error={titleError}>
          <Input
            id="mp-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(null);
              setDuplicate(null);
            }}
            maxLength={120}
            invalid={Boolean(titleError)}
            aria-describedby={titleError ? "mp-title-error" : undefined}
            placeholder="Payments reconciliation service"
            disabled={busy}
            required
          />
        </Field>
        <Field label="Technologies" htmlFor="mp-tech" optional help="Comma separated.">
          <Input
            id="mp-tech"
            value={technologies}
            onChange={(e) => setTechnologies(e.target.value)}
            placeholder="Go, PostgreSQL, Kafka"
            aria-describedby="mp-tech-help"
            disabled={busy}
          />
        </Field>
      </div>
      <Field label="What it is" htmlFor="mp-summary" optional>
        <Textarea
          id="mp-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={600}
          rows={2}
          placeholder="One or two sentences about what the project does."
          disabled={busy}
        />
      </Field>
      <Field label="Your part" htmlFor="mp-contribution" optional>
        <Textarea
          id="mp-contribution"
          value={contribution}
          onChange={(e) => setContribution(e.target.value)}
          maxLength={1200}
          rows={3}
          placeholder="What you built or changed, and the decisions that were yours."
          disabled={busy}
        />
      </Field>
      <Field label="Link" htmlFor="mp-link" optional help="A write-up, demo or product page. https only.">
        <Input
          id="mp-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          inputMode="url"
          placeholder="https://"
          aria-describedby="mp-link-help"
          disabled={busy}
        />
      </Field>
      {duplicate ? (
        <div className="grid gap-2 rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3.5 py-3">
          <p className="text-app-meta leading-[1.5] text-[var(--text-primary)]">{duplicate}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={busy} onClick={() => void save(true)}>
              Add it anyway
            </Button>
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => setDuplicate(null)}>
              Change the name
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <FormError>{error}</FormError> : null}
      <div>
        <Button type="submit" variant="primary" size="md" loading={busy} disabled={Boolean(duplicate)}>
          {busy ? "Adding project" : "Add project"}
        </Button>
      </div>
    </form>
  );
}
