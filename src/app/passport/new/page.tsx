import { redirect } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
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
    <MarketingShell>
      <div className="mx-auto w-full max-w-[1100px] px-5 pb-16 pt-[104px] sm:px-8 sm:pt-[112px]">
        <div className="reveal max-w-[720px]">
          <p className="text-app-body font-medium text-[var(--text-secondary)]">Engineering Passport</p>
          <h1 className="display-serif mt-2 text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.02]">Show what your code can do.</h1>
          <p className="mt-4 text-[17px] leading-[1.6] text-[var(--text-secondary)]">
            Paste your GitHub profile. Fydell reads your chosen public repositories at a pinned commit and highlights what
            the code demonstrates, citing the exact lines. Try it without an account; sign up to save and share.
          </p>
        </div>
        <div className="mt-10">
          <PassportBuilder signedIn={false} />
        </div>
      </div>
    </MarketingShell>
  );
}
