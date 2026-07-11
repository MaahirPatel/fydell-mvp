"use client";

/**
 * Soft page atmosphere — Linear-style spotlight placement with Fydell blue + red.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#07080B]" />
      {/* Upper soft wash */}
      <div
        className="absolute left-1/2 top-[-8%] h-[55vh] w-[90vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(86,98,255,0.09), transparent 72%)",
        }}
      />
      <div
        className="absolute left-[20%] top-[12%] h-[40vh] w-[50vw]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(242,107,130,0.07), transparent 70%)",
        }}
      />
      <div
        className="absolute right-[8%] top-[20%] h-[36vh] w-[42vw]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(134,87,244,0.06), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(7,8,11,0.5) 100%)",
        }}
      />
    </div>
  );
}
