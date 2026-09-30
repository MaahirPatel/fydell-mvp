import s from "../site.module.css";
import { Container } from "../primitives";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import { ContactLink } from "@/components/ui/ContactLink";

export default function ContactPage() {
  return (
    <section className={s.hero} style={{ paddingBottom: 168 }}>
      <div className={s.heroWash} aria-hidden />
      <Container>
        <div className={s.grid2} style={{ gap: 64, alignItems: "start" }}>
          <div className={s.heroCopy}>
            <h1 className={`${s.display} ${s.displayPage}`} data-hero="" style={{ "--i": 0 } as React.CSSProperties}>
              Tell us about the role
            </h1>
            <p className={s.lead} data-hero="" style={{ "--i": 1 } as React.CSSProperties}>
              Share the stack, the level and the work the engineer will own. We will reply with the incident that fits
              and how reviewing will run.
            </p>
            <p className={s.body} data-hero="" style={{ "--i": 2 } as React.CSSProperties}>
              Prefer email? Write to <ContactLink />.
            </p>
          </div>
          <div className={s.card} data-hero="" style={{ "--i": 2 } as React.CSSProperties}>
            <PilotRequestForm />
          </div>
        </div>
      </Container>
    </section>
  );
}
