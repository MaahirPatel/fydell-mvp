"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import {
  newRequirementId,
  REQUIREMENT_LIMITS,
  unconfirmedSuggestions,
  type RequirementKind,
  type RoleRequirement,
} from "@/lib/hiring/requirements";

const KIND_LABEL: Record<RequirementKind, string> = { required: "Required", preferred: "Preferred" };

function Row({
  req,
  onChange,
  onRemove,
}: {
  req: RoleRequirement;
  onChange: (next: RoleRequirement) => void;
  onRemove: () => void;
}) {
  const pending = !req.confirmed;
  return (
    <li
      className={`grid gap-2 rounded-[8px] border p-3 ${
        pending ? "border-[var(--status-attention-ink)]/40 bg-[var(--status-attention-bg)]" : "border-[var(--border-subtle)] bg-[var(--surface-canvas)]"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="w-32 shrink-0">
          <Select
            aria-label="Required or preferred"
            value={req.kind}
            onChange={(e) => onChange({ ...req, kind: e.target.value === "preferred" ? "preferred" : "required" })}
            className="h-9"
          >
            <option value="required">Required</option>
            <option value="preferred">Preferred</option>
          </Select>
        </div>
        <Input
          aria-label="Requirement"
          value={req.text}
          maxLength={REQUIREMENT_LIMITS.maxText}
          onChange={(e) => onChange({ ...req, text: e.target.value })}
          className="h-9"
        />
        {!pending ? (
          <Button size="sm" variant="quiet" onClick={onRemove} aria-label={`Remove requirement: ${req.text}`}>
            Remove
          </Button>
        ) : null}
      </div>
      {pending ? (
        <div className="grid gap-2 pl-[8.5rem]">
          <p className="text-app-meta text-[var(--status-attention-ink)]">Suggested from the job description. Not saved until you review it.</p>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="primary" onClick={() => onChange({ ...req, confirmed: true })} disabled={req.text.trim().length < 3}>
              Confirm as {KIND_LABEL[req.kind].toLowerCase()}
            </Button>
            {req.kind === "required" ? (
              <Button size="sm" onClick={() => onChange({ ...req, kind: "preferred", confirmed: true })} disabled={req.text.trim().length < 3}>
                Make preferred
              </Button>
            ) : null}
            <Button size="sm" variant="quiet" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
      ) : req.source === "suggested" ? (
        <p className="pl-[8.5rem] text-app-meta text-[var(--text-tertiary)]">From the job description, confirmed by you.</p>
      ) : null}
    </li>
  );
}

/**
 * Required and preferred requirements. These define what reviewers look for.
 * Suggestions stay highlighted until each is confirmed, made preferred or removed.
 */
export default function RequirementsEditor({ value, onChange }: { value: RoleRequirement[]; onChange: (next: RoleRequirement[]) => void }) {
  const [draft, setDraft] = useState<Record<RequirementKind, string>>({ required: "", preferred: "" });
  const pending = unconfirmedSuggestions(value).length;
  const update = (id: string, next: RoleRequirement) => onChange(value.map((r) => (r.id === id ? next : r)));
  const remove = (id: string) => onChange(value.filter((r) => r.id !== id));
  const add = (kind: RequirementKind) => {
    const text = draft[kind].replace(/\s+/g, " ").trim();
    if (text.length < 3 || value.length >= REQUIREMENT_LIMITS.maxItems) return;
    onChange([...value, { id: newRequirementId(), text: text.slice(0, REQUIREMENT_LIMITS.maxText), kind, source: "employer", confirmed: true }]);
    setDraft((d) => ({ ...d, [kind]: "" }));
  };

  return (
    <div className="grid gap-5">
      {pending > 0 ? (
        <div role="status" className="rounded-[8px] border border-[var(--border-default)] bg-[var(--status-attention-bg)] px-3.5 py-2.5 text-app-meta text-[var(--status-attention-ink)]">
          {pending} suggested requirement{pending === 1 ? "" : "s"} to review. Suggestions are never used as screening criteria until you confirm them.
        </div>
      ) : null}
      {(["required", "preferred"] as const).map((kind) => {
        const items = value.filter((r) => r.kind === kind);
        return (
          <div key={kind} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-app-meta font-medium text-[var(--text-primary)]">{KIND_LABEL[kind]}</h3>
              <span className="text-app-meta text-[var(--text-tertiary)]">
                {items.length} of {REQUIREMENT_LIMITS.maxPerKind}
              </span>
            </div>
            {items.length > 0 ? (
              <ul className="grid gap-2">
                {items.map((r) => (
                  <Row key={r.id} req={r} onChange={(next) => update(r.id, next)} onRemove={() => remove(r.id)} />
                ))}
              </ul>
            ) : (
              <p className="text-app-meta text-[var(--text-tertiary)]">
                {kind === "required" ? "None yet. Reviews are organized around required capabilities, so add at least one before publishing." : "None. Optional."}
              </p>
            )}
            {items.length < REQUIREMENT_LIMITS.maxPerKind ? (
              <div className="flex items-center gap-2">
                <Input
                  aria-label={`New ${kind} requirement`}
                  value={draft[kind]}
                  maxLength={REQUIREMENT_LIMITS.maxText}
                  placeholder={kind === "required" ? "Designs retries and idempotency for calls to external services" : "Has operated a service with an on-call rotation"}
                  onChange={(e) => setDraft((d) => ({ ...d, [kind]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add(kind);
                    }
                  }}
                  className="h-9"
                />
                <Button size="sm" onClick={() => add(kind)} disabled={draft[kind].trim().length < 3}>
                  Add {kind}
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
