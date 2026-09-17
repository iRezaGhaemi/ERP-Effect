"use client";

import { AccessClient, PermissionOverrides } from "@effect/access-control/web";
import { AuthClient, CredentialAdminForm } from "@effect/auth/web";
import { ApiError } from "@effect-erp/contracts";
import { Button } from "@effect/ui";
import { UserForm, UsersClient, UsersTable } from "@effect/users/web";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthenticatedPage } from "../../authenticated-page";

type Detail = Awaited<ReturnType<UsersClient["get"]>>;
type Catalog = Awaited<ReturnType<AccessClient["listPermissions"]>>["items"];
type Roles = Awaited<ReturnType<AccessClient["listRoles"]>>["items"];

function needsLogin(error: unknown) { return error instanceof ApiError && ["AUTHENTICATION_REQUIRED", "SESSION_INVALID", "SESSION_REVOKED"].includes(error.code); }

export default function UsersPage() {
  return <AuthenticatedPage title="کاربران">{(me) => <UsersManagement permissions={me.permissions} />}</AuthenticatedPage>;
}

function UsersManagement({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const [users] = useState(() => new UsersClient());
  const [access] = useState(() => new AccessClient());
  const [credentials] = useState(() => new AuthClient());
  const [detail, setDetail] = useState<Detail>();
  const [catalog, setCatalog] = useState<Catalog>([]);
  const [roles, setRoles] = useState<Roles>([]);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function open(id: string) {
    setError("");
    try {
      const selected = await users.get(id);
      setDetail(selected);
      if (permissions.includes("roles:manage")) {
        const [rolePage, permissionPage] = await Promise.all([access.listRoles(), access.listPermissions()]);
        setRoles(rolePage.items);
        setCatalog(permissionPage.items);
      }
    } catch (reason) {
      if (needsLogin(reason)) router.replace("/login?recovery=1");
      else setError(reason instanceof Error ? reason.message : "دریافت جزئیات کاربر ممکن نشد.");
    }
  }

  const canEdit = permissions.includes("users:update");
  const canManageRoles = permissions.includes("roles:manage");
  const canManageCredentials = permissions.includes("users:credentials:manage");

  return <>
    <p className="effect-live" role="status" aria-live="polite">{notice}</p>
    {error ? <p className="effect-form-error" role="alert">{error}</p> : null}
    <UsersTable principal={{ permissions }} client={users} refreshKey={refreshKey} onCreate={() => setCreating(true)} onSelect={(user) => void open(user.id)} />
    {creating ? <Drawer title="کاربر جدید" onClose={() => setCreating(false)}><UserForm onCancel={() => setCreating(false)} onSave={async (input) => {
      if (!("username" in input) || !("initialPassword" in input)) throw new Error("اطلاعات ورود کاربر کامل نیست.");
      await users.create(input);
      setNotice("کاربر جدید ایجاد شد.");
      setCreating(false);
      setRefreshKey((value) => value + 1);
    }} /></Drawer> : null}
    {detail ? <Drawer title={`${detail.firstName} ${detail.lastName}`} onClose={() => setDetail(undefined)}>
      <div className="effect-drawer-profile"><span className={`effect-badge effect-badge--${detail.status.toLowerCase()}`}>{detail.status === "ACTIVE" ? "فعال" : "تعلیق‌شده"}</span></div>
      <Profile detail={detail} />
      {canEdit ? <UserForm initial={detail} onCancel={() => setDetail(undefined)} onSave={async (input) => {
        const updated = await users.update(detail.id, input);
        setDetail({ ...detail, ...updated });
        setNotice("اطلاعات کاربر به‌روزرسانی شد.");
        setRefreshKey((value) => value + 1);
      }} /> : null}
      {permissions.includes("users:suspend") ? <Button variant={detail.status === "ACTIVE" ? "danger" : "secondary"} onClick={() => void (detail.status === "ACTIVE" ? users.suspend(detail.id) : users.activate(detail.id)).then(() => {
        setDetail({ ...detail, status: detail.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" });
        setNotice("وضعیت کاربر به‌روزرسانی شد.");
        setRefreshKey((value) => value + 1);
      }).catch((reason) => setError(reason instanceof Error ? reason.message : "تغییر وضعیت ممکن نشد."))}>{detail.status === "ACTIVE" ? "تعلیق کاربر" : "فعال‌سازی کاربر"}</Button> : null}
      {canManageCredentials ? <CredentialAdminForm target={detail} client={credentials} onSaved={(credentialState) => {
        setDetail({ ...detail, ...credentialState });
        setNotice(detail.credentialsReady ? "گذرواژه کاربر بازنشانی شد." : "اطلاعات ورود کاربر تنظیم شد.");
        setRefreshKey((value) => value + 1);
      }} /> : null}
      {canManageRoles ? <RoleAssignments user={detail} roles={roles} client={access} onSaved={(roleIds) => setDetail({ ...detail, roleIds })} /> : null}
      {canManageRoles ? <PermissionOverrides user={{ id: detail.id, overrides: detail.permissionOverrides }} permissions={catalog} client={access} onSaved={(permissionOverrides) => setDetail({ ...detail, permissionOverrides })} /> : null}
    </Drawer> : null}
  </>;
}

function Drawer({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="effect-drawer-backdrop" role="presentation"><aside className="effect-drawer" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><Button variant="ghost" aria-label="بستن" onClick={onClose}>×</Button></header>{children}</aside></div>; }
function Profile({ detail }: { detail: Detail }) { return <dl className="effect-profile"><dt>شماره موبایل</dt><dd dir="ltr">{detail.phone}</dd><dt>نام</dt><dd>{detail.firstName} {detail.lastName}</dd><dt>نام کاربری</dt><dd dir="ltr">{detail.username ?? "تنظیم نشده"}</dd><dt>وضعیت ورود</dt><dd>{detail.credentialsReady ? detail.mustChangePassword ? "گذرواژه موقت" : "آماده" : "تنظیم نشده"}</dd></dl>; }
function RoleAssignments({ user, roles, client, onSaved }: { user: Detail; roles: Roles; client: AccessClient; onSaved: (roleIds: string[]) => void }) { const [ids, setIds] = useState(user.roleIds); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false); async function change(roleId: string, checked: boolean) { const next = checked ? [...ids, roleId] : ids.filter((id) => id !== roleId); setSaving(true); setError(""); try { await client.replaceRoles(user.id, { roleIds: next }); setIds(next); onSaved(next); setMessage("نقش‌های کاربر به‌روزرسانی شد."); } catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیره نقش‌ها ممکن نشد."); } finally { setSaving(false); } } return <section className="effect-access-section"><h3>نقش‌های کاربر</h3><p className="effect-live" role="status" aria-live="polite">{message}</p>{error ? <p role="alert" className="effect-form-error">{error}</p> : null}{roles.map((role) => <label className="effect-check" key={role.id}><input type="checkbox" checked={ids.includes(role.id)} disabled={saving} onChange={(event) => void change(role.id, event.target.checked)} />{role.name}</label>)}</section>; }
