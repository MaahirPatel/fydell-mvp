"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  }

  const className =
    variant === "dark"
      ? "inline-flex h-8 items-center rounded-[8px] border border-white/15 bg-transparent px-3 text-[12px] font-medium text-[#F4F5F7] transition-colors hover:bg-white/[0.06]"
      : "rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-[#111318] transition-colors hover:border-line-strong";

  return (
    <button type="button" onClick={logout} className={className}>
      Sign out
    </button>
  );
}
