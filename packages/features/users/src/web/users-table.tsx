"use client";

import type { AuthenticatedPrincipal, Page } from "@effect-erp/contracts";
import { Button } from "@effect/ui";
import { useEffect, useState } from "react";

import type { UserDto } from "../contracts/index.js";
import { UsersClient } from "./users-client.js";

export type UsersTableClient = Pick<UsersClient, "list">;

export function UsersTable({ principal, client = new UsersClient(), onCreate, onSelect, refreshKey = 0 }: { principal: Pick<AuthenticatedPrincipal, "permissions">; client?: UsersTableClient; onCreate?: () => void; onSelect?: (user: UserDto) => void; refreshKey?: number }) {
  const allowed = principal.permissions.includes("users:read");
  const canCreate = principal.permissions.includes("users:create") && principal.permissions.includes("users:credentials:manage");
  const [page, setPage] = useState<Page<UserDto>>();
  const [loading, setLoading] = useState(allowed);
  const [error, setError] = useState("");

  async function load(pageNumber = page?.meta.page ?? 1) {
    setLoading(true); setError("");
    try { setPage(await client.list({ page: pageNumber })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "دریافت کاربران ممکن نشد."); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (allowed) void load(1); }, [allowed, refreshKey]);

  if (!allowed) return <div className="effect-state effect-state--denied" role="alert">اجازه مشاهده کاربران را ندارید.</div>;
  if (loading) return <p className="effect-state" role="status">در حال دریافت کاربران…</p>;
  if (error) return <div className="effect-state effect-state--error" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>تلاش دوباره</Button></div>;
  if (!page || page.items.length === 0) return <section className="effect-state"><p>کاربری برای نمایش وجود ندارد.</p><div className="effect-actions">{canCreate ? <Button onClick={onCreate}>کاربر جدید</Button> : null}<Button variant="secondary" onClick={() => void load()}>تازه‌سازی</Button></div></section>;

  return <section className="effect-admin-card" aria-label="فهرست کاربران">
    <div className="effect-admin-card__header"><div><h2>کاربران</h2><p>حساب‌ها، وضعیت دسترسی و نقش‌های سازمانی.</p></div>{canCreate ? <Button onClick={onCreate}>کاربر جدید</Button> : null}</div>
    <div className="effect-table-wrap"><table className="effect-table"><thead><tr><th>کاربر</th><th>شماره موبایل</th><th>وضعیت</th><th>آخرین ورود</th><th><span className="effect-sr-only">عملیات</span></th></tr></thead><tbody>{page.items.map((user) => <tr key={user.id}><td><strong>{user.firstName} {user.lastName}</strong><span className="effect-user-username" dir="ltr">{user.username ?? "ورود تنظیم نشده"}</span></td><td dir="ltr">{user.phone}</td><td><span className={`effect-badge effect-badge--${user.status.toLowerCase()}`}>{user.status === "SUSPENDED" ? "تعلیق‌شده" : "فعال"}</span></td><td>{user.lastLoginAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(user.lastLoginAt)) : "—"}</td><td><Button variant="ghost" onClick={() => onSelect?.(user)} aria-label={`جزئیات ${user.firstName} ${user.lastName}`}>جزئیات</Button></td></tr>)}</tbody></table></div>
    {page.meta.pageCount > 1 ? <div className="effect-pagination"><span>صفحه {page.meta.page} از {page.meta.pageCount}</span><div><Button variant="secondary" disabled={page.meta.page <= 1} onClick={() => void load(page.meta.page - 1)}>قبلی</Button><Button variant="secondary" disabled={page.meta.page >= page.meta.pageCount} onClick={() => void load(page.meta.page + 1)}>بعدی</Button></div></div> : null}
  </section>;
}
