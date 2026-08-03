/**
 * Soft mineral-paper atmosphere for public marketing pages.
 * No dark navy washes, purple glow, or cinematic vignette.
 */
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#F4F3EF]" />
      <div
        className="absolute left-1/2 top-[-12%] h-[50vh] w-[85vw] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(49, 87, 213, 0.07), transparent 72%)",
        }}
      />
      <div
        className="absolute right-[-5%] top-[30%] h-[40vh] w-[45vw]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(49, 87, 213, 0.04), transparent 70%)",
        }}
      />
    </div>
  );
}
