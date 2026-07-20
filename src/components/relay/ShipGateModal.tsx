"use client";

import { useState } from "react";

export type ShipFields = { whatBuilt: string; verification: string; limitations: string };

const MIN_GATE_LENGTH = 40;
const MIN_WHAT_BUILT_LENGTH = 10;

const FIELDS: {
  key: keyof ShipFields;
  label: string;
  helper: string;
  placeholder: string;
  minLength: number;
}[] = [
  {
    key: "whatBuilt",
    label: "What you built",
    helper: "Plain language — imagine explaining it to the client, not a reviewer.",
    placeholder: "In one or two sentences, what did you ship?",
    minLength: MIN_WHAT_BUILT_LENGTH,
  },
  {
    key: "verification",
    label: "How you know it works",
    helper: "What did you actually run, and what did it show?",
    placeholder: "e.g. Ran `test` and `evals` — golden-set accuracy is 0.91, no sensitive action auto-executes.",
    minLength: MIN_GATE_LENGTH,
  },
  {
    key: "limitations",
    label: "What you're not sure about",
    helper: "Residual risk, untested paths, or scope you didn't get to. Vague or overclaiming reads as a signal too.",
    placeholder: "e.g. Haven't tested the model-assisted branch under rate-limiting; schema drift is untested.",
    minLength: MIN_GATE_LENGTH,
  },
];

export default function ShipGateModal({
  open,
  initial,
  submitting,
  onClose,
  onShip,
}: {
  open: boolean;
  initial: ShipFields;
  submitting: boolean;
  onClose: () => void;
  onShip: (fields: ShipFields) => void;
}) {
  const [fields, setFields] = useState<ShipFields>(initial);
  const [touched, setTouched] = useState(false);

  if (!open) return null;

  const errors = FIELDS.filter((f) => fields[f.key].trim().length < f.minLength);
  const canShip = errors.length === 0;

  function handleShip() {
    setTouched(true);
    if (!canShip || submitting) return;
    onShip({
      whatBuilt: fields.whatBuilt.trim(),
      verification: fields.verification.trim(),
      limitations: fields.limitations.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] border border-white/10 bg-[#0A0C11] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Before you ship</p>
        <h2 className="mt-1 text-[19px] font-medium text-white">Ready to ship?</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">
          This is what the reviewer reads first, in your own words. Once you ship, your workspace files freeze for
          evidence review — you won&apos;t be able to edit them afterward.
        </p>

        <div className="mt-5 space-y-4">
          {FIELDS.map((field) => {
            const value = fields[field.key];
            const tooShort = touched && value.trim().length < field.minLength;
            return (
              <label key={field.key} className="block">
                <span className="flex items-baseline justify-between">
                  <span className="text-[12px] font-medium text-white/85">{field.label}</span>
                  <span className={`text-[10.5px] ${tooShort ? "text-[#fda4b0]" : "text-white/30"}`}>
                    {value.trim().length}
                    {field.minLength > MIN_WHAT_BUILT_LENGTH ? ` / ${field.minLength} min` : ""}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/40">{field.helper}</span>
                <textarea
                  value={value}
                  onChange={(e) => setFields((f) => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className={`mt-1.5 w-full resize-none rounded-[8px] border bg-black/30 px-3 py-2.5 text-[13px] leading-relaxed text-white/85 placeholder:text-white/25 ${
                    tooShort ? "border-[#F26B82]/50" : "border-white/10"
                  }`}
                />
                {tooShort && (
                  <span className="mt-1 block text-[11px] text-[#fda4b0]">
                    Needs at least {field.minLength} characters — this is read as evidence, be specific.
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3.5 text-[12.5px] text-white/70 hover:bg-white/[0.05]"
          >
            Keep working
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleShip}
            className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-4 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {submitting ? "Shipping…" : "Ship now"}
          </button>
        </div>
      </div>
    </div>
  );
}
