"use client";

import { AuthClient } from "@effect/auth/web";
import { ApiError } from "@effect-erp/contracts";
import { AppShell } from "@effect/ui";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

type Me = Awaited<ReturnType<AuthClient["me"]>>;
export type AuthenticatedPageClient = Pick<AuthClient, "me" | "refresh">;

const authenticationCodes = new Set(["AUTHENTICATION_REQUIRED", "SESSION_INVALID", "SESSION_REVOKED"]);

function isAuthenticationFailure(error: unknown): boolean {
  return error instanceof ApiError && authenticationCodes.has(error.code);
}

export function useVerifiedSession(client: AuthenticatedPageClient, allowPasswordChange = false) {
  const router = useRouter();
  const [state, setState] = useState<{ status: "checking" | "redirecting" | "error"; message?: string } | { status: "ready"; me: Me }>({ status: "checking" });

  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        let response: Me;
        try {
          response = await client.me();
        } catch (reason) {
          if (!isAuthenticationFailure(reason)) throw reason;
          try {
            await client.refresh();
            response = await client.me();
          } catch {
            if (active) {
              setState({ status: "redirecting" });
              router.replace("/login?recovery=1");
            }
            return;
          }
        }
        if (!active) return;
        if (response.user.mustChangePassword && !allowPasswordChange) {
          setState({ status: "redirecting" });
          router.replace("/change-password");
          return;
        }
        setState({ status: "ready", me: response });
      } catch {
        if (active) setState({ status: "error", message: "بررسی نشست ممکن نشد. دوباره تلاش کنید." });
      }
    }
    void verify();
    return () => { active = false; };
  }, [allowPasswordChange, client, router]);

  return state;
}

export function AuthenticatedPage({ title, client, children }: {
  title: string;
  client?: AuthenticatedPageClient;
  children: (me: Me) => ReactNode;
}) {
  const [sessionClient] = useState<AuthenticatedPageClient>(() => client ?? new AuthClient());
  const state = useVerifiedSession(sessionClient);
  if (state.status === "error") return <div className="effect-state effect-state--error" role="alert">{state.message}</div>;
  if (state.status !== "ready") return <p className="effect-state" role="status">در حال بررسی نشست…</p>;
  return <AppShell title={title}>{children(state.me)}</AppShell>;
}
