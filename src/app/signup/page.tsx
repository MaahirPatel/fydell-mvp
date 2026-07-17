"use client";

import { Suspense } from "react";
import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";
import FdeAuthForm from "@/components/fde/FdeAuthForm";

function SignupContent() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050609]">
      <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-[480px] w-[580px] rounded-full bg-[#3B5BFF]/[0.06] blur-[160px]" />
      <div className="pointer-events-none absolute left-[-6%] bottom-[-10%] h-[400px] w-[500px] rounded-full bg-[#3B5BFF]/[0.04] blur-[160px]" />

      <header className="relative z-10 mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={42} wordmarkSize={24} />
        <Link
          href="/login"
          className="text-[14px] font-medium text-white/[0.55] transition hover:text-white"
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-72px)] max-w-[720px] items-center px-6 pb-16">
        <section className="w-full">
          <h1
            className="text-white"
            style={{
              fontSize: "clamp(2rem,3vw,2.8rem)",
              lineHeight: 1.06,
              letterSpacing: "-0.04em",
              fontWeight: 650,
            }}
          >
            Create your account
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.65] text-white/[0.55]">
            Just your name, email, and password to start. You&apos;ll choose how you use Fydell
            right after.
          </p>
          <div className="mt-8">
            <FdeAuthForm />
          </div>

          <p className="mt-6 text-center text-[13px] text-white/50">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-white hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#050609]" />}>
      <SignupContent />
    </Suspense>
  );
}
