"use client";

import { AuditTable } from "@effect/audit/web";
import { AuthClient } from "@effect/auth/web";
import { AppShell } from "@effect/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuditPage() { const router = useRouter(); const [permissions, setPermissions] = useState<string[]>(); useEffect(() => { void new AuthClient().me().then((response) => setPermissions(response.permissions)).catch(() => router.replace("/login?recovery=1")); }, [router]); return <AppShell title="تاریخچه ممیزی">{permissions ? <AuditTable principal={{ permissions }} /> : <p className="effect-state" role="status">در حال بررسی دسترسی…</p>}</AppShell>; }
