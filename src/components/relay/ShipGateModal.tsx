"use client";

import { useEffect, useState } from "react";

export type ShipFields = {
  whatBuilt: string;
  verification: string;
  limitations: string;
  clientMessage: string;
};

const MIN_GATE_LENGTH = 40;
const MIN_SHORT = 10;

const FIELDS: {
  key: keyof ShipFields;
  label: string;
  helper: string;
  placeholder: string;
  minLength: number;
}[] = [
  {
    key: "whatBuilt",
    label: "What I changed",
    helper: "Plain language for the reviewer — not a dump of every edit.",
    placeholder: "e.g. Normalized shipment IDs before joining delay notes so delayed rows are not dropped.",
    minLength: MIN_SHORT,
  },
  {
    key: "verification",
    label: "Evidence it works",
    helper: "What you ran and what it showed.",
    placeholder: "e.g. Ran test + preview — unmatched IDs cleared; late rate moved from understated to corrected set.",
    minLength: MIN_GATE_LENGTH,
  },
  {
    key: "limitations",
    label: "Remaining limitations or uncertainty",
    helper: "Honest residual risk. Write “none identified” only if you checked.",
    placeholder: "e.g. Haven’t validated weekend exclusion edge cases under the new deadline.",
    minLength: MIN_GATE_LENGTH,
  },
  {
    key: "clientMessage",
    label: "Message to the client",
    helper: "What you would send Dana / Priya with the handoff.",
    placeholder: "Short ops-ready update: what changed, what to trust, what to watch.",
    minLength: MIN_GATE_LENGTH,
  },
];

export default function ShipGateModal({
  open,
  initial,
  submitting,
  onClose,
  onShip,
  readiness,
}: {
  open: boolean;
  initial: ShipFields;
  submitting: boolean;
  onClose: () => void;
  onShip: (fields: ShipFields) => void;
  readiness?: {
    fileCount: number;
    testsLastRunAt: string | null;
    testsOk: boolean | null;
    curveballAck: boolean;
  };
}) {
  const [fields, setFields] = useState<ShipFields>(initial);
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) {
      setFields({
        whatBuilt: initial.whatBuilt || "",
        verification: initial.verification || "",
        limitations: initial.limitations || "",
        clientMessage: initial.clientMessage || "",
      });
      setTouched(false);
      setConfirming(false);
    }
  }, [open, initial]);

  if (!open) return null;

  const errors = FIELDS.filter((f) => fields[f.key].trim().length < f.minLength);
  const canShip = errors.length === 0;

  function handleShip() {
    setTouched(true);
    if (!canShip || submitting) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onShip({
      whatBuilt: fields.whatBuilt.trim(),
      verification: fields.verification.trim(),
      limitations: fields.limitations.trim(),
      clientMessage: fields.clientMessage.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-[12px] border border-white/[0.12] bg-[#10141D] p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="review-submit-title"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#687182]">
          Review & submit
        </p>
        <h2 id="review-submit-title" className="mt-1 text-[19px] font-medium text-[#F4F5F7]">
          Ready to hand off?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#9AA3B2]">
          Attachments (diff, tests, chat, AI activity) are captured automatically. No predicted score
          is shown. Submission freezes your workspace snapshot.
        </p>

        {readiness && (
          <ul className="mt-4 space-y-1 rounded-[8px] border border-white/[0.08] bg-[#0B0F16] px-3 py-2.5 text-[12px] text-[#9AA3B2]">
            <li>Workspace files: {readiness.fileCount}</li>
            <li>
              Tests last run:{" "}
              {readiness.testsLastRunAt
                ? new Date(readiness.testsLastRunAt).toLocaleString()
                : "not yet"}
              {readiness.testsOk === false ? " · last run had failures" : ""}
            </li>
            <li>
              Scenario change:{" "}
              {readiness.curveballAck ? "acknowledged" : "pending or not yet triggered"}
            </li>
          </ul>
        )}

        <div className="mt-5 space-y-4">
          {FIELDS.map((field) => {
            const value = fields[field.key];
            const tooShort = touched && value.trim().length < field.minLength;
            return (
              <label key={field.key} className="block">
                <span className="text-[12.5px] font-medium text-[#F4F5F7]">{field.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-[#687182]">{field.helper}</span>
                <textarea
                  value={value}
                  onChange={(e) => {
                    setConfirming(false);
                    setFields((f) => ({ ...f, [field.key]: e.target.value }));
                  }}
                  placeholder={field.placeholder}
                  rows={3}
                  className={`mt-1.5 w-full resize-none rounded-[8px] border bg-[#0B0F16] px-3 py-2.5 text-[13px] leading-relaxed text-white/85 placeholder:text-[#687182] ${
                    tooShort ? "border-[#F26B82]/50" : "border-white/10"
                  }`}
                />
                {tooShort && (
                  <span className="mt-1 block text-[11px] text-[#fda4b0]">
                    Needs at least {field.minLength} characters.
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {confirming && (
          <p className="mt-4 rounded-[8px] border border-[#F2C36B]/30 bg-[#F2C36B]/10 px-3 py-2 text-[12.5px] text-[#F2C36B]">
            Confirm submission? This freezes the snapshot and cannot be undone.
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3.5 text-[12.5px] text-[#9AA3B2] hover:bg-white/[0.05]"
          >
            Keep working
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleShip}
            className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-4 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : confirming ? "Confirm submit" : "Submit handoff"}
          </button>
        </div>
      </div>
    </div>
  );
}
