import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import PaintedStage from "@/components/marketing/site/PaintedStage";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import SimulationHero from "@/components/marketing/site/SimulationHero";
import { AppleIcon, WindowsIcon } from "@/components/marketing/site/OsIcons";
import { CenteredHero, ShowcaseSection, Tiles } from "@/components/marketing/site/Home";
import { SiteFaq } from "@/components/marketing/site/Sections";
import { microsoftStoreUrl } from "@/lib/desktop/store";

export const metadata = {
  title: "Download the desktop app",
  description: "The Fydell desktop app for Windows, from the Microsoft Store. Take simulations you are invited to in their own app, with no security warning.",
  alternates: { canonical: "/download" },
};

const WINDOWS_STEPS = [
  "Select Get it from Microsoft Store on this page. The Microsoft Store opens on Fydell.",
  "Select Get. The app is free and installs in under a minute, with no security warning.",
  "Open Fydell from the Start menu.",
  "Select Sign in. Your browser opens fydell.com: log in with the email address your invitation was sent to, and the app signs you in. It remembers you after that.",
] as const;

const TAKE = [
  { title: "Open the inbox", body: "Invitations sent to your email appear under Inbox in the app's sidebar, with a count beside it." },
  { title: "Accept the invitation", body: "Read the brief and accept. The task stays on your account from then on, on your home." },
  { title: "Do the work", body: "Simulations open in the app's own workspace. Engineering tasks create a project folder in Documents\\Fydell that you open in VS Code or Cursor." },
  { title: "Submit and see the report", body: "Submit from the app. Once the hiring team releases it, your report opens in the app." },
] as const;

const SAVES = [
  { title: "Work in a simulation", body: "Synced to Fydell as you go. If your connection drops, it is kept on your computer and sent when you are back online." },
  { title: "Engineering project files", body: "Kept in Documents\\Fydell on your computer, as safe as your own files. The app packages and uploads them when you submit." },
  { title: "Written answers", body: "Saved to Fydell with a copy on your computer, so closing the app never loses them." },
  { title: "The timer", body: "Runs on Fydell's server. Closing the app or restarting your computer never restarts it." },
] as const;

function StoreAction({ url }: { url: string | null }) {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="l-btn l-btn-lg l-btn-solid">
        <WindowsIcon size={16} />
        Get it from Microsoft Store
      </a>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <p role="status" className="max-w-[52ch] text-center text-[15px] leading-[1.55] text-[var(--text-secondary)]">
        The desktop app is in Microsoft Store review. Until it is listed, you can take the simulations you are invited to in your browser.
      </p>
      <Link href="/login?next=%2Fapp%2Fdesk" className="l-btn l-btn-lg l-btn-solid">
        Log in to Fydell
      </Link>
    </div>
  );
}

export default function DownloadPage() {
  const storeUrl = microsoftStoreUrl();

  return (
    <MarketingShell>
      <CenteredHero
        title="Get the Fydell desktop app"
        lead="A separate Windows app for taking Fydell simulations: your inbox, tasks, reports and profile. It installs from the Microsoft Store, so Windows shows no security warning, and the Store keeps it up to date."
        actions={<StoreAction url={storeUrl} />}
      />

      <ShowcaseSection id="install" title="Install in a minute." aside="Free, from the Microsoft Store.">
        <div className="grid gap-4 md:grid-cols-2">
          <section
            aria-labelledby="install-windows"
            className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 shadow-[0_1px_2px_rgba(17,18,20,0.04)]"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[var(--surface-panel)] text-[var(--text-primary)]">
                <WindowsIcon size={18} />
              </span>
              <div>
                <h3 id="install-windows" className="text-[17px] font-semibold tracking-[-0.012em] text-[var(--text-primary)]">
                  Windows
                </h3>
                <p className="text-[13.5px] text-[var(--text-tertiary)]">Windows 10 or 11</p>
              </div>
            </div>
            <ol className="mt-5 space-y-3">
              {WINDOWS_STEPS.map((step, i) => (
                <li key={step} className="flex gap-3 text-[15px] leading-[1.55] text-[var(--text-body)]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-panel)] text-[12.5px] font-semibold tabular-nums text-[var(--text-secondary)]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
          <section
            aria-labelledby="install-mac"
            className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 shadow-[0_1px_2px_rgba(17,18,20,0.04)]"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[var(--surface-panel)] text-[var(--text-primary)]">
                <AppleIcon size={18} />
              </span>
              <div>
                <h3 id="install-mac" className="text-[17px] font-semibold tracking-[-0.012em] text-[var(--text-primary)]">
                  Mac
                </h3>
                <p className="text-[13.5px] text-[var(--text-tertiary)]">In your browser for now</p>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-[1.6] text-[var(--text-body)]">
              The desktop app is Windows only for now. On a Mac, log in at fydell.com with the email address your invitation was sent to. Your home has the same inbox, tasks, reports and profile, and your progress saves the same way.
            </p>
            <Link
              href="/login?next=%2Fapp%2Fdesk"
              className="mt-4 inline-block text-[15px] font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4"
            >
              Log in to Fydell
            </Link>
          </section>
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="take" title="Take a simulation in the app." aside="From invitation to report, in one app.">
        <ol className="grid gap-4 md:grid-cols-4">
          {TAKE.map((step, i) => (
            <li key={step.title} className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-panel)] text-[12.5px] font-semibold tabular-nums text-[var(--text-secondary)]">{i + 1}</span>
              <h3 className="mt-3 text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-[1.55] text-[var(--text-body)]">{step.body}</p>
            </li>
          ))}
        </ol>
      </ShowcaseSection>

      <ShowcaseSection id="saves" title="Your progress is saved." aside="What is kept, and where." after={<Tiles items={[...SAVES]} />}>
        <p className="max-w-[68ch] text-[15.5px] leading-[1.65] text-[var(--text-body)]">
          Closing the app loses nothing. Open it again from the Start menu and your tasks are on your home, where you left them.
        </p>
      </ShowcaseSection>

      <ShowcaseSection id="app" title="Its own app, not a browser tab." aside="Inbox, tasks, reports and your profile.">
        <PaintedStage painting="field">
          <ProductFrame size="hero" chrome="none" title="Fydell · Simulation" label="The Fydell desktop app with a simulation open: the incident, its activity and the team thread.">
            <SimulationHero />
          </ProductFrame>
        </PaintedStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="details"
        title="What the app does on your computer."
        aside="Very little, on purpose."
        after={
          <Tiles
            items={[
              { title: "Checked and signed by Microsoft", body: "The Store reviews the app and signs it, which is why Windows installs it without a warning." },
              { title: "Nothing runs in the background", body: "Fydell records activity only inside an open simulation, and tells you what it records before you start." },
              { title: "Updates from the Store", body: "New versions arrive through the Microsoft Store, like your other apps. The app never replaces itself." },
            ]}
          />
        }
      >
        <p className="max-w-[68ch] text-[15.5px] leading-[1.65] text-[var(--text-body)]">
          The app signs in through your browser, keeps your sign-in in Windows Credential Manager rather than a plain file, and only reads and writes the project folders it creates for your tasks. It runs a task&apos;s tests only when you select Run tests, inside that task&apos;s folder, and never opens your other files.
        </p>
      </ShowcaseSection>

      <SiteFaq
        items={[
          { q: "Is the app free?", a: "Yes. It is free to download from the Microsoft Store and free to use." },
          { q: "Why the Microsoft Store?", a: "Apps from the Store are reviewed and signed by Microsoft, so Windows trusts them and shows no security warning when you install." },
          { q: "Which email should I sign in with?", a: "The one your invitation was sent to. Invitations belong to that email address, so they only appear in the inbox of the account that uses it." },
          { q: "How do I uninstall it?", a: "Right-click Fydell in the Start menu and choose Uninstall. Project folders in Documents\\Fydell stay until you delete them." },
          { q: "Where do I report a problem?", a: "Use Contact on this site, or the Support link inside a simulation." },
        ]}
      />

      <section className="pb-32 pt-24 text-center">
        <p className="text-[15px] text-[var(--text-secondary)]">
          New to Fydell?{" "}
          <Link href="/signup" className="font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
            Sign up
          </Link>{" "}
          with the email address your invitation was sent to.
        </p>
      </section>
    </MarketingShell>
  );
}
