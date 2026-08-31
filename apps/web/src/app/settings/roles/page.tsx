"use client";

import { AuthClient } from "@effect/auth/web";
import { RolesEditor } from "@effect/access-control/web";
import { AppShell } from "@effect/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RolesPage() { const router = useRouter(); const [allowed, setAllowed] = useState<boolean>(); useEffect(() => { void new AuthClient().me().then((response) => setAllowed(response.permissions.includes("roles:manage"))).catch(() => router.replace("/login?recovery=1")); }, [router]); return <AppShell title="نقش‌ها و مجوزها">{allowed === undefined ? <p className="effect-state" role="status">در حال بررسی دسترسی…</p> : allowed ? <RolesEditor /> : <div className="effect-state effect-state--denied" role="alert">اجازه مدیریت نقش‌ها را ندارید.</div>}</AppShell>; }
