"use client";

/**
 * Brand atmosphere: blue + violet + restrained red. No white washes.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#07080B]" />
      <div
        className="absolute left-[-8%] top-[-6%] h-[560px] w-[680px]"
        style={{
          background:
            "radial-gradient(circle, rgba(86,98,255,0.16), transparent 68%)",
        }}
      />
      <div
        className="absolute right-[-10%] top-[2%] h-[520px] w-[600px]"
        style={{
          background:
            "radial-gradient(circle, rgba(134,87,244,0.14), transparent 70%)",
        }}
      />
      <div
        className="absolute left-[28%] top-[18%] h-[420px] w-[520px]"
        style={{
          background:
            "radial-gradient(circle, rgba(242,107,130,0.10), transparent 68%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[10%] h-[380px] w-[480px]"
        style={{
          background:
            "radial-gradient(circle, rgba(86,98,255,0.08), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(7,8,11,0.55) 100%)",
        }}
      />
    </div>
  );
}
