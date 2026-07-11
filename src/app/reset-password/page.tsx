"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabase();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setReady(true);
        setError(null);
        setChecking(false);
      }
    });

    (async () => {
      try {
        // Recovery links land with tokens in the URL hash / query; detectSessionInUrl handles it.
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setReady(true);
          setChecking(false);
          return;
        }
        // Give the hash parser a moment; if still empty, show expired state.
        window.setTimeout(async () => {
          if (cancelled) return;
          const again = await supabase.auth.getSession();
          if (again.data.session) {
            setReady(true);
          } else {
            setError(
              "This reset link is missing or expired. Request a new one from the forgot-password page."
            );
          }
          setChecking(false);
        }, 400);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open reset session.");
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050609]">
      <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-[480px] w-[580px] rounded-full bg-[#3B5BFF]/[0.06] blur-[160px]" />
      <header className="relative z-10 mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={34} />
        <Link href="/login" className="text-[14px] font-medium text-white/[0.55] transition hover:text-white">
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-72px)] max-w-[440px] items-center px-6 pb-16">
        <div className="w-full overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12] p-7 sm:p-9">
          <h1 className="text-[24px] font-semibold tracking-[-0.04em] text-white">
            Choose a new password
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/[0.55]">
            Enter a new password for your Fydell workspace.
          </p>

          {checking ? (
            <p className="mt-7 text-[14px] text-white/[0.55]">Checking reset link…</p>
          ) : (
            <form onSubmit={submit} className="mt-7 grid gap-4">
              <label className="block">
                <span className="text-[13px] font-medium text-white/[0.66]">New password</span>
                <input
                  className="platform-input mt-1.5"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={!ready}
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-white/[0.66]">Confirm password</span>
                <input
                  className="platform-input mt-1.5"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  disabled={!ready}
                />
              </label>
              {error && (
                <p
                  role="alert"
                  className="rounded-[10px] border border-[#fb7185]/30 bg-[#fb7185]/10 px-3.5 py-2.5 text-[13px] font-medium text-[#fda4b0]"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !ready}
                className="group mt-1 inline-flex h-12 items-center justify-center gap-2.5 rounded-[10px] bg-[#3B5BFF] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#2f4fe0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Saving..." : "Update password"}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </button>
              {!ready && (
                <Link
                  href="/forgot-password"
                  className="text-center text-[13px] font-semibold text-white hover:underline"
                >
                  Request a new reset link
                </Link>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
