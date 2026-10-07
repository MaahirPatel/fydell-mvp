"use client";

import { type FormEvent, useState } from "react";
import TurnstileField from "@/components/security/TurnstileField";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { PRO_WAITLIST_COMPANY } from "@/lib/marketing/pricing";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done"; reference: string };

/**
 * Joins the Pro waitlist through the public request endpoint, which stores
 * the request and notifies the team. Nothing is charged and no plan changes.
 */
export default function ProWaitlistForm() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [captchaToken, setCaptchaToken] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/public/pilot-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          company: PRO_WAITLIST_COMPANY,
          role: "Engineer",
          note: "Joined the Fydell Pro waitlist from the pricing page.",
          captchaToken: String(fd.get("captchaToken") ?? captchaToken).trim(),
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      const body = (data && typeof data === "object" ? data : {}) as { success?: unknown; publicReference?: unknown; error?: unknown };
      if (!res.ok || body.success !== true || typeof body.publicReference !== "string") {
        setState({ kind: "error", message: typeof body.error === "string" ? body.error : "Could not join the waitlist. Please try again." });
        return;
      }
      setState({ kind: "done", reference: body.publicReference });
    } catch {
      setState({ kind: "error", message: "Network error. Check your connection and try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div role="status" className="rounded-[10px] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] p-5">
        <p className="text-[16px] font-medium text-[var(--text-primary)]">You&apos;re on the Pro waitlist.</p>
        <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
          Reference <span className="font-medium tabular-nums text-[var(--text-primary)]">{state.reference}</span>. We&apos;ll email you when Pro opens. Nothing is charged.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-label="Join the Pro waitlist">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="waitlist-name">
          <Input id="waitlist-name" name="name" type="text" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="waitlist-email">
          <Input id="waitlist-email" name="email" type="email" required autoComplete="email" />
        </Field>
      </div>
      <FormError>{state.kind === "error" ? state.message : null}</FormError>
      <TurnstileField onToken={setCaptchaToken} />
      <Button type="submit" variant="primary" loading={state.kind === "sending"}>
        Join the Pro waitlist
      </Button>
    </form>
  );
}
