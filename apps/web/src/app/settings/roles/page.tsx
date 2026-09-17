"use client";

import { RolesEditor } from "@effect/access-control/web";

import { AuthenticatedPage } from "../../authenticated-page";

export default function RolesPage() {
  return <AuthenticatedPage title="نقش‌ها و مجوزها">{(me) => me.permissions.includes("roles:manage") ? <RolesEditor /> : <div className="effect-state effect-state--denied" role="alert">اجازه مدیریت نقش‌ها را ندارید.</div>}</AuthenticatedPage>;
}
