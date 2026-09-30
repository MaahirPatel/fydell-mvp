import SiteShell from "@/components/site/SiteShell";
import ContactPage from "@/components/site/pages/ContactPage";

export const metadata = {
  title: "Contact",
  description:
    "Tell Fydell about the engineering role you are hiring for.",
};

export default function Page() {
  return (
    <SiteShell>
      <ContactPage />
    </SiteShell>
  );
}
