"use client";

import type { Page } from "@effect-erp/contracts";
import { Button } from "@effect/ui";
import { useEffect, useState } from "react";

import type { AuditLogDto } from "../contracts/index.js";
import { AuditClient } from "./audit-client.js";

export type AuditTableClient = Pick<AuditClient, "list">;

function stableMetadata(metadata: Record<string, unknown>): string { try { return JSON.stringify(metadata, Object.keys(metadata).sort(), 2); } catch { return "{ }"; } }

export function AuditTable({ principal, client = new AuditClient() }: { principal: { permissions: string[] }; client?: AuditTableClient }) {
  const allowed = principal.permissions.includes("audit:read"); const [page, setPage] = useState<Page<AuditLogDto>>(); const [loading, setLoading] = useState(allowed); const [error, setError] = useState("");
  async function load(pageNumber = page?.meta.page ?? 1) { setLoading(true); setError(""); try { setPage(await client.list({ page: pageNumber })); } catch (reason) { setError(reason instanceof Error ? reason.message : "دریافت تاریخچه ممکن نشد."); } finally { setLoading(false); } }
  useEffect(() => { if (allowed) void load(1); }, [allowed]);
  if (!allowed) return <div className="effect-state effect-state--denied" role="alert">اجازه مشاهده تاریخچه را ندارید.</div>;
  if (loading) return <p className="effect-state" role="status">در حال دریافت تاریخچه…</p>;
  if (error) return <div className="effect-state effect-state--error" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>تلاش دوباره</Button></div>;
  if (!page || page.items.length === 0) return <section className="effect-state"><p>رویداد ثبت‌شده‌ای برای نمایش وجود ندارد.</p><Button variant="secondary" onClick={() => void load()}>تازه‌سازی</Button></section>;
  return <section className="effect-admin-card" aria-label="تاریخچه ممیزی"><div className="effect-admin-card__header"><div><h2>تاریخچه ممیزی</h2><p>این تاریخچه فقط برای مشاهده است.</p></div></div><div className="effect-table-wrap"><table className="effect-table"><thead><tr><th>رویداد</th><th>موجودیت</th><th>زمان</th><th>فراداده</th></tr></thead><tbody>{page.items.map((item) => <tr key={item.id}><td>{item.action}</td><td>{item.entityType}</td><td>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}</td><td><pre className="effect-audit-metadata">{stableMetadata(item.metadata)}</pre></td></tr>)}</tbody></table></div>{page.meta.pageCount > 1 ? <div className="effect-pagination"><span>صفحه {page.meta.page} از {page.meta.pageCount}</span><div><Button variant="secondary" disabled={page.meta.page <= 1} onClick={() => void load(page.meta.page - 1)}>قبلی</Button><Button variant="secondary" disabled={page.meta.page >= page.meta.pageCount} onClick={() => void load(page.meta.page + 1)}>بعدی</Button></div></div> : null}</section>;
}
