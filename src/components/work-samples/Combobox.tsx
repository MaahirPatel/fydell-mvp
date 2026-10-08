"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export type ComboOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
  /** Shown but not selectable. Choosing it selects the alternative, when there is one. */
  unavailable?: { reason: string; alternative?: { value: string; label: string } };
};

type Base = {
  id: string;
  options: ComboOption[];
  /** Adds a filter field. Use for long lists. */
  searchable?: boolean;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
};
type SingleProps = Base & { multiple?: false; value: string; onChange: (value: string) => void };
type MultiProps = Base & { multiple: true; value: string[]; onChange: (value: string[]) => void };

export function unavailableText(u: NonNullable<ComboOption["unavailable"]>): string {
  const reason = u.reason.trim().replace(/\.$/, "");
  return `Not available: ${reason}.${u.alternative ? ` Use ${u.alternative.label}.` : ""}`;
}

/**
 * A select-only combobox (WAI-ARIA APG): a button opens a listbox; the active
 * option is tracked with aria-activedescendant so focus stays on the filter
 * field or the list. Escape closes, typing filters (or jumps, when not searchable).
 */
export function Combobox(props: SingleProps | MultiProps) {
  const { id, options, searchable, placeholder = "Choose", invalid, describedBy, disabled, className } = props;
  const listId = `${id}-listbox`;
  const optionId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const selected = props.multiple === true ? (props as MultiProps).value : [(props as SingleProps).value];
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.value === "other" ||
        [o.label, o.description ?? "", o.group ?? "", o.unavailable?.reason ?? ""].some((t) => t.toLowerCase().includes(q)),
    );
  }, [options, query]);

  const triggerText = (() => {
    const labels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
    if (labels.length === 0) return null;
    return labels.join(", ");
  })();

  useEffect(() => {
    if (!open) return;
    (searchable ? inputRef.current : listRef.current)?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${optionId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, optionId]);

  function openList() {
    if (disabled) return;
    const idx = options.findIndex((o) => selected.includes(o.value));
    setQuery("");
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function close(focusTrigger: boolean) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(option: ComboOption | undefined) {
    if (!option) return;
    const value = option.unavailable ? option.unavailable.alternative?.value : option.value;
    if (!value) return;
    if (props.multiple === true) {
      const multi = props as MultiProps;
      const has = multi.value.includes(value);
      multi.onChange(option.unavailable ? (has ? multi.value : [...multi.value, value]) : has ? multi.value.filter((v) => v !== value) : [...multi.value, value]);
    } else {
      (props as SingleProps).onChange(value);
      close(true);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = visible.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(last, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home" && !searchable) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && !searchable) {
      e.preventDefault();
      setActive(last);
    } else if (e.key === "Enter" || (e.key === " " && !searchable)) {
      e.preventDefault();
      choose(visible[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = e.timeStamp;
      const text = (now - typeahead.current.at < 700 ? typeahead.current.text : "") + e.key.toLowerCase();
      typeahead.current = { text, at: now };
      const idx = visible.findIndex((o) => o.label.toLowerCase().startsWith(text));
      if (idx >= 0) setActive(idx);
    }
  }

  const activeId = visible.length ? `${optionId}-${Math.min(active, visible.length - 1)}` : undefined;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
        className={cn(
          "platform-select flex items-center justify-between gap-2 text-left",
          invalid && "border-[var(--fydell-risk)]",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className={cn("min-w-0 truncate", triggerText ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>
          {triggerText ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[0_12px_32px_rgba(16,18,24,0.14)]">
          {searchable ? (
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
              <input
                ref={inputRef}
                role="combobox"
                aria-label="Filter options"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeId}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Type to filter"
                className="h-10 w-full bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          ) : null}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-multiselectable={props.multiple || undefined}
            aria-activedescendant={searchable ? undefined : activeId}
            onKeyDown={searchable ? undefined : onKeyDown}
            className="max-h-[300px] overflow-y-auto py-1 outline-none"
          >
            {visible.length === 0 ? (
              <li role="presentation" className="px-3 py-2 text-[13px] text-[var(--text-tertiary)]">
                No matches
              </li>
            ) : null}
            {visible.map((o, i) => {
              const isSelected = selected.includes(o.value);
              const showGroup = o.group && o.group !== visible[i - 1]?.group;
              return (
                <OptionRow
                  key={`${o.group ?? ""}:${o.value}:${o.label}`}
                  id={`${optionId}-${i}`}
                  option={o}
                  group={showGroup ? o.group : undefined}
                  active={i === active}
                  selected={isSelected}
                  onPick={() => choose(o)}
                  onHover={() => setActive(i)}
                />
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function OptionRow({
  id,
  option,
  group,
  active,
  selected,
  onPick,
  onHover,
}: {
  id: string;
  option: ComboOption;
  group?: string;
  active: boolean;
  selected: boolean;
  onPick: () => void;
  onHover: () => void;
}) {
  const u = option.unavailable;
  return (
    <>
      {group ? (
        <li role="presentation" className="px-3 pb-1 pt-2.5 text-[12px] font-medium text-[var(--text-tertiary)]">
          {group}
        </li>
      ) : null}
      <li
        id={id}
        role="option"
        aria-selected={selected}
        aria-disabled={u && !u.alternative ? true : undefined}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onPick}
        onMouseMove={onHover}
        className={cn(
          "mx-1 flex cursor-pointer items-start gap-2 rounded-[6px] px-2 py-1.5",
          active && "bg-[var(--surface-hover)]",
          u && !u.alternative && "cursor-not-allowed",
        )}
      >
        <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
          {selected ? <Check className="h-3.5 w-3.5 text-[var(--text-primary)]" strokeWidth={2.4} aria-hidden /> : null}
        </span>
        <span className="min-w-0">
          <span className={cn("block text-[14px]", u ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]")}>{option.label}</span>
          {u ? (
            <span className="block text-[12.5px] leading-[1.45] text-[var(--text-secondary)]">{unavailableText(u)}</span>
          ) : option.description ? (
            <span className="block text-[12.5px] leading-[1.45] text-[var(--text-secondary)]">{option.description}</span>
          ) : null}
        </span>
      </li>
    </>
  );
}

export default Combobox;
