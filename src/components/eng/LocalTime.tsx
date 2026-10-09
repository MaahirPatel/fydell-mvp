"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True once rendering on the client, so timezone-dependent text cannot mismatch the server render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Date and time as plain text, for places that only accept strings such as select options. */
export function localTimeText(iso: string, hydrated: boolean, withWeekday?: boolean): string {
  const date = new Date(iso);
  return hydrated
    ? date.toLocaleString(undefined, {
        weekday: withWeekday ? "short" : undefined,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
}

/** Renders in the viewer's timezone, with its label, once on the client. */
export function LocalTime({ iso, withWeekday }: { iso: string; withWeekday?: boolean }) {
  const hydrated = useHydrated();
  return <time dateTime={iso}>{localTimeText(iso, hydrated, withWeekday)}</time>;
}

/** The calendar date in the viewer's timezone once on the client; UTC before hydration. */
export function LocalDate({ iso }: { iso: string | null | undefined }) {
  const hydrated = useHydrated();
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return <time dateTime={iso}>{hydrated ? date.toLocaleDateString(undefined, opts) : date.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" })}</time>;
}
