import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";
import { getReceiptIfPermitted } from "@/lib/fde/receipts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work receipt · Fydell" };

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export default async function SharedReceiptPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  let data: Awaited<ReturnType<typeof getReceiptIfPermitted>> | null = null;
  let error: string | null = null;
  try {
    data = await getReceiptIfPermitted(shareToken);
  } catch (err) {
    error = err instanceof Error ? err.message : "This link is invalid.";
  }

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[720px] bg-[#050609] px-5 py-10 text-[#F4F5F7]">
      <FydellBrand markSize={32} wordmarkSize={20} />

      {error || !data ? (
        <div className="mt-16 text-center">
          <h1 className="text-[22px]" style={{ fontWeight: 560 }}>
            {error || "This link is invalid."}
          </h1>
          <p className="mt-3 text-[14px] text-white/50">
            Ask the person who shared this with you for a fresh link.
          </p>
          <Link href="/" className="mt-8 inline-flex text-[13px] text-white/50 hover:text-white">
            ← Back to fydell.com
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
            Work receipt
          </p>
          <h1 className="mt-1 text-[26px] sm:text-[30px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
            {data.receipt.receipt_number}
          </h1>
          <p className="mt-2 text-[14px] text-white/55">
            {data.missionTitle ? `From mission: ${data.missionTitle}` : "Portable execution evidence"} ·
            Shared for {data.purpose.replace(/_/g, " ")}
          </p>

          {data.receipt.context_summary && (
            <section className="mt-8 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Context</h2>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/75">
                {data.receipt.context_summary}
              </p>
            </section>
          )}

          <section className="mt-4 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
            <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
              Evidence findings
            </h2>
            {data.findings.length === 0 ? (
              <p className="mt-3 text-[13.5px] text-white/50">No findings were recorded for this session.</p>
            ) : (
              <ul className="mt-3 space-y-4">
                {data.findings.map((f, i) => (
                  <li key={i} className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[13.5px] font-semibold text-white capitalize">
                        {String(f.dimension).replace(/_/g, " ")}
                      </h3>
                      <span className="text-[11px] text-white/40">
                        {CONFIDENCE_LABEL[String(f.confidence)] || f.confidence}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{f.observation}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/55">{f.interpretation}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.receipt.limitations && (
            <section className="mt-4 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/60 p-5">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Limitations</h2>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/55">
                {data.receipt.limitations}
              </p>
            </section>
          )}

          <p className="mt-8 text-[12px] text-white/35">
            This receipt reflects evidence from one simulated deployment session — not a verified
            employment record.
          </p>
        </>
      )}
    </main>
  );
}
