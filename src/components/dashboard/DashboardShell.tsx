"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Timer,
  FileText,
  Target,
  Settings,
  Plus,
  X,
  Copy,
  Check,
} from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/roles", label: "Roles", icon: Briefcase },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/sessions", label: "Sessions", icon: Timer },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/outcomes", label: "Outcomes", icon: Target },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({
  children,
  organizationName = "Your workspace",
}: {
  children: React.ReactNode;
  organizationName?: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendInvite() {
    if (!email.trim() || !name.trim()) {
      setErr("Name and email are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/pilot/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName: name, candidateEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");
      setInviteLink(data.acceptUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/platform/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-[#F4F5F7]">
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        <aside className="hidden w-[224px] shrink-0 flex-col border-r border-white/[0.08] bg-[#090B10] px-3 py-4 md:flex">
          <div className="px-2 pb-4">
            <FydellBrand markSize={28} wordmarkSize={18} />
          </div>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV.map((item) => {
              const active = item.exact
                ? path === item.href
                : path === item.href || path.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] ${
                    active
                      ? "bg-[#3B5BFF]/15 text-white"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  style={{ fontWeight: active ? 560 : 450 }}
                >
                  <Icon className="h-4 w-4 opacity-70" strokeWidth={1.7} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-2 border-t border-white/[0.08] px-2 pt-4">
            <p className="truncate text-[12.5px] text-white">{organizationName}</p>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 w-full items-center justify-center rounded-[8px] border border-white/15 bg-[#12151C] text-[12.5px] font-semibold text-white"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-14 items-center justify-between border-b border-white/[0.08] px-4 sm:px-7">
            <p className="truncate text-[13px] text-white/55">{organizationName}</p>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#F1F2F4] px-3 text-[12.5px] font-semibold text-[#08090C]"
            >
              <Plus className="h-3.5 w-3.5" />
              Invite candidates
            </button>
          </header>
          <div className="px-4 py-7 sm:px-7 lg:px-8">{children}</div>
        </div>
      </div>

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[16px] border border-white/10 bg-[#0A0C11] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Invite candidate</h2>
              <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close">
                <X className="h-4 w-4 text-white/50" />
              </button>
            </div>
            {!inviteLink ? (
              <div className="mt-4 space-y-3">
                <input
                  className="platform-input"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  className="platform-input"
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {err ? <p className="text-[12px] text-[#fda4b0]">{err}</p> : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={sendInvite}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[9px] bg-[#F1F2F4] text-[13px] font-semibold text-[#08090C] disabled:opacity-50"
                >
                  {busy ? "Creating…" : "Create invitation"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-[13px] text-white/60">
                  Share this secure acceptance link with the candidate.
                </p>
                <div className="break-all rounded-[10px] border border-white/10 bg-black/30 px-3 py-2 text-[12px]">
                  {inviteLink}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-white/15 px-3 text-[12px]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardShell;
