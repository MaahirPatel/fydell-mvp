"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function RolesPage() {
  const [role, setRole] = useState<{ title: string; invitesEnabled?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/pilot/dashboard", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to load");
      else if (data.roleTitle) setRole({ title: data.roleTitle, invitesEnabled: data.invitesEnabled });
    })();
  }, []);

  return (
    <div>
      <h1 className="text-[28px] text-white" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Roles
      </h1>
      {error ? <p className="mt-4 text-[#fda4b0]">{error}</p> : null}
      {!role ? (
        <div className="mt-8 rounded-[14px] border border-dashed border-white/12 px-4 py-10 text-center text-[13px] text-white/55">
          No hiring roles yet.{" "}
          <Link href="/onboarding/employer" className="underline">
            Complete setup
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-[14px] border border-white/10 bg-[#0A0C11] p-5">
          <p className="text-[16px] font-medium text-white">{role.title}</p>
          <p className="mt-2 text-[13px] text-white/55">
            Project Meridian · Invites {role.invitesEnabled ? "enabled" : "pending approval"}
          </p>
        </div>
      )}
    </div>
  );
}
