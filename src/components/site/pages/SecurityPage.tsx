import s from "../site.module.css";
import { ArrowLink, PageHero, Section } from "../primitives";
import { ControlsList } from "./TrustPage";
import { ContactLink } from "@/components/ui/ContactLink";

export default function SecurityPage() {
  return (
    <>
      <PageHero
        title="Security"
        lead="The controls below are implemented today. Fydell holds no third-party security certification, and does not imply one."
      />
      <Section tight>
        <ControlsList />
        <p className={s.body} style={{ marginTop: 40 }}>
          To report a vulnerability, email <ContactLink kind="security" />. We will confirm receipt and tell you what we
          are doing about it.
        </p>
        <div className={s.linkRow} style={{ marginBottom: 168 }}>
          <ArrowLink href="/trust">What Fydell records and claims</ArrowLink>
        </div>
      </Section>
    </>
  );
}
