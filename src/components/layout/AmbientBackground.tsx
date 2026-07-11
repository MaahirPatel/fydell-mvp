"use client";

/**
 * Restrained ambient depth for marketing pages — subtle brand wash only.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--page-bg)]" />
      <div
        className="absolute left-[8%] top-[-4%] h-[520px] w-[640px] rounded-full opacity-90"
        style={{
          background:
            "radial-gradient(circle, rgba(86,98,255,0.09), transparent 68%)",
        }}
      />
      <div
        className="absolute right-[-6%] top-[8%] h-[480px] w-[520px] rounded-full opacity-80"
        style={{
          background:
            "radial-gradient(circle, rgba(134,87,244,0.06), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.22) 100%)",
        }}
      />
    </div>
  );
}
