/**
 * Elapsed-time formatting for operational surfaces.
 *
 * "Time in state" is the number a hiring team acts on: an invitation that has
 * sat unopened for three days is a different problem from one sent an hour ago.
 * Both readings come from the same instant, so the caller passes `now` in and
 * every row on a page agrees.
 *
 * These are computed on the server and rendered as text. Formatting relative
 * time during hydration makes the client disagree with the server about the
 * current instant, which React reports as a mismatch.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * A compact duration for dense table cells: `4m`, `3h`, `6d`, `2w`.
 *
 * Deliberately coarse. A queue reader needs the order of magnitude, and
 * `6d 4h 12m` costs more width than the extra precision is worth.
 */
export function formatElapsed(iso: string | null | undefined, now: number): string {
  if (!iso) return "-";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "-";

  const delta = now - then;
  if (delta < MINUTE) return "now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  if (delta < WEEK) return `${Math.floor(delta / DAY)}d`;
  return `${Math.floor(delta / WEEK)}w`;
}

/**
 * The same duration written out, for a `title` attribute or a screen reader,
 * where the compact form is ambiguous.
 */
export function describeElapsed(iso: string | null | undefined, now: number): string {
  if (!iso) return "No recorded time";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "No recorded time";

  const delta = now - then;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;

  if (delta < MINUTE) return "Less than a minute ago";
  if (delta < HOUR) return plural(Math.floor(delta / MINUTE), "minute");
  if (delta < DAY) return plural(Math.floor(delta / HOUR), "hour");
  if (delta < WEEK) return plural(Math.floor(delta / DAY), "day");
  return plural(Math.floor(delta / WEEK), "week");
}

/** Hours between an instant and now, for threshold rules. Negative if future. */
export function hoursSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return (now - then) / HOUR;
}

/** Hours until an instant. Negative once it has passed. */
export function hoursUntil(iso: string | null | undefined, now: number): number | null {
  const since = hoursSince(iso, now);
  return since === null ? null : -since;
}
