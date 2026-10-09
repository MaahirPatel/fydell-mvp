"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

type Phase = "idle" | "sending" | "sent" | "confirming";

/**
 * Shows the accept action only once the signed-in account has proved it
 * controls its inbox with a code emailed to it. The server enforces the same
 * rule on every accept route; this is the way through it.
 */
export function InboxVerificationGate({
  email,
  verified,
  children,
}: {
  email: string;
  verified: boolean;
  children: ReactNode;
}) {
  const [confirmed, setConfirmed] = useState(verified);
  const [phase, setPhase] = useState<Phase>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devLog, setDevLog] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);

  useEffect(() => {
    if (waitSeconds <= 0) return;
    const timer = window.setTimeout(() => setWaitSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [waitSeconds]);

  if (confirmed) return <>{children}</>;

  const sent = phase === "sent" || phase === "confirming";

  const send = async () => {
    setPhase("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/email-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send" }),
      });
      const data: { error?: string; verified?: boolean; delivery?: string } = await res.json().catch(() => ({}));
      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After"));
        if (Number.isFinite(retry) && retry > 0) setWaitSeconds(Math.min(retry, 3600));
      }
      if (!res.ok) throw new Error(data.error || "The code could not be sent.");
      if (data.verified) {
        setConfirmed(true);
        return;
      }
      setDevLog(data.delivery === "dev_log");
      setWaitSeconds(60);
      setPhase("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The code could not be sent.");
      setPhase((p) => (p === "sending" && sent ? "sent" : "idle"));
    }
  };

  const confirm = async () => {
    setPhase("confirming");
    setError(null);
    try {
      const res = await fetch("/api/auth/email-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code: code.trim() }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That code could not be checked.");
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code could not be checked.");
      setPhase("sent");
    }
  };

  return (
    <div className="max-w-[62ch] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-4">
      <h2 className="text-app-body font-medium text-[var(--text-primary)]">
        Confirm your email to accept this invitation
      </h2>
      <p className="mt-1.5 text-app-body leading-[1.6] text-[var(--text-secondary)]">
        We will email a 6-digit code to <span className="text-[var(--text-primary)]">{email}</span>.
        Entering it shows the address is yours. You only need to do this once.
      </p>

      {sent ? (
        <div className="mt-4">
          <p role="status" className="text-app-meta leading-[1.6] text-[var(--text-secondary)]">
            {devLog
              ? "Email is not set up in this development environment, so the code was written to the server log instead of being emailed."
              : `Code sent to ${email}. It expires in 15 minutes.`}
          </p>
          <form
            className="mt-3 flex flex-wrap items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <label className="sr-only" htmlFor="inbox-code">
              6-digit code
            </label>
            <Input
              id="inbox-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-[9.5rem] tracking-[0.2em]"
            />
            <Button type="submit" variant="primary" size="lg" loading={phase === "confirming"} disabled={code.length !== 6}>
              Confirm email
            </Button>
          </form>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant={sent ? "secondary" : "primary"}
          size={sent ? "md" : "lg"}
          loading={phase === "sending"}
          disabled={waitSeconds > 0 || phase === "confirming"}
          onClick={() => void send()}
        >
          {sent ? "Resend code" : "Send code"}
        </Button>
        {waitSeconds > 0 ? (
          <span className="text-app-meta text-[var(--text-tertiary)]">You can ask for another code in {waitSeconds}s.</span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-app-body leading-[1.6] text-[var(--fydell-risk)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
