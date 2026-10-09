"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/platform/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-9 w-full items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-app-meta font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
    >
      Sign out
    </button>
  );
}
