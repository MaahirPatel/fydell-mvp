import FydellMark from "@/components/brand/FydellMark";

export default function ResourcesBrandPanel() {
  return (
    <div className="hero-preview-frame marketing-perspective relative ml-auto aspect-[4/3] w-full max-w-[620px] origin-center">
      {/* Atmospheric dim-room backdrop */}
      <div
        className="absolute inset-0 z-[4]"
        style={{
          background:
            "radial-gradient(120% 90% at 70% 12%, rgba(124,92,255,0.28), transparent 58%), radial-gradient(100% 80% at 18% 88%, rgba(38,99,235,0.22), transparent 60%), linear-gradient(180deg, #060a18 0%, #03050d 100%)"
        }}
        aria-hidden
      />

      {/* Soft horizon line, suggesting a dim window */}
      <div
        className="absolute left-0 right-0 top-[42%] z-[4] h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(124,92,255,0.35), transparent)"
        }}
        aria-hidden
      />

      {/* Glowing interlocking-rings motif */}
      <div className="absolute inset-0 z-[5] flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div
            className="pointer-events-none absolute h-[280px] w-[280px] rounded-full blur-[60px]"
            style={{
              background:
                "radial-gradient(circle, rgba(124,92,255,0.55), rgba(91,140,255,0.18) 55%, transparent 72%)"
            }}
            aria-hidden
          />
          <svg
            viewBox="0 0 220 140"
            className="relative h-[150px] w-[240px] float-a"
            aria-hidden
          >
            <defs>
              <linearGradient id="ringA" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="55%" stopColor="#5b8cff" />
                <stop offset="100%" stopColor="#7c5cff" />
              </linearGradient>
              <linearGradient id="ringB" x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9b5cff" />
                <stop offset="60%" stopColor="#7c5cff" />
                <stop offset="100%" stopColor="#5b8cff" />
              </linearGradient>
            </defs>
            <circle
              cx="88"
              cy="70"
              r="46"
              fill="none"
              stroke="url(#ringA)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle
              cx="132"
              cy="70"
              r="46"
              fill="none"
              stroke="url(#ringB)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>

          <span className="absolute flex items-center justify-center">
            <FydellMark width={120} />
          </span>
        </div>
      </div>

      {/* Faint reflection at base */}
      <div
        className="absolute inset-x-0 bottom-0 z-[5] h-1/3"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(3,5,13,0.55))"
        }}
        aria-hidden
      />
    </div>
  );
}
