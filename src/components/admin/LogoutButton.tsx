"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-9 w-full items-center justify-center rounded-[8px] border border-white/20 bg-[#12151C] px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1A1E28]"
    >
      Sign out
    </button>
  );
}
