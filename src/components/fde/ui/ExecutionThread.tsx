export type ThreadEvent = {
  id: string;
  label: string;
  detail?: string | null;
  timestamp: string;
};

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);

  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];

  let value = abs;
  let unit = "second";
  let divisor = 1;
  for (const [amount, name] of units) {
    if (value < amount) {
      unit = name;
      break;
    }
    value = Math.floor(value / amount);
    divisor *= amount;
    unit = name;
  }
  void divisor;

  const rounded = Math.max(1, Math.round(value));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return rtf.format(diffSeconds < 0 ? -rounded : rounded, unit as Intl.RelativeTimeFormatUnit);
}

/** Operational-only timeline of real events — no synthetic activity. */
export default function ExecutionThread({ events }: { events: ThreadEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-white/45">
        No activity yet. Events will appear here as the mission moves — invites accepted,
        submissions received, evidence generated.
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-white/[0.08] pl-5">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[25px] top-[3px] h-2.5 w-2.5 rounded-full border-2 border-[#0A0C11] bg-[#3B5BFF]" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-[13.5px] font-medium text-white">{event.label}</p>
            <time
              dateTime={event.timestamp}
              className="whitespace-nowrap text-[11.5px] text-white/35"
              title={new Date(event.timestamp).toLocaleString()}
            >
              {formatRelativeTime(event.timestamp)}
            </time>
          </div>
          {event.detail && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/50">{event.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
