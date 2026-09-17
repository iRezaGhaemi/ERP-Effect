"use client";

import { ApiError } from "@effect-erp/contracts";
import { Button, PasswordField, TextField } from "@effect/ui";
import { useEffect, useRef, useState } from "react";

import type { CreatePasswordUserInput, UpdateUserInput, UserDto } from "../contracts/index.js";

export function UserForm({ initial, onSave, onCancel }: {
  initial?: UserDto;
  onSave: (input: CreatePasswordUserInput | UpdateUserInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [username, setUsername] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  function clearSecrets() {
    setInitialPassword("");
    setConfirmation("");
    form.current?.querySelectorAll<HTMLInputElement>("input[data-password]").forEach((input) => { input.value = ""; });
  }

  useEffect(() => {
    const inputs = form.current?.querySelectorAll<HTMLInputElement>("input[data-password]");
    return () => inputs?.forEach((input) => { input.value = ""; });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!initial && initialPassword !== confirmation) {
      setError("تکرار گذرواژه با گذرواژه اولیه یکسان نیست.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(initial
        ? { firstName, lastName, phone }
        : { firstName, lastName, phone, username, initialPassword });
      clearSecrets();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "ذخیره کاربر ممکن نشد. اطلاعات را بررسی و دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return <form ref={form} className="effect-form" onSubmit={(event) => void submit(event)} noValidate>
    <TextField id="user-first-name" label="نام" value={firstName} disabled={saving} onChange={(event) => setFirstName(event.target.value)} required />
    <TextField id="user-last-name" label="نام خانوادگی" value={lastName} disabled={saving} onChange={(event) => setLastName(event.target.value)} required />
    <TextField id="user-phone" label="شماره موبایل" value={phone} disabled={saving} dir="ltr" onChange={(event) => setPhone(event.target.value)} required />
    {!initial ? <>
      <TextField id="user-username" label="نام کاربری" value={username} disabled={saving} autoComplete="username" dir="ltr" onChange={(event) => setUsername(event.target.value)} required />
      <PasswordField data-password id="user-initial-password" label="گذرواژه اولیه" value={initialPassword} disabled={saving} autoComplete="new-password" dir="ltr" hint="حداقل ۱۵ نویسه و غیرتکراری" onChange={(event) => { setInitialPassword(event.target.value); setError(""); }} required />
      <PasswordField data-password id="user-confirm-password" label="تکرار گذرواژه اولیه" value={confirmation} disabled={saving} autoComplete="new-password" dir="ltr" onChange={(event) => { setConfirmation(event.target.value); setError(""); }} required />
    </> : null}
    {error ? <p role="alert" className="effect-form-error">{error}</p> : null}
    <div className="effect-actions"><Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره کاربر"}</Button><Button variant="ghost" disabled={saving} onClick={onCancel}>انصراف</Button></div>
  </form>;
}
