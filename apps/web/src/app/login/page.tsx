"use client";

import { LoginForm } from "@effect/auth/web";
import { useRouter } from "next/navigation";

function nextDestination(): string {
  const fallback = "/dashboard";
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested?.startsWith("/") || requested.startsWith("//")) return fallback;
  try {
    const target = new URL(requested, window.location.origin);
    if (target.origin !== window.location.origin) return fallback;
    const allowed = target.pathname === "/dashboard" || target.pathname === "/change-password" || target.pathname.startsWith("/settings/");
    return allowed ? `${target.pathname}${target.search}${target.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export default function LoginPage() {
  const router = useRouter();
  return <div className="effect-auth-page"><div className="effect-auth-art" aria-hidden="true"><img src="/login-art.jpg" alt="" /></div><section className="effect-auth-side"><div className="effect-auth-card"><LoginForm onAuthenticated={(response) => router.replace(response.user.mustChangePassword ? "/change-password" : nextDestination())} /></div></section></div>;
}
