const LOGOS = [
  { name: "J.P. Morgan", className: "font-serif tracking-tight" },
  { name: "Goldman Sachs", className: "font-serif tracking-tight" },
  { name: "McKinsey & Company", className: "font-serif tracking-tight" },
  { name: "ramp", className: "lowercase tracking-tight" },
  { name: "Brex", className: "tracking-tight" },
  { name: "Vercel", className: "tracking-tight" },
  { name: "Notion", className: "tracking-tight" }
];

export default function TrustedBy({ heading = "Trusted by leading organizations" }: { heading?: string }) {
  return (
    <section className="relative z-10 border-y border-white/[0.07] bg-black/[0.14]">
      <div className="mx-auto max-w-[1536px] px-6 py-10 lg:px-12">
        <div className="flex flex-col items-center gap-7 lg:flex-row lg:gap-10">
          <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            {heading}
          </p>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-x-9 gap-y-5 lg:justify-between">
            {LOGOS.map((logo) => (
              <span
                key={logo.name}
                className={`text-[17px] font-semibold text-white/55 transition-colors duration-300 hover:text-white/80 ${logo.className}`}
              >
                {logo.name}
              </span>
            ))}
            <span className="text-[14px] font-medium text-white/30">and more</span>
          </div>
        </div>
      </div>
    </section>
  );
}
