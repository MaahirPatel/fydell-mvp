import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type AttentionItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  tone?: "info" | "warning";
};

const DOT_TONE: Record<NonNullable<AttentionItem["tone"]>, string> = {
  info: "bg-[#3B5BFF]",
  warning: "bg-[#F59E0B]",
};

/** Real blockers only — render nothing extra when the queue is empty. */
export default function AttentionQueue({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-white/[0.1] bg-white/[0.015] px-4 py-8 text-center">
        <p className="text-[13px] leading-relaxed text-white/45">
          Nothing needs your attention right now.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const dotClass = DOT_TONE[item.tone || "info"];
        const body = (
          <>
            <span className={"mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full " + dotClass} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-white">{item.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/50">{item.description}</p>
            </div>
            {item.href && item.actionLabel && (
              <span className="mt-[3px] flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#8FA3FF]">
                {item.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="flex items-start gap-3 rounded-[12px] border border-white/[0.08] bg-[#0E1118] px-4 py-3.5 transition-colors hover:border-white/20 hover:bg-[#111420]"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-[12px] border border-white/[0.08] bg-[#0E1118] px-4 py-3.5">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
