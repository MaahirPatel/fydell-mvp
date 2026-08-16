import { cn } from "@/lib/cn";

/**
 * Dense operational table. Rows are separated by hairlines rather than being
 * individually boxed, so a list of twenty candidates reads as one object.
 */
export function Table({
  className,
  children,
  ...rest
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full min-w-[640px] border-collapse text-left", className)}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-[var(--border-subtle)]">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  align = "left",
  ...rest
}: Omit<React.ThHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-app-meta font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)]",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border-subtle)] transition-colors duration-[var(--motion-fast)] last:border-b-0 hover:bg-[var(--surface-hover)]",
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  align = "left",
  ...rest
}: Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align"> & {
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-app-body text-[var(--text-secondary)] align-middle",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

/** Emphasised first cell. The thing the row is actually about. */
export function TDPrimary({
  children,
  className,
  ...rest
}: Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align">) {
  return (
    <TD className={cn("font-medium text-[var(--text-primary)]", className)} {...rest}>
      {children}
    </TD>
  );
}
