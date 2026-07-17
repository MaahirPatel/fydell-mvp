import { relayColors } from "@/lib/fde/ui/tokens";

/**
 * Small authenticity mark for receipts/evidence tied to one real, frozen
 * session. Not a "verified candidate" claim — only that this record traces
 * back to a specific recorded session.
 */
export default function ReceiptSeal({
  label = "Session-verified",
  size = 30,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2" title="Traces back to one recorded, frozen session">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="14.5" stroke={relayColors.success} strokeOpacity={0.35} strokeWidth={1.5} />
        <circle cx="16" cy="16" r="10.5" stroke={relayColors.success} strokeOpacity={0.55} strokeWidth={1} />
        <path
          d="M11 16.2l3.2 3.2 6.8-7"
          stroke={relayColors.success}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[11px] font-medium uppercase tracking-[0.05em]" style={{ color: relayColors.success }}>
        {label}
      </span>
    </span>
  );
}
