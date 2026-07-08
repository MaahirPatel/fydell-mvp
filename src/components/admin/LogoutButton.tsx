"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-navy"
    >
      Sign out
    </button>
  );
}
