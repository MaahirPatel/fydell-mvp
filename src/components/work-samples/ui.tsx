"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, ChevronRight, Circle, Clock, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export type Tone = "good" | "bad" | "warn" | "neutral" | "busy" | "pending";

const TONE: Record<Tone, { icon: typeof Check; cls: string; spin?: boolean }> = {
  good: { icon: Check, cls: "text-[var(--status-positive-ink)]" },
  bad: { icon: X, cls: "text-[var(--fydell-risk)]" },
  warn: { icon: AlertTriangle, cls: "text-[var(--status-attention-ink)]" },
  neutral: { icon: Minus, cls: "text-[var(--text-tertiary)]" },
  busy: { icon: Loader2, cls: "text-[var(--text-secondary)]", spin: true },
  pending: { icon: Circle, cls: "text-[var(--text-tertiary)]" },
};

/** Status as readable text with a small icon. */
export function StatusText({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", t.cls, className)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", t.spin && "animate-spin")} strokeWidth={2.2} aria-hidden />
      <span>{children}</span>
    </span>
  );
}

export function StatusIcon({ tone, className }: { tone: Tone; className?: string }) {
  const t = TONE[tone];
  const Icon = t.icon;
  return <Icon className={cn("h-4 w-4 shrink-0", t.cls, t.spin && "animate-spin", className)} strokeWidth={2.2} aria-hidden />;
}

export { Clock };

/** A bordered message block. Tone changes the icon and tint, never a side rule. */
export function Banner({
  tone = "neutral",
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: "neutral" | "warn" | "bad" | "good";
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const bg =
    tone === "bad"
      ? "border-[color-mix(in_srgb,var(--fydell-risk)_28%,transparent)] bg-[color-mix(in_srgb,var(--fydell-risk)_6%,transparent)]"
      : tone === "warn"
        ? "border-[var(--status-attention-line)] bg-[var(--status-attention-bg)]"
        : tone === "good"
          ? "border-[var(--status-positive-line)] bg-[var(--status-positive-bg)]"
          : "border-[var(--border-default)] bg-[var(--surface-panel)]";
  const icon: Tone = tone === "bad" ? "bad" : tone === "warn" ? "warn" : tone === "good" ? "good" : "neutral";
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-[var(--radius-panel)] border px-3.5 py-3 text-[14px] leading-[1.5]", bg, className)}>
      {tone !== "neutral" ? <StatusIcon tone={icon} className="mt-[2px]" /> : null}
      <div className="min-w-0 flex-1 text-[var(--text-body)]">
        {title ? <p className="font-medium text-[var(--text-primary)]">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
        {action ? <div className="mt-2.5 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}

/** Progressive disclosure: a button that reveals a region. */
export function Disclosure({
  label,
  hint,
  defaultOpen,
  children,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-[6px] py-1 text-[14px] font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)]"
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} aria-hidden />
        {label}
        {hint ? <span className="font-normal text-[var(--text-tertiary)]">{hint}</span> : null}
      </button>
      <div id={id} hidden={!open} className="mt-2 pl-5">
        {open ? children : null}
      </div>
    </div>
  );
}

/** Editable list of short lines. Keeps empty rows while typing; callers trim on save. */
export function LineList({
  id,
  label,
  values,
  onChange,
  max = 10,
  placeholder,
  addLabel = "Add",
  maxLength = 300,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  max?: number;
  placeholder?: string;
  addLabel?: string;
  maxLength?: number;
}) {
  return (
    <div className="grid gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            id={i === 0 ? id : `${id}-${i}`}
            aria-label={`${label} ${i + 1}`}
            value={v}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <Button variant="quiet" icon size="md" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(values.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      ))}
      {values.length < max ? (
        <div>
          <Button variant="quiet" size="sm" onClick={() => onChange([...values, ""])} id={values.length === 0 ? id : undefined}>
            <Plus className="h-4 w-4" aria-hidden />
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r} s`;
  if (m < 60) return `${m} min ${r} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const noop = () => () => {};

/** Formats in the viewer's time zone after hydration; the server renders the date only. */
export function LocalTime({ iso }: { iso: string | null | undefined }) {
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  if (!iso) return null;
  return <time dateTime={iso}>{hydrated ? formatDate(iso) : iso.slice(0, 10)}</time>;
}
