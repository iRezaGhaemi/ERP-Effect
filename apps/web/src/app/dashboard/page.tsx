"use client";

import { AuthClient } from "@effect/auth/web";
import { AppShell } from "@effect/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  useEffect(() => { void new AuthClient().me().then(() => setChecking(false)).catch(() => router.replace("/login?recovery=1")); }, [router]);
  if (checking) return <p className="effect-state" role="status">در حال بررسی نشست…</p>;
  return <AppShell title="داشبورد"><section className="effect-dashboard-card"><h2>به Effect ERP خوش آمدید</h2><p>برای ادامه، از ناوبری سمت راست استفاده کنید.</p></section></AppShell>;
}
