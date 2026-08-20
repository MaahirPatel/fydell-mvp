"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import TurnstileField from "@/components/security/TurnstileField";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";

type Status = "idle" | "submitting" | "success" | "error";

type SuccessState = {
  publicReference: string;
  workEmail: string;
};

export function PilotRequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    setStatus("submitting");
    setError(null);
    setSuccess(null);

    const fd = new FormData(form);
    const token = String(fd.get("captchaToken") ?? captchaToken ?? "").trim();
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      role: String(fd.get("role") ?? "").trim(),
      candidates: String(fd.get("candidates") ?? "").trim(),
      note: String(fd.get("note") ?? "").trim(),
      captchaToken: token,
    };

    try {
      const res = await fetch("/api/public/pilot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success || !data?.publicReference) {
        setStatus("error");
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not submit your request. Please try again."
        );
        return;
      }

      setSuccess({
        publicReference: String(data.publicReference),
        workEmail: String(data.workEmail || payload.email),
      });
      setStatus("success");
      form.reset();
      setCaptchaToken("");
    } catch {
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success" && success) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-frame)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] p-5 sm:p-6"
      >
        <p className="text-[15px] font-medium text-[var(--text-primary)]">
          Request received
        </p>
        <p className="mt-2 text-[13.5px] text-[var(--text-secondary)]">
          Reference{" "}
          <span className="tabular-nums font-medium text-[var(--text-primary)]">
            {success.publicReference}
          </span>
        </p>
        <p className="mt-3 max-w-[52ch] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
          A confirmation is on its way to {success.workEmail}. You do not have to
          wait for us to start: you can create a workspace and run the
          evaluation yourself now.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ButtonLink href="/signup" variant="primary" size="sm">
            Create your workspace
          </ButtonLink>
          <Link
            href="/"
            className="text-[13px] text-[var(--text-secondary)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
          >
            Return to homepage
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setSuccess(null);
          }}
          className="mt-4 text-[13px] text-[var(--text-tertiary)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      id="pilot-request-form"
      action="/api/public/pilot-requests"
      method="POST"
      onSubmit={onSubmit}
      className="space-y-4"
      autoComplete="on"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
          />
        </Field>
        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="company">
          <Input
            id="company"
            name="company"
            type="text"
            required
            autoComplete="organization"
          />
        </Field>
        <Field label="Role you are hiring for" htmlFor="role">
          <Input
            id="role"
            name="role"
            type="text"
            required
          />
        </Field>
      </div>

      <Field label="Candidates you expect" htmlFor="candidates" optional>
        <Input id="candidates" name="candidates" type="text" placeholder="e.g. 5–10" />
      </Field>

      <Field label="Anything we should know?" htmlFor="note" optional>
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Timeline, focus areas, anything else relevant."
        />
      </Field>

      <FormError>{error}</FormError>

      <TurnstileField onToken={setCaptchaToken} />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        loading={status === "submitting"}
      >
        Request a pilot
      </Button>
    </form>
  );
}
