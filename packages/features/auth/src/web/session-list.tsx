"use client";

import { ApiError } from "@effect-erp/contracts";
import { Button } from "@effect/ui";
import { useEffect, useState } from "react";

import { AuthClient } from "./auth-client.js";

type SessionClient = Pick<AuthClient, "listSessions" | "revokeSession" | "logoutAll">;

function localDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function SessionList({ client = new AuthClient(), onUnauthenticated }: { client?: SessionClient; onUnauthenticated?: () => void }) {
  const [page, setPage] = useState<Awaited<ReturnType<SessionClient["listSessions"]>>>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string>();
  const [confirmId, setConfirmId] = useState<string>();
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);

  async function load(pageNumber = selectedPage) {
    setLoading(true);
    setError("");
    try {
      setPage(await client.listSessions({ page: pageNumber }));
      setSelectedPage(pageNumber);
    } catch (loadError) {
      if (loadError instanceof ApiError && ["SESSION_INVALID", "SESSION_REVOKED"].includes(loadError.code)) onUnauthenticated?.();
      else setError(loadError instanceof ApiError ? loadError.message : "دریافت نشست‌ها ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function revoke(id: string) {
    setPendingId(id);
    setError("");
    try {
      await client.revokeSession(id);
      setConfirmId(undefined);
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof ApiError ? revokeError.message : "لغو نشست ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setPendingId(undefined);
    }
  }

  async function logoutAll() {
    setLoggingOut(true);
    setError("");
    try {
      await client.logoutAll();
      onUnauthenticated?.();
    } catch (logoutError) {
      setError(logoutError instanceof ApiError ? logoutError.message : "خروج از نشست‌ها ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) return <p className="effect-state" role="status">در حال دریافت نشست‌ها…</p>;
  if (error) return <div className="effect-state effect-state--error" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>تلاش دوباره</Button></div>;
  if (!page || page.items.length === 0) return <div className="effect-state"><p>نشست فعالی برای نمایش وجود ندارد.</p><Button variant="secondary" onClick={() => void load()}>تازه‌سازی</Button></div>;

  return (
    <section className="effect-session-list" aria-label="نشست‌های فعال">
      <div className="effect-session-list__header"><div><h2>نشست‌های فعال</h2><p>دستگاه‌هایی که با حساب شما وارد شده‌اند.</p></div><Button variant="danger" disabled={loggingOut} onClick={() => void logoutAll()}>{loggingOut ? "در حال خروج…" : "خروج از همه نشست‌ها"}</Button></div>
      <ul>
        {page.items.map((session) => (
          <li className="effect-session" key={session.id}>
            <div><h3>{session.device} {session.current ? <span className="effect-current">نشست فعلی</span> : null}</h3><p dir="ltr">{session.ipAddress}</p><p>آخرین فعالیت: {localDate(session.lastUsedAt)}</p></div>
            {!session.current ? <div className="effect-session__action">{confirmId === session.id ? <><span>از لغو این نشست مطمئن هستید؟</span><Button variant="danger" disabled={pendingId === session.id} onClick={() => void revoke(session.id)}>{pendingId === session.id ? "در حال لغو…" : "بله، لغو کن"}</Button><Button variant="ghost" disabled={pendingId === session.id} onClick={() => setConfirmId(undefined)}>انصراف</Button></> : <Button variant="secondary" onClick={() => setConfirmId(session.id)}>لغو نشست</Button>}</div> : null}
          </li>
        ))}
      </ul>
      {page.meta.pageCount > 1 ? <div className="effect-session-list__pagination"><span>صفحه {page.meta.page} از {page.meta.pageCount}</span><div><Button variant="secondary" disabled={page.meta.page <= 1} onClick={() => void load(page.meta.page - 1)}>قبلی</Button><Button variant="secondary" disabled={page.meta.page >= page.meta.pageCount} onClick={() => void load(page.meta.page + 1)}>بعدی</Button></div></div> : null}
    </section>
  );
}
