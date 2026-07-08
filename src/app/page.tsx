import LenisProvider from "@/components/layout/LenisProvider";
import AmbientBackground from "@/components/layout/AmbientBackground";
import SiteNav from "@/components/layout/SiteNav";
import SiteFooter from "@/components/layout/SiteFooter";
import ImmersiveHero from "@/components/hero/ImmersiveHero";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Briefcase, ShieldCheck, Scale, Gauge, type LucideIcon } from "lucide-react";

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: Briefcase,
    title: "Real work, real decisions",
    body: "Candidates solve realistic tasks and make the calls the role actually demands."
  },
  {
    icon: ShieldCheck,
    title: "Data you can trust",
    body: "Every result is role specific, validated, and scored the same way for each person."
  },
  {
    icon: Scale,
    title: "Fairer for everyone",
    body: "Structured scenarios give every candidate the same fair chance to show their ability."
  },
  {
    icon: Gauge,
    title: "Faster, smarter hiring",
    body: "Automatic scoring and clear summaries help your team decide with confidence, sooner."
  }
];

export default function HomePage() {
  return (
    <LenisProvider>
      <div data-site-build="homepage-rescue-v2" className="fydell-page relative min-h-screen overflow-x-hidden">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AmbientBackground />
        <SiteNav />
        <main id="main" className="relative z-10">
          <ImmersiveHero />

          <section id="product" className="relative py-20 lg:py-28">
            <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
              <Reveal className="max-w-[640px]">
                <h2 className="text-[clamp(2.2rem,3.4vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-white">
                  A better way to hire
                </h2>
                <p className="mt-4 max-w-[540px] text-[17px] leading-[1.6] text-[#9aa4b8]">
                  Traditional hiring leans on proxies. Fydell simulations show what people can
                  actually do, in scenarios that mirror the real role.
                </p>
              </Reveal>

              <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURE_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <StaggerItem key={card.title}>
                      <article className="group flex h-full flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6 transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.04]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-[#7c5cff]/14 text-[#c4b5fd]">
                          <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
                        </div>
                        <h3 className="mt-5 text-[16.5px] font-bold tracking-[-0.02em] text-white">
                          {card.title}
                        </h3>
                        <p className="mt-2.5 text-[14px] leading-[1.6] text-[#9aa4b8]">{card.body}</p>
                      </article>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </LenisProvider>
  );
}
