import { ReactNode, useEffect, useRef } from "react";

/* ============================================================================
   Shared desktop UI primitives (desktop/DESIGN_SYSTEM.md §4).
   Dialog, EmptyState, and provenance tags — the three inventory gaps closed
   here. All styling lives in styles.css; this file is behavior + markup.
   ========================================================================== */

/* ---------------- provenance --------------------------------------------------
   Teal = observed candidate work. Violet = simulation-generated content.
   Amber = needs attention. The label carries the meaning; color reinforces. */

export type ProvenanceKind = "observed" | "generated" | "attention";

const PROVENANCE_LABEL: Record<ProvenanceKind, string> = {
  observed: "Observed",
  generated: "Simulated",
  attention: "Needs attention",
};

export function ProvenanceTag({ kind }: { kind: ProvenanceKind }) {
  return <span className={`tag tag-${kind}`}>{PROVENANCE_LABEL[kind]}</span>;
}

/* ---------------- empty state -------------------------------------------------
   Centered line icon, section-role title, one explanatory sentence, one
   working action. An empty state with a dead button is worse than none —
   every action prop here must do something real. */

type EmptyIcon = "file" | "flask" | "chat" | "clock" | "inbox";

function EmptyGlyph({ icon }: { icon: EmptyIcon }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  switch (icon) {
    case "flask":
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6.3L4.7 18a2 2 0 0 0 1.8 3h11a2 2 0 0 0 1.8-3L14 9.3V3" />
          <path d="M7.5 14h9" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <path d="M22 12h-5l-2 3h-6l-2-3H2" />
          <path d="M5 5h14l3 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l3-7z" />
        </svg>
      );
    case "file":
    default:
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      );
  }
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: EmptyIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon" aria-hidden="true">
        <EmptyGlyph icon={icon} />
      </span>
      <div className="empty-title">{title}</div>
      <div className="empty-body">{body}</div>
      {actionLabel && onAction && (
        <button className="btn ghost" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ---------------- dialog -------------------------------------------------------
   Overlay scrim, centered panel, actions right-aligned with primary last.
   Esc and scrim click dismiss (callers that need an explicit choice simply
   don't pass onClose... they always can — destructive confirmations in this
   app still allow Esc; the explicit-choice requirement is satisfied by
   requiring a button click to confirm, never a single prior click).
   Focus moves into the dialog on open and returns to the trigger on close. */

export interface DialogAction {
  label: string;
  kind?: "primary" | "ghost" | "danger";
  onClick: () => void;
  disabled?: boolean;
  busyLabel?: string;
}

export function Dialog({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions: DialogAction[];
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      // Minimal focus trap: keep Tab inside the dialog.
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    // Focus the primary action (or the dialog itself) on open.
    const t = setTimeout(() => {
      const primary =
        dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
        dialogRef.current;
      primary?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      clearTimeout(t);
      previousFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <h2 className="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-footer">
          {actions.map((a, i) => (
            <button
              key={a.label}
              className={`btn ${a.kind === "ghost" ? "ghost" : a.kind === "danger" ? "danger" : ""}`}
              onClick={a.onClick}
              disabled={a.disabled}
              {...(i === actions.length - 1 ? { "data-autofocus": true } : {})}
            >
              {a.disabled && a.busyLabel ? a.busyLabel : a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
