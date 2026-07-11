import { Suspense } from "react";
import AuthForm from "@/components/platform/AuthForm";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#050609]" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
