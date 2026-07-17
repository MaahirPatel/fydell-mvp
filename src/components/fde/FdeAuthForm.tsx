"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { SignupPath } from "@/components/fde/SignupPathPicker";

const COPY: Record<SignupPath, { title: string; subtitle: string }> = {
  employer: {
    title: "Create your employer workspace",
    subtitle: "You'll land on a blank mission draft — no fake candidates, no filler data.",
  },
  fde: {
    title: "Create your FDE profile",
    subtitle: "You'll land in your FDE home. Missions arrive by invitation.",
  },
  partner: {
    title: "Apply as a partner",
    subtitle: "Partner access is approval-gated. We'll follow up once your application is reviewed.",
  },
};

const DEFAULT_COPY = {
  title: "Create your account",
  subtitle: "You'll choose how you use Fydell — as a business or an FDE — right after this.",
};

export default function FdeAuthForm({
  path,
  onBack,
}: {
  path?: SignupPath;
  onBack?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [firmName, setFirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copy = path ? COPY[path] : DEFAULT_COPY;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fde/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          name,
          email,
          password,
          companyName: path === "employer" ? companyName : undefined,
          companyWebsite: path === "employer" ? companyWebsite : undefined,
          firmName: path === "partner" ? firmName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      router.push(data.redirectTo || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12] p-7 sm:p-9">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/[0.5] transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Change path
        </button>
      )}

      <h2 className={`text-[24px] font-semibold tracking-[-0.04em] text-white ${onBack ? "mt-4" : ""}`}>
        {copy.title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-white/[0.55]">{copy.subtitle}</p>

      <form onSubmit={submit} className="mt-7 grid gap-4">
        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Full name</span>
          <input
            className="platform-input mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            required
          />
        </label>

        {path === "employer" && (
          <label className="block">
            <span className="text-[13px] font-medium text-white/[0.66]">Company name</span>
            <input
              className="platform-input mt-1.5"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company"
              required
            />
          </label>
        )}

        {path === "employer" && (
          <label className="block">
            <span className="text-[13px] font-medium text-white/[0.66]">
              Company website <span className="text-white/35">(optional)</span>
            </span>
            <input
              className="platform-input mt-1.5"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="acme.com"
            />
          </label>
        )}

        {path === "partner" && (
          <label className="block">
            <span className="text-[13px] font-medium text-white/[0.66]">
              Firm / organization name <span className="text-white/35">(optional)</span>
            </span>
            <input
              className="platform-input mt-1.5"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Your firm"
            />
          </label>
        )}

        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Email</span>
          <input
            className="platform-input mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Password</span>
          <input
            className="platform-input mt-1.5"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            minLength={8}
            required
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border border-[#fb7185]/40 bg-[#fb7185]/15 px-3.5 py-2.5 text-[13px] font-medium text-[#fecdd3]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group mt-1 inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#3B5BFF] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#2f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Working..." : "Create account"}
          {!loading && (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </button>
      </form>
    </div>
  );
}
