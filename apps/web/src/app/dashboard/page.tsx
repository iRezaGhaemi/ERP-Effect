"use client";

import { AuthenticatedPage } from "../authenticated-page";

export default function DashboardPage() {
  return <AuthenticatedPage title="داشبورد">{() => <section className="effect-dashboard-card"><h2>به Effect ERP خوش آمدید</h2><p>برای ادامه، از ناوبری سمت راست استفاده کنید.</p></section>}</AuthenticatedPage>;
}
