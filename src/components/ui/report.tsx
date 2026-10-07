import { AlertTriangle, Check, Clock, Info, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/* Shared report primitives. One status per object header, attribution as a
   byline, figures without boxes, fine print in a details table. */

export type StatusKind = "success" | "pending" | "attention" | "failed" | "neutral";

const STATUS: Record<StatusKind, { cls: string; icon: LucideIcon | null }> = {
  success: { cls: "bg-[var(--badge-success-bg)] text-[var(--badge-success-ink)]", icon: Check },
  pending: { cls: "bg-[var(--badge-pending-bg)] text-[var(--badge-pending-ink)]", icon: Clock },
  attention: { cls: "bg-[var(--badge-attention-bg)] text-[var(--badge-attention-ink)]", icon: AlertTriangle },
  failed: { cls: "bg-[var(--badge-failed-bg)] text-[var(--badge-failed-ink)]", icon: X },
  neutral: { cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-ink)]", icon: null },
};

export function Status({ kind = "neutral", icon = true, children, className }: { kind?: StatusKind; icon?: boolean; children: React.ReactNode; className?: string }) {
  const s = STATUS[kind];
  const Icon = icon ? s.icon : null;
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-[5px] px-2 text-[13px] font-semibold leading-none", s.cls, className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Byline({ by = "you", at, title, className }: { by?: string; at?: string | null; title?: string; className?: string }) {
  return (
    <p className={cn("text-[13px] text-[var(--text-secondary)]", className)} title={title}>
      Written by <span className="font-medium text-[var(--text-primary)]">{by}</span>
      {at ? ` · ${at}` : ""}
    </p>
  );
}

export type Figure = { key: string; label: string; value: number; color?: string };

/** Up to four figures separated by dividers. Zeros are dropped by design. */
export function FigureRow({
  figures,
  active,
  onSelect,
  className,
}: {
  figures: Figure[];
  active?: string | null;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const shown = figures.filter((f) => f.value > 0).slice(0, 4);
  if (shown.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-y-3 divide-x divide-[var(--border-default)]", className)}>
      {shown.map((f, i) => {
        const body = (
          <>
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">{f.value}</span>
            <span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
              {f.color ? <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: f.color }} /> : null}
              {f.label}
            </span>
          </>
        );
        const pad = cn("flex flex-col", i === 0 ? "pr-4 sm:pr-6" : "px-4 sm:px-6");
        if (!onSelect) {
          return (
            <div key={f.key} className={pad}>
              {body}
            </div>
          );
        }
        const on = active === f.key;
        return (
          <div key={f.key} className={cn(i === 0 ? "pr-1 sm:pr-3" : "px-1 sm:px-3")}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(f.key)}
              className={cn(
                "flex flex-col rounded-[8px] px-2.5 py-2 text-left sm:px-3 transition-colors hover:bg-[var(--surface-hover)]",
                on && "bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]",
              )}
            >
              {body}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function DetailList({ rows, className }: { rows: Array<{ label: string; value: React.ReactNode }>; className?: string }) {
  return (
    <dl className={cn("divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]", className)}>
      {rows.map((r) => (
        <div key={r.label} className="grid min-h-[32px] grid-cols-[minmax(110px,180px)_minmax(0,1fr)] items-baseline gap-4 py-1.5">
          <dt className="text-[13px] text-[var(--text-tertiary)]">{r.label}</dt>
          <dd className="min-w-0 text-[14px] text-[var(--text-primary)]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const NOTICE: Record<"info" | "attention" | "error", { icon: LucideIcon; ink: string; rule: string }> = {
  info: { icon: Info, ink: "text-[var(--text-secondary)]", rule: "border-[var(--accent-line)]" },
  attention: { icon: AlertTriangle, ink: "text-[var(--badge-attention-ink)]", rule: "border-[#e9c27a]" },
  error: { icon: AlertTriangle, ink: "text-[var(--badge-failed-ink)]", rule: "border-[#ec9aa8]" },
};

export function Notice({ tone = "info", children, action, className }: { tone?: "info" | "attention" | "error"; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const n = NOTICE[tone];
  const Icon = n.icon;
  return (
    <div role={tone === "error" ? "alert" : undefined} className={cn("flex items-start gap-2 border-l-2 py-0.5 pl-3 text-[14px] leading-[1.5]", n.rule, className)}>
      <Icon className={cn("mt-[3px] h-4 w-4 shrink-0", n.ink)} aria-hidden />
      <p className="text-[var(--text-body)]">
        {children}
        {action ? <span className="ml-2">{action}</span> : null}
      </p>
    </div>
  );
}

export function SectionHeader({ title, description, actions, id, className }: { title: string; description?: string; actions?: React.ReactNode; id?: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[19px] font-semibold leading-[1.3] tracking-[-0.014em] text-[var(--text-primary)]">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function refLabel(path: string, line?: number | null) {
  return `${path.split("/").pop() ?? path}${line ? `:${line}` : ""}`;
}

/** Source reference: basename and line, full path on hover. */
export function SourceRef({ path, line, href, onClick, className }: { path: string; line?: number | null; href?: string; onClick?: () => void; className?: string }) {
  const cls = cn("font-mono text-[13px] text-[var(--accent-ink)] underline-offset-[3px] hover:underline", className);
  const label = refLabel(path, line);
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={path} className={cls}>
        {label}
      </button>
    );
  }
  if (href) {
    return (
      <a href={href} title={path} className={cls}>
        {label}
      </a>
    );
  }
  return (
    <span title={path} className={cn("font-mono text-[13px] text-[var(--text-secondary)]", className)}>
      {label}
    </span>
  );
}
