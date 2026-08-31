"use client";

import { Button } from "@effect/ui";
import { useState } from "react";

import type { PermissionDto, PermissionEffect, ReplacePermissionOverridesInput } from "../contracts/index.js";
import { AccessClient } from "./access-client.js";

export type PermissionOverridesClient = Pick<AccessClient, "replaceOverrides">;
type OverrideUser = { id: string; overrides: Array<{ permissionId: string; effect: PermissionEffect }> };

export function PermissionOverrides({ user, permissions, client = new AccessClient(), onSaved }: { user: OverrideUser; permissions: PermissionDto[]; client?: PermissionOverridesClient; onSaved?: (overrides: OverrideUser["overrides"]) => void }) {
  const [overrides, setOverrides] = useState(user.overrides);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function replace(next: OverrideUser["overrides"]) { setSaving(true); setError(""); try { const input: ReplacePermissionOverridesInput = { overrides: next }; await client.replaceOverrides(user.id, input); setOverrides(next); onSaved?.(next); setMessage("دسترسی‌های اختصاصی به‌روزرسانی شد."); } catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیره دسترسی‌ها ممکن نشد."); } finally { setSaving(false); } }
  function setEffect(permissionId: string, effect: PermissionEffect) { const current = overrides.find((item) => item.permissionId === permissionId); const next = current ? overrides.map((item) => item.permissionId === permissionId ? { ...item, effect } : item) : [...overrides, { permissionId, effect }]; void replace(next); }
  const byId = new Map(permissions.map((permission) => [permission.id, permission]));
  return <section className="effect-access-section" aria-label="دسترسی‌های اختصاصی"><div><h3>دسترسی‌های اختصاصی</h3><p>این تنظیم‌ها بر پیش‌فرض نقش‌ها اولویت دارند.</p></div>{error ? <p role="alert" className="effect-form-error">{error}</p> : null}<p className="effect-live" role="status" aria-live="polite">{message}</p><ul className="effect-override-list">{permissions.map((permission) => { const effect = overrides.find((item) => item.permissionId === permission.id)?.effect; return <li key={permission.id}><span>{permission.key}</span><div><Button variant={effect === "ALLOW" ? "primary" : "secondary"} disabled={saving} onClick={() => setEffect(permission.id, "ALLOW")}>دسترسی اختصاصی</Button><Button variant={effect === "DENY" ? "danger" : "secondary"} disabled={saving} onClick={() => setEffect(permission.id, "DENY")}>عدم دسترسی اختصاصی</Button></div></li>; })}</ul>{overrides.filter((item) => !byId.has(item.permissionId)).length > 0 ? <p className="effect-note">برخی دسترسی‌های اختصاصی دیگر در فهرست مجوزها وجود ندارند.</p> : null}</section>;
}
