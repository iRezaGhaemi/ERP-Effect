"use client";

import { ApiError, type Page } from "@effect-erp/contracts";
import { Button, TextField } from "@effect/ui";
import { useEffect, useState } from "react";

import type { CreateRoleInput, PermissionDto, RoleDto } from "../contracts/index.js";
import { AccessClient } from "./access-client.js";

export type RolesEditorClient = Pick<AccessClient, "listRoles" | "listPermissions" | "createRole" | "updateRole">;
function messageFor(reason: unknown): string { if (reason instanceof ApiError && reason.code === "LAST_ACTIVE_SUPER_ADMIN") return "آخرین مدیر ارشد فعال قابل تغییر نیست."; return reason instanceof Error ? reason.message : "ذخیره نقش ممکن نشد."; }

export function RolesEditor({ client = new AccessClient() }: { client?: RolesEditorClient }) {
  const [roles, setRoles] = useState<Page<RoleDto>>(); const [permissions, setPermissions] = useState<PermissionDto[]>(); const [editing, setEditing] = useState<RoleDto>(); const [creating, setCreating] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(""); try { const [rolePage, permissionPage] = await Promise.all([client.listRoles(), client.listPermissions()]); setRoles(rolePage); setPermissions(permissionPage.items); } catch (reason) { setError(messageFor(reason)); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  if (loading) return <p className="effect-state" role="status">در حال دریافت نقش‌ها…</p>;
  if (error && !roles) return <div className="effect-state effect-state--error" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>تلاش دوباره</Button></div>;
  return <section className="effect-admin-card" aria-label="نقش‌ها"><div className="effect-admin-card__header"><div><h2>نقش‌ها و مجوزها</h2><p>دسترسی‌های پایه هر نقش را مدیریت کنید.</p></div><Button onClick={() => { setCreating(true); setEditing(undefined); setError(""); }}>نقش جدید</Button></div><p className="effect-live" role="status" aria-live="polite">{message}</p>{creating || editing ? <RoleForm role={editing} permissions={permissions ?? []} onCancel={() => { setCreating(false); setEditing(undefined); }} onSave={async (input) => { setError(""); try { const updated = Boolean(editing); if (editing) await client.updateRole(editing.id, input); else await client.createRole(input); setCreating(false); setEditing(undefined); setMessage(updated ? "نقش به‌روزرسانی شد." : "نقش جدید ایجاد شد."); await load(); } catch (reason) { setError(messageFor(reason)); } }} /> : null}{error ? <p role="alert" className="effect-form-error">{error}</p> : null}{roles?.items.length === 0 ? <p className="effect-empty-inline">نقشی برای نمایش وجود ندارد.</p> : <ul className="effect-role-list">{roles?.items.map((role) => <li key={role.id}><div><strong>{role.name}</strong><span>{role.permissionKeys.length} مجوز</span></div><Button variant="secondary" disabled={role.isSystem} aria-label={`ویرایش ${role.name}`} onClick={() => { setEditing(role); setCreating(false); setError(""); }}>ویرایش</Button></li>)}</ul>}</section>;
}

function RoleForm({ role, permissions, onCancel, onSave }: { role?: RoleDto | undefined; permissions: PermissionDto[]; onCancel: () => void; onSave: (input: CreateRoleInput) => Promise<void> }) {
  const [name, setName] = useState(role?.name ?? ""); const [slug, setSlug] = useState(role?.slug ?? ""); const [keys, setKeys] = useState<string[]>(role?.permissionKeys ?? []); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { await onSave({ name, slug, permissionIds: permissions.filter((permission) => keys.includes(permission.key)).map((permission) => permission.id) }); } finally { setSaving(false); } }
  return <form className="effect-form effect-role-form" onSubmit={(event) => void submit(event)}><TextField id="role-name" label="نام نقش" value={name} onChange={(event) => setName(event.target.value)} required /><TextField id="role-slug" label="شناسه نقش" dir="ltr" value={slug} onChange={(event) => setSlug(event.target.value)} required /><fieldset><legend>مجوزها</legend>{permissions.map((permission) => <label className="effect-check" key={permission.id}><input aria-label={permission.key} type="checkbox" checked={keys.includes(permission.key)} onChange={(event) => setKeys((current) => event.target.checked ? [...current, permission.key] : current.filter((key) => key !== permission.key))} />{permission.key}</label>)}</fieldset><div className="effect-actions"><Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره نقش"}</Button><Button variant="ghost" disabled={saving} onClick={onCancel}>انصراف</Button></div></form>;
}
