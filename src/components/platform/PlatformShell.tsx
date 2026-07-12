import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronsUpDown,
  CreditCard,
  FileText,
  Home,
  LayoutGrid,
  Settings,
  UserPlus,
  Users,
  UsersRound
} from "lucide-react";
import Logo from "@/components/Logo";

type NavItem = { label: string; icon: typeof Home; href: string; active?: boolean };

const nav: NavItem[] = [
  { label: "Home", icon: Home, href: "#" },
  { label: "Simulations", icon: LayoutGrid, href: "/platform", active: true },
  { label: "Templates", icon: BriefcaseBusiness, href: "#" },
  { label: "Candidates", icon: Users, href: "#" },
  { label: "Reports", icon: FileText, href: "#" },
  { label: "Insights", icon: BarChart3, href: "#" },
  { label: "Team", icon: UsersRound, href: "#" },
  { label: "Settings", icon: Settings, href: "#" }
] as const;

const workspaceNav: NavItem[] = [
  { label: "Members", icon: UserPlus, href: "#" },
  { label: "Billing", icon: CreditCard, href: "#" }
];

export default function GlassCard({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function PlatformShell({
  children,
  actions
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="platform-bg relative min-h-screen text-white">
      <div className="platform-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/[0.075] bg-black/[0.22] lg:block">
          <div className="scroll-slim sticky top-0 flex h-screen flex-col overflow-y-auto px-5 py-6">
            <Link href="/" className="transition-opacity hover:opacity-90">
              <Logo size={24} variant="dark" />
            </Link>

            <button
              type="button"
              className="mt-7 flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition hover:border-white/[0.16] hover:bg-white/[0.05]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#5b8cff] text-sm font-extrabold text-white">
                GP
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">Your workspace</span>
                <span className="block text-[11px] font-medium text-[#9aa4b8]">Workspace</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/45" strokeWidth={1.7} />
            </button>

            <nav className="mt-6 space-y-1" aria-label="Platform navigation">
              {nav.map(({ label, icon: Icon, href, active }) => (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#7c5cff]/22 text-white shadow-[inset_0_0_0_1px_rgba(124,92,255,.24)]"
                      : "text-white/54 hover:bg-white/[0.045] hover:text-white/82"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                  {label}
                </Link>
              ))}
            </nav>

            <p className="mt-7 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Workspace</p>
            <nav className="mt-2 space-y-1" aria-label="Workspace navigation">
              {workspaceNav.map(({ label, icon: Icon, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/54 transition hover:bg-white/[0.045] hover:text-white/82"
                >
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                  {label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b8cff] to-[#7c5cff] text-sm font-extrabold text-white">
                GP
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-white">Your workspace</span>
                <span className="block text-[11px] font-medium text-[#9aa4b8]">Admin</span>
              </span>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-white/[0.075] bg-[#03050d]/[0.78] backdrop-blur-[22px]">
            <div className="flex h-[76px] items-center justify-between gap-4 px-5 lg:px-8">
              <div className="lg:hidden">
                <Logo size={22} variant="dark" />
              </div>
              <div className="hidden lg:block">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9faeff]">AI-powered simulations</p>
              </div>
              <div className="flex items-center gap-3">{actions}</div>
            </div>
          </header>
          <main className="px-5 py-7 pb-20 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
