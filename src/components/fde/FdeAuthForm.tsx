"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import type { SignupPath } from "@/components/fde/SignupPathPicker";
import { pilotModeEnabled } from "@/lib/fde/flags";

const COPY: Record<SignupPath, { title: string; subtitle: string }> = {
  employer: {
    title: "Create your employer workspace",
    subtitle: "You'll land on a blank hiring workspace — no fake candidates, no filler data.",
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

function humanizeAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("least"))) {
    return "Use a password with at least 8 characters.";
  }
  if (lower.includes("invalid email") || lower.includes("email address")) {
    return "Enter a valid work email address.";
  }
  if (lower.includes("rate") || lower.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (lower.includes("database not configured") || lower.includes("supabase")) {
    return "Sign-up is temporarily unavailable. If you are evaluating a pilot, use Enter pilot workspace below.";
  }
  // Never surface raw provider dumps
  if (raw.length > 160 || lower.includes("json") || lower.includes("stack")) {
    return "We couldn't create your account. Check your details and try again.";
  }
  return raw;
}

export default function FdeAuthForm({
  path,
  onBack,
}: {
  path?: SignupPath;
  onBack?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  // Only candidate session deep-links (/s/<token>) may override the destination.
  const returnPath =
    rawNext && rawNext.startsWith("/s/") && !rawNext.startsWith("//") ? rawNext : null;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [firmName, setFirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const copy = path ? COPY[path] : DEFAULT_COPY;
  const showPilotFallback =
    typeof window !== "undefined" &&
    (pilotModeEnabled() || process.env.NODE_ENV === "development");

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your full name.";
    if (!email.trim() || !email.includes("@")) next.email = "Enter a valid work email.";
    if (password.length < 8) next.password = "Password must be at least 8 characters.";
    if (path === "employer" && !companyName.trim()) next.companyName = "Enter your company name.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fde/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Invitation deep-links are always candidate (FDE) signups.
          path: returnPath ? path ?? "fde" : path,
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
      if (returnPath) {
        router.push(returnPath);
        return;
      }
      router.push(data.redirectTo || "/app/employer");
    } catch (err) {
      setError(humanizeAuthError(err instanceof Error ? err.message : "Something went wrong"));
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-[16px] border border-white/[0.10] bg-[#080B12] p-7 sm:p-9">
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

      <form onSubmit={submit} className="mt-7 grid gap-4" noValidate>
        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Full name</span>
          <input
            className="platform-input mt-1.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validate()}
            placeholder="Jane Doe"
            autoComplete="name"
            required
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-[12px] text-[#fda4b0]">{fieldErrors.name}</p>
          )}
        </label>

        {path === "employer" && (
          <label className="block">
            <span className="text-[13px] font-medium text-white/[0.66]">Company name</span>
            <input
              className="platform-input mt-1.5"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company"
              autoComplete="organization"
              required
              aria-invalid={Boolean(fieldErrors.companyName)}
            />
            {fieldErrors.companyName && (
              <p className="mt-1 text-[12px] text-[#fda4b0]">{fieldErrors.companyName}</p>
            )}
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
              autoComplete="url"
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
          <span className="text-[13px] font-medium text-white/[0.66]">Work email</span>
          <input
            className="platform-input mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-[12px] text-[#fda4b0]">{fieldErrors.email}</p>
          )}
        </label>

        <label className="block">
          <span className="text-[13px] font-medium text-white/[0.66]">Password</span>
          <div className="relative mt-1.5">
            <input
              className="platform-input w-full pr-11"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              autoComplete="new-password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[12px] text-white/35">Use at least 8 characters.</p>
          {fieldErrors.password && (
            <p className="mt-1 text-[12px] text-[#fda4b0]">{fieldErrors.password}</p>
          )}
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
          {loading ? "Creating account…" : "Create account"}
          {!loading && (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-white/45">
        Already have an account?{" "}
        <a
          href={returnPath ? `/login?next=${encodeURIComponent(returnPath)}` : "/login"}
          className="text-white/80 underline"
        >
          Log in
        </a>
      </p>

      {showPilotFallback && (
        <div className="mt-5 rounded-[10px] border border-white/10 bg-white/[0.03] px-3.5 py-3">
          <p className="text-[12px] leading-relaxed text-white/50">
            Evaluating without auth credentials?{" "}
            <span className="text-white/70">Pilot workspace</span> is labeled and separate from
            production hiring records.
          </p>
          <a
            href="/app/employer?pilot=1"
            className="mt-2 inline-flex text-[12.5px] font-medium text-[#B8C4FF] underline"
          >
            Enter pilot workspace
          </a>
        </div>
      )}
    </div>
  );
}
