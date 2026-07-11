import { Suspense } from "react";
import AuthForm from "@/components/platform/AuthForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#050609]" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
