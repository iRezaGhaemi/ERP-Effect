"use client";

import { SessionList } from "@effect/auth/web";
import { AppShell } from "@effect/ui";
import { useRouter } from "next/navigation";

export default function SessionsPage() {
  const router = useRouter();
  return <AppShell title="نشست‌ها"><SessionList onUnauthenticated={() => router.replace("/login?recovery=1")} /></AppShell>;
}
