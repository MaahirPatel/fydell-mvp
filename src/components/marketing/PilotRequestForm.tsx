"use client";

import { FormEvent, useEffect, useState } from "react";

const inputClass =
  "h-11 w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-0)] px-3.5 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] outline-none transition-[border-color,background] duration-150 focus:border-[var(--brand-blue)] focus:bg-[var(--surface-1)]";

type Status = "idle" | "submitting" | "success" | "error";

function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  // #region agent log
  fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "dc0a6c",
    },
    body: JSON.stringify({
      sessionId: "dc0a6c",
      runId: "pre-fix",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function PilotRequestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const form = document.getElementById("pilot-request-form") as HTMLFormElement | null;
    debugLog(
      "PilotRequestForm.tsx:mount",
      "Form security probe on mount",
      {
        protocol: typeof window !== "undefined" ? window.location.protocol : null,
        host: typeof window !== "undefined" ? window.location.host : null,
        action: form?.getAttribute("action") ?? null,
        method: form?.getAttribute("method") ?? null,
        isMailto: Boolean(form?.getAttribute("action")?.startsWith("mailto:")),
        isGet: (form?.getAttribute("method") ?? "").toLowerCase() === "get",
        hasPasswordField: Boolean(form?.querySelector('input[type="password"]')),
        fieldCount: form ? form.querySelectorAll("input, textarea").length : 0,
      },
      "A"
    );
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const action = form.getAttribute("action");
    const method = form.getAttribute("method");

    debugLog(
      "PilotRequestForm.tsx:submit",
      "Submit intercepted",
      {
        action,
        method,
        isMailto: Boolean(action?.startsWith("mailto:")),
        protocol: window.location.protocol,
        willPostJson: true,
      },
      "A"
    );

    setStatus("submitting");
    setError(null);

    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      company: String(fd.get("company") ?? "").trim(),
      role: String(fd.get("role") ?? "").trim(),
      candidates: String(fd.get("candidates") ?? "").trim(),
      note: String(fd.get("note") ?? "").trim(),
    };

    debugLog(
      "PilotRequestForm.tsx:before-api",
      "About to POST pilot request (no PII values)",
      {
        hasName: Boolean(payload.name),
        hasEmail: Boolean(payload.email),
        hasCompany: Boolean(payload.company),
        hasRole: Boolean(payload.role),
        hasCandidates: Boolean(payload.candidates),
        hasNote: Boolean(payload.note),
        endpoint: "/api/mvp/pilot-requests",
      },
      "B"
    );

    try {
      const res = await fetch("/api/mvp/pilot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      debugLog(
        "PilotRequestForm.tsx:after-api",
        "API response received",
        {
          ok: res.ok,
          status: res.status,
          hasId: Boolean(data?.id),
          error: typeof data?.error === "string" ? data.error : null,
        },
        "B"
      );

      if (!res.ok) {
        setStatus("error");
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not submit your request. Please try again."
        );
        return;
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      debugLog(
        "PilotRequestForm.tsx:network-error",
        "Fetch failed",
        { message: err instanceof Error ? err.message : "unknown" },
        "B"
      );
      setStatus("error");
      setError("Network error. Please check your connection and try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[12px] border border-[#39D98A]/25 bg-[#39D98A]/08 px-5 py-6 text-center">
        <p className="text-[15px] font-semibold text-white">Request received</p>
        <p className="mt-2 text-[13px] text-white/[0.66]">
          We will reply within one business day to confirm setup details. You can also{" "}
          <a href="/login" className="text-[#24C7D9] underline-offset-2 hover:underline">
            create a workspace
          </a>{" "}
          and explore the employer dashboard now — no payment required.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-[13px] text-white/[0.46] hover:text-white/[0.68]"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      id="pilot-request-form"
      action="/api/mvp/pilot-requests"
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

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex h-11 w-full items-center justify-center rounded-[9px] bg-[#F2F3F5] px-6 text-[14px] text-[#090A0D] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ fontWeight: 580 }}
      >
        {status === "submitting" ? "Sending…" : "Request a pilot"}
      </button>
    </form>
  );
}
