"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

export function SimulationSubmitDialog({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Submit attempt?">
      <p className="text-[13px] text-[var(--text-secondary)]">
        Submission is final for this attempt. Your artifacts, communications, and telemetry will be frozen for employer analysis.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
          Keep working
        </Button>
        <Button variant="primary" size="sm" onClick={onConfirm} loading={busy}>
          Submit attempt
        </Button>
      </div>
    </Dialog>
  );
}
