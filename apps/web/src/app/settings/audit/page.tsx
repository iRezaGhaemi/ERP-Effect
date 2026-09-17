"use client";

import { AuditTable } from "@effect/audit/web";

import { AuthenticatedPage } from "../../authenticated-page";

export default function AuditPage() {
  return <AuthenticatedPage title="تاریخچه ممیزی">{(me) => <AuditTable principal={{ permissions: me.permissions }} />}</AuthenticatedPage>;
}
