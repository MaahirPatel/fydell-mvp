import { redirect } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import s from "@/components/site/site.module.css";
import PassportBuilder from "@/components/passport/PassportBuilder";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = {
  title: "Build your Engineering Passport",
  description: "Paste your GitHub profile and see what your public code demonstrates, with every finding linked to the exact lines.",
};
export const dynamic = "force-dynamic";

export default async function NewPassportPage() {
  if (await requireUser()) redirect("/app/candidate/profile");
  return (
    <SiteShell>
      <section className={s.hero} style={{ paddingBottom: 168 }}>
        <div className={s.heroWash} aria-hidden />
        <div className={s.container}>
          <div className={s.heroCopy}>
            <h1 className={`${s.display} ${s.displayPage}`} data-hero="" style={{ "--i": 0 } as React.CSSProperties}>
              Build your passport
            </h1>
            <p className={s.lead} data-hero="" style={{ "--i": 1 } as React.CSSProperties}>
              Paste your GitHub profile. Fydell reads the public repositories you choose at a pinned commit and links
              every finding to the exact lines. Try it without an account; sign up to save and share.
            </p>
          </div>
          <div
            className={s.card}
            style={{ marginTop: 56, padding: "clamp(20px, 3vw, 32px)", "--i": 2 } as React.CSSProperties}
            data-hero=""
          >
            <PassportBuilder signedIn={false} />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
