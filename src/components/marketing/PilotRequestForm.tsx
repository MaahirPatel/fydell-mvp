"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import TurnstileField from "@/components/security/TurnstileField";

const inputClass =
  "h-[43px] w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-0)] px-3.5 text-[14px] text-[var(--text-primary)] placeholder:text-[rgba(244,245,247,0.28)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--brand-blue)] focus:shadow-[0_0_0_2px_rgba(86,98,255,0.22)]";

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
      <div className="rounded-[12px] border border-[rgba(103,217,160,0.25)] bg-[rgba(103,217,160,0.08)] px-5 py-6">
        <p className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
          Request received
        </p>
        <p className="mt-2 text-[13px] text-[rgba(244,245,247,0.72)]">
          Reference:{" "}
          <span className="tabular-nums text-[#F4F5F7]" style={{ fontWeight: 560 }}>
            {success.publicReference}
          </span>
        </p>
        <p className="mt-3 text-[13px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
          A confirmation email is being sent to {success.workEmail}. A member of the Fydell team
          will reply within one business day.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[13px] text-[#08090C]"
            style={{ fontWeight: 560 }}
          >
            Create a workspace
          </Link>
          <Link
            href="/"
            className="text-[13px] text-[rgba(244,245,247,0.62)] transition-colors hover:text-[#F4F5F7]"
          >
            Return to homepage →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setSuccess(null);
          }}
          className="mt-4 text-[13px] text-[rgba(244,245,247,0.4)] hover:text-[rgba(244,245,247,0.7)]"
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
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-[12px] text-[var(--text-secondary)]"
            style={{ fontWeight: 520 }}
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[12px] text-[var(--text-secondary)]"
            style={{ fontWeight: 520 }}
          >
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="company"
          className="mb-1.5 block text-[12px] text-[var(--text-secondary)]"
          style={{ fontWeight: 520 }}
        >
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          required
          autoComplete="organization"
          placeholder="Company name"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="role"
          className="mb-1.5 block text-[12px] text-[var(--text-secondary)]"
          style={{ fontWeight: 520 }}
        >
          Role you are hiring for
        </label>
        <input
          id="role"
          name="role"
          type="text"
          required
          placeholder="Role title"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="candidates"
          className="mb-1.5 block text-[12px] text-[var(--text-secondary)]"
          style={{ fontWeight: 520 }}
        >
          Approximate number of candidates
        </label>
        <input
          id="candidates"
          name="candidates"
          type="text"
          placeholder="e.g. 5–10"
          className={inputClass}
        />
      </div>

      <div>
        <label
          htmlFor="note"
          className="mb-1.5 block text-[12px] text-[var(--text-secondary)]"
          style={{ fontWeight: 520 }}
        >
          Anything we should know?{" "}
          <span className="text-[var(--text-disabled)]">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Timeline, focus areas, anything else relevant..."
          className={`${inputClass} h-auto min-h-[88px] resize-none py-3`}
        />
      </div>

      {error ? (
        <p className="rounded-[10px] border border-[rgba(242,107,130,0.30)] bg-[rgba(242,107,130,0.10)] px-3 py-2 text-[13px] text-[var(--risk)]">
          {error}
        </p>
      ) : null}

      <TurnstileField onToken={setCaptchaToken} />

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-11 w-full items-center justify-center rounded-[9px] bg-[#F2F3F5] px-6 text-[14px] text-[#090A0D] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ fontWeight: 580 }}
      >
        {status === "submitting" ? "Saving…" : "Request a pilot"}
      </button>
    </form>
  );
}
