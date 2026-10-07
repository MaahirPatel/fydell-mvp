"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, FormError, Textarea } from "@/components/ui/Field";

type ActionKind =
  | "eng_run.requeue"
  | "eng_run.cancel"
  | "eng_attempt.enqueue_evaluation"
  | "eng_upload.reset"
  | "import_job.retry"
  | "import_job.cancel";

type ResultBody = {
  result?: { outcome: string; afterState: string | null; detail: string | null; duplicate: boolean };
  error?: string;
};

/**
 * Asks for a reason, then posts one audited action. The idempotency key is
 * minted when the dialog opens and reused for every submit from it, so a
 * double click or a retried request acts once.
 */
export function OpsActionButton({
  action,
  targetId,
  label,
  title,
  description,
  destructive = false,
}: {
  action: ActionKind;
  targetId: string;
  label: string;
  title: string;
  description: string;
  destructive?: boolean;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const close = useCallback(() => setOpen(false), []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ops/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId, reason, idempotencyKey: key }),
      });
      const body = (await res.json().catch(() => ({}))) as ResultBody;
      if (!body.result) {
        setError(body.error ?? `Request failed (${res.status}).`);
        return;
      }
      const r = body.result;
      const summary = `${r.outcome}${r.afterState ? ` → ${r.afterState}` : ""}${r.detail ? `: ${r.detail}` : ""}`;
      if (r.outcome === "rejected" || r.outcome === "error") {
        setError(summary);
        return;
      }
      setMessage(summary);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Submitting again is safe; it will not act twice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {message ? <span className="text-app-meta text-[var(--text-secondary)]">{message}</span> : null}
      <Button
        size="sm"
        variant={destructive ? "destructive" : "secondary"}
        onClick={() => {
          setReason("");
          setError(null);
          setMessage(null);
          setKey(`ui-${crypto.randomUUID()}`);
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={title}
        description={description}
        width="sm"
        footer={
          <>
            <Button variant="quiet" onClick={close}>
              Back
            </Button>
            <Button variant={destructive ? "destructive" : "primary"} loading={busy} disabled={reason.trim().length < 5} onClick={submit}>
              {label}
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor={fieldId} help="Recorded in the operator audit log with your email and the time.">
          <Textarea id={fieldId} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What you saw and why this action is right" />
        </Field>
        <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">Target {targetId}</p>
        {error ? (
          <div className="mt-3">
            <FormError>{error}</FormError>
          </div>
        ) : null}
      </Dialog>
    </span>
  );
}
