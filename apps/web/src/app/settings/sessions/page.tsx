"use client";

import { SessionList } from "@effect/auth/web";
import { useRouter } from "next/navigation";

import { AuthenticatedPage } from "../../authenticated-page";

export default function SessionsPage() {
  const router = useRouter();
  return <AuthenticatedPage title="نشست‌ها">{() => <SessionList onUnauthenticated={() => router.replace("/login?recovery=1")} />}</AuthenticatedPage>;
}
