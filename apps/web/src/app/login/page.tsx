"use client";

import { LoginForm } from "@effect/auth/web";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return <div className="effect-auth-page"><div className="effect-auth-art" aria-hidden="true"><img src="/login-art.jpg" alt="" /></div><section className="effect-auth-side"><div className="effect-auth-card"><LoginForm onAuthenticated={() => router.replace("/dashboard")} /></div></section></div>;
}
