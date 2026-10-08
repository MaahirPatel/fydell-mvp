import { cn } from "@/lib/cn";

/**
 * A list at issue-tracker density: 13 to 14px text, hairline separators, no
 * zebra and no boxed rows. Same shape as the shared `Table`, so a page can move
 * between them without restructuring its markup.
 */
export function Table({
  className,
  children,
  ...rest
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
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
        "h-8 px-4 text-[12px] font-medium text-[var(--text-tertiary)]",
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
        "px-4 py-2 align-middle text-[13px] text-[var(--text-secondary)]",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

/** The cell the row is about. */
export function TDPrimary({
  children,
  className,
  ...rest
}: Omit<React.TdHTMLAttributes<HTMLTableCellElement>, "align">) {
  return (
    <td
      className={cn(
        "px-4 py-2 align-middle text-[14px] font-medium text-[var(--text-primary)]",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
