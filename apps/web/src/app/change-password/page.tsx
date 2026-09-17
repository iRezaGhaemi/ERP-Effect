"use client";

import { AuthClient, ChangePasswordForm } from "@effect/auth/web";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useVerifiedSession } from "../authenticated-page";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [client] = useState(() => new AuthClient());
  const state = useVerifiedSession(client, true);
  return (
    <div className="effect-auth-page">
      <div className="effect-auth-art" aria-hidden="true"><img src="/login-art.jpg" alt="" /></div>
      <section className="effect-auth-side"><div className="effect-auth-card">
        {state.status === "ready" ? <ChangePasswordForm client={client} mustChangePassword={state.me.user.mustChangePassword} onChanged={() => router.replace("/dashboard")} onLoggedOut={() => router.replace("/login?recovery=1")} /> : state.status === "error" ? <div className="effect-state effect-state--error" role="alert">{state.message}</div> : <p className="effect-state" role="status">در حال بررسی نشست…</p>}
      </div></section>
    </div>
  );
}
