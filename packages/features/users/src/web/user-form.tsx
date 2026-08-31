"use client";

import { Button, TextField } from "@effect/ui";
import { useState } from "react";

import type { CreateUserInput, UpdateUserInput, UserDto } from "../contracts/index.js";

export function UserForm({ initial, onSave, onCancel }: { initial?: UserDto; onSave: (input: CreateUserInput | UpdateUserInput) => Promise<void>; onCancel: () => void }) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); setError(""); try { await onSave(initial ? { firstName, lastName, phone } : { firstName, lastName, phone }); } catch (reason) { setError(reason instanceof Error ? reason.message : "ذخیره کاربر ممکن نشد."); } finally { setSaving(false); } }
  return <form className="effect-form" onSubmit={(event) => void submit(event)}><TextField id="user-first-name" label="نام" value={firstName} onChange={(event) => setFirstName(event.target.value)} required /><TextField id="user-last-name" label="نام خانوادگی" value={lastName} onChange={(event) => setLastName(event.target.value)} required /><TextField id="user-phone" label="شماره موبایل" value={phone} dir="ltr" onChange={(event) => setPhone(event.target.value)} required />{error ? <p role="alert" className="effect-form-error">{error}</p> : null}<div className="effect-actions"><Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره کاربر"}</Button><Button variant="ghost" disabled={saving} onClick={onCancel}>انصراف</Button></div></form>;
}
