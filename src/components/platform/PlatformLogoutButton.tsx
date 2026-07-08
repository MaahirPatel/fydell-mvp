"use client";

import { useRouter } from "next/navigation";

export default function PlatformLogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="platform-btn-ghost !h-9"
      onClick={async () => {
        await fetch("/api/platform/logout", { method: "POST" });
        router.push("/");
      }}
    >
      Sign out
    </button>
  );
}
