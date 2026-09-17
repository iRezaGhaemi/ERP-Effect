"use client";

import { ApiError } from "@effect-erp/contracts";
import { Button, PasswordField } from "@effect/ui";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { AuthSessionResponse } from "../contracts/index.js";
import { AuthClient } from "./auth-client.js";

export type ChangePasswordClient = Pick<AuthClient, "changePassword" | "logout">;

function changeError(error: unknown): string {
  if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") return "گذرواژه فعلی صحیح نیست. دوباره تلاش کنید.";
  if (error instanceof ApiError && error.code === "PASSWORD_REUSE") return "گذرواژه جدید باید با گذرواژه فعلی متفاوت باشد.";
  if (error instanceof ApiError) return error.message;
  return "تغییر گذرواژه ممکن نشد. اطلاعات را بررسی و دوباره تلاش کنید.";
}

export function ChangePasswordForm({ client = new AuthClient(), mustChangePassword, onChanged, onLoggedOut }: {
  client?: ChangePasswordClient;
  mustChangePassword: boolean;
  onChanged?: (response: AuthSessionResponse) => void;
  onLoggedOut?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  function clearSecrets() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmation("");
    if (form.current) {
      for (const input of form.current.querySelectorAll<HTMLInputElement>('input[type="password"], input[data-password]')) input.value = "";
    }
  }

  useEffect(() => {
    const inputs = form.current?.querySelectorAll<HTMLInputElement>("input[data-password]");
    return () => inputs?.forEach((input) => { input.value = ""; });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (newPassword !== confirmation) {
      setError("تکرار گذرواژه با گذرواژه جدید یکسان نیست.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await client.changePassword({ currentPassword, newPassword });
      clearSecrets();
      onChanged?.(response);
    } catch (reason) {
      setError(changeError(reason));
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await client.logout();
      clearSecrets();
      onLoggedOut?.();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "خروج ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={form} className="effect-login-form" onSubmit={(event) => void submit(event)} noValidate>
      <div className="effect-login-brand"><span className="effect-brand__mark">E</span><h1>تغییر گذرواژه</h1></div>
      {mustChangePassword ? (
        <div className="effect-credential-notice" role="status">
          <strong>گذرواژه موقت است</strong>
          <span>برای ادامه کار، اکنون یک گذرواژه جدید انتخاب کنید.</span>
        </div>
      ) : <p className="effect-login-copy">گذرواژه فعلی و گذرواژه جدید را وارد کنید.</p>}
      <PasswordField data-password id="current-password" label="گذرواژه فعلی" autoComplete="current-password" dir="ltr" value={currentPassword} disabled={pending} onChange={(event) => { setCurrentPassword(event.target.value); setError(""); }} required />
      <PasswordField data-password id="new-password" label="گذرواژه جدید" autoComplete="new-password" dir="ltr" value={newPassword} disabled={pending} hint="حداقل ۱۵ نویسه و غیرتکراری" onChange={(event) => { setNewPassword(event.target.value); setError(""); }} required />
      <PasswordField data-password id="confirm-password" label="تکرار گذرواژه جدید" autoComplete="new-password" dir="ltr" value={confirmation} disabled={pending} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} required />
      {error ? <p className="effect-form-error" role="alert">{error}</p> : null}
      <Button fullWidth type="submit" disabled={pending}>{pending ? "در حال ذخیره…" : "تغییر گذرواژه"}</Button>
      <Button fullWidth variant="ghost" disabled={pending} onClick={() => void logout()}>خروج</Button>
    </form>
  );
}
