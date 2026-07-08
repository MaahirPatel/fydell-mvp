import Logo from "@/components/Logo";
import { CONFIRMATION_COPY } from "@/lib/scenario";

export const dynamic = "force-dynamic";

export default function CompletePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-lg animate-fade-up text-center">
        <Logo size={28} className="mb-8 justify-center" />
        <div className="rounded-2xl border border-line bg-white p-10 shadow-[var(--shadow-card)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-teal/15">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12.5l4.2 4.2L19 7"
                stroke="#14B8A6"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl">Simulation complete</h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-2">{CONFIRMATION_COPY}</p>
        </div>
      </div>
    </main>
  );
}
