import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";

export const metadata = {
  title: "Network · Fydell",
  description: "Public FDE network browsing isn't open yet — here's what's live today and what's next.",
};

export default function NetworkPage() {
  return (
    <MarketingShell>
      <PageHero
        title="The network isn't open yet."
        description="We're not going to show you a browsable list of candidates before it's real. Here's what's live today instead."
        narrow
      />

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal className="max-w-[640px]">
            <h2 className="section-heading flat-type">What exists right now.</h2>
            <p className="section-desc mt-5">
              Missions are invitation-only. An employer invites a specific FDE, that FDE runs Project
              Relay, and the resulting work receipt is theirs to control and share. There's no public
              directory of candidates to browse — that would mean showing you people before there's
              honest evidence behind them.
            </p>
          </Reveal>

          <Reveal delay={0.06} className="mt-10 max-w-[640px]">
            <h2 className="section-heading flat-type">What's next.</h2>
            <p className="section-desc mt-5">
              As more missions complete and more FDEs choose to make their receipts discoverable,
              we'll open a real network view — built from actual evidence, not seeded profiles.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center gap-5">
            <ButtonLink href="/signup">Sign up</ButtonLink>
            <TextLink href="/login">Log in</TextLink>
          </Reveal>
        </Container>
      </section>
    </MarketingShell>
  );
}
