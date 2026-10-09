"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, FormSuccess, Input } from "@/components/ui/Field";

/** Asks for a fresh confirmation link. The server answers the same way for every address. */
export default function ResendConfirmation({ initialEmail, next }: { initialEmail: string; next: string | null }) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (res.status === 429) throw new Error("You have asked for several links already. Wait a while, then try again.");
      if (!res.ok) throw new Error(data.error ?? "We could not send the link. Try again.");
      setMessage(data.message ?? "A new link is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not send the link. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form method="post" onSubmit={submit} className="grid gap-4">
      <Field label="Email" htmlFor="resend-email">
        <Input id="resend-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" spellCheck={false} required disabled={sending} />
      </Field>
      {message ? <FormSuccess>{message}</FormSuccess> : null}
      {error ? <FormError>{error}</FormError> : null}
      <Button type="submit" variant="secondary" size="lg" loading={sending} className="w-full">
        {sending ? "Sending" : "Send a new confirmation link"}
      </Button>
    </form>
  );
}
